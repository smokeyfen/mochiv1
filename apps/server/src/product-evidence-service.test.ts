import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { SCHEMA_VERSION, type ProductEvidence, type ProductInput } from '@mochi/contracts';
import { ProductEvidenceError } from '@mochi/evidence';
import { IntelligenceProviderError, type IntelligenceProvider, type StructuredIntelligenceRequest } from '@mochi/providers';
import {
  createProductEvidenceService,
  createProductEvidenceServiceFromEnv
} from './product-evidence-service.ts';
import {
  R1B2SmokeError,
  buildSmokeEvidenceRequest,
  loadSmokeManifest,
  runSmokeEvidence
} from './smoke.ts';
import { formatSanitizedEvidenceInspection, safeCategory } from './smoke-diagnostics.ts';

const product = (): ProductInput => ({
  schemaVersion: SCHEMA_VERSION,
  productId: 'server-product',
  name: 'Server bottle',
  details: 'Factual user supplied details.',
  category: 'Beauty',
  assets: [{
    schemaVersion: SCHEMA_VERSION,
    assetId: 'server-asset',
    role: 'PRODUCT_FRONT',
    source: 'UPLOAD',
    mimeType: 'image/jpeg'
  }]
});

const evidenceFor = (input: ProductInput): ProductEvidence => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  canonicalAssetIds: input.assets.map(asset => asset.assetId),
  identityDescription: 'A bottle matching the factual input.',
  geometryNotes: ['A cylindrical bottle is visible.'],
  colorNotes: ['A light color is visible.'],
  packagingNotes: ['A capped package is visible.'],
  labelNotes: ['A front label is visible.'],
  claims: [],
  prohibitedInferences: ['Do not infer efficacy.'],
  uncertainties: [],
  contradictions: []
});

function stubProvider(output: unknown) {
  const requests: StructuredIntelligenceRequest<unknown>[] = [];
  const provider: IntelligenceProvider = {
    id: 'stub-intelligence',
    async analyzeStructured<T>(request: StructuredIntelligenceRequest<T>) {
      requests.push(request as StructuredIntelligenceRequest<unknown>);
      return { data: request.parse(output) };
    }
  };
  return { provider, requests };
}

test('service injects a provider-neutral intelligence implementation and delegates to evidence', async () => {
  const input = product();
  const { provider, requests } = stubProvider(evidenceFor(input));
  const service = createProductEvidenceService({ intelligence: provider });
  const result = await service.analyze({
    product: input,
    media: [{ assetId: 'server-asset', mimeType: 'image/jpeg', dataBase64: 'runtime-bytes' }]
  });

  assert.equal(result.productId, input.productId);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0]?.media.map(item => item.assetId), ['server-asset']);
});

test('missing server key fails closed without exposing the key', () => {
  assert.throws(
    () => createProductEvidenceServiceFromEnv({ GEMINI_API_KEY: '   ' }),
    (error: unknown) => error instanceof IntelligenceProviderError
      && error.code === 'CONFIGURATION'
      && !error.message.includes('GEMINI_API_KEY')
      && !error.message.includes('secret')
  );
});

test('server composition consumes environment only at the concrete provider factory', () => {
  const input = product();
  const { provider } = stubProvider(evidenceFor(input));
  let receivedEnvironment: Readonly<Record<string, string | undefined>> | undefined;
  const service = createProductEvidenceServiceFromEnv(
    { GEMINI_API_KEY: 'server-only-secret' },
    environment => {
      receivedEnvironment = environment;
      return provider;
    }
  );

  assert.equal(receivedEnvironment?.GEMINI_API_KEY, 'server-only-secret');
  assert.equal('generate' in service, false);
  assert.equal('edit' in service, false);
});

test('smoke preparation keeps local paths and bytes outside product evidence input', async () => {
  const unsafeProduct = {
    ...product(),
    localPath: 'C:\\private\\product.jpg',
    assets: [{ ...product().assets[0]!, localPath: 'C:\\private\\product.jpg' }]
  } as unknown as ProductInput;
  const request = await buildSmokeEvidenceRequest({
    product: unsafeProduct,
    images: [{ assetId: 'server-asset', path: 'C:\\runtime\\product.jpg' }]
  }, async path => {
    assert.equal(path, 'C:\\runtime\\product.jpg');
    return new Uint8Array([1, 2, 3]);
  });

  assert.doesNotMatch(JSON.stringify(request.product), /private|runtime|localPath/i);
  assert.doesNotMatch(JSON.stringify(evidenceFor(request.product)), /private|runtime|localPath|dataBase64/i);
  assert.equal(request.media[0]?.dataBase64, 'AQID');
});

test('smoke runner calls the evidence service at most once', async () => {
  const input = product();
  let calls = 0;
  const result = await runSmokeEvidence({
    async analyze(request) {
      calls += 1;
      return evidenceFor(request.product);
    }
  }, {
    product: input,
    media: [{ assetId: 'server-asset', mimeType: 'image/jpeg', dataBase64: 'AQID' }]
  });

  assert.equal(calls, 1);
  assert.equal(result.productId, input.productId);
});

test('missing smoke manifest stops before provider composition', async () => {
  await assert.rejects(
    loadSmokeManifest(undefined),
    (error: unknown) => error instanceof R1B2SmokeError && error.code === 'MISSING_MANIFEST'
  );
});

test('smoke diagnostics retain normalized categories without raw detail', () => {
  for (const code of ['AUTHENTICATION', 'RATE_LIMIT', 'UNAVAILABLE', 'INVALID_RESPONSE'] as const) {
    const error = new IntelligenceProviderError(code, false);
    assert.equal(safeCategory(error), `INTELLIGENCE_${code}`);
    assert.doesNotMatch(safeCategory(error), /raw|secret|request/i);
  }
  assert.equal(safeCategory(new ProductEvidenceError('INVALID_MODEL_OUTPUT')), 'PRODUCT_EVIDENCE_INVALID_MODEL_OUTPUT');
  assert.equal(safeCategory(new R1B2SmokeError('MISSING_MANIFEST')), 'SMOKE_MISSING_MANIFEST');
});

test('sanitized evidence inspection emits only declared evidence fields', () => {
  const input = product();
  const unsafeEvidence = {
    ...evidenceFor(input),
    dataBase64: 'runtime-image-bytes',
    localPath: 'C:\\runtime\\product.jpg',
    apiKey: 'not-for-output',
    transport: { requestId: 'not-for-output' }
  } as unknown as ProductEvidence;
  const output = formatSanitizedEvidenceInspection(unsafeEvidence);

  assert.match(output, /^R1_B2_PRODUCT_EVIDENCE_JSON=/);
  assert.match(output, /"productId":"server-product"/);
  assert.match(output, /"canonicalAssetIds"/);
  assert.doesNotMatch(output, /dataBase64|runtime-image-bytes|localPath|apiKey|not-for-output|transport|requestId/i);
});

test('server package has no web, Flow, or video runtime dependency', async () => {
  const packageText = await readFile(new URL('../package.json', import.meta.url), 'utf8');
  const packageJson = JSON.parse(packageText) as { dependencies?: Record<string, string> };
  assert.equal(packageJson.dependencies?.['@mochi/web'], undefined);
  const prohibitedTerms = ['F' + 'low', 'Video' + 'Provider'];
  assert.doesNotMatch(packageText, new RegExp(prohibitedTerms.join('|')));
});
