import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProductEvidence, ProductInput } from '@mochi/contracts';
import { SCHEMA_VERSION } from '@mochi/contracts';
import type { IntelligenceMediaInput, IntelligenceProvider, StructuredIntelligenceRequest } from '@mochi/providers';
import { analyzeProductEvidence, ProductEvidenceError } from './index.ts';

const product = (assetCount = 1): ProductInput => ({
  schemaVersion: SCHEMA_VERSION,
  productId: 'product-1',
  name: 'Mochi bottle',
  details: 'User supplied bottle details.',
  category: 'Beauty',
  assets: Array.from({ length: assetCount }, (_, index) => ({
    schemaVersion: SCHEMA_VERSION,
    assetId: `asset-${index + 1}`,
    role: index === 0 ? 'PRODUCT_FRONT' : 'PRODUCT_SIDE',
    source: 'UPLOAD',
    mimeType: 'image/jpeg'
  }))
});

const mediaFor = (input: ProductInput): readonly IntelligenceMediaInput[] => input.assets.map(asset => ({
  assetId: asset.assetId,
  mimeType: 'image/jpeg',
  dataBase64: `bytes-for-${asset.assetId}`
}));

const evidenceFor = (input: ProductInput): ProductEvidence => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  canonicalAssetIds: input.assets.map(asset => asset.assetId),
  identityDescription: 'A bottle matching the user supplied product name.',
  geometryNotes: ['Cylindrical bottle body is visible.'],
  colorNotes: ['Light surface color is visible.'],
  packagingNotes: ['A capped bottle package is visible.'],
  labelNotes: ['A front label is visible but text is not transcribed.'],
  claims: [{
    claimId: 'claim-1',
    text: 'The user supplied product name is Mochi bottle.',
    source: 'USER_INPUT',
    evidenceAssetIds: [],
    allowed: true
  }],
  prohibitedInferences: ['Do not infer efficacy from product appearance.'],
  uncertainties: [],
  contradictions: []
});

function stubProvider(output: unknown, failure = false) {
  const requests: StructuredIntelligenceRequest<unknown>[] = [];
  const provider: IntelligenceProvider = {
    id: 'stub-intelligence',
    async analyzeStructured<T>(request: StructuredIntelligenceRequest<T>) {
      requests.push(request as StructuredIntelligenceRequest<unknown>);
      if (failure) throw new Error('raw provider detail must not escape');
      return { data: request.parse(output) };
    }
  };
  return { provider, requests };
}

async function expectError(promise: Promise<unknown>, code: ProductEvidenceError['code']) {
  await assert.rejects(promise, (error: unknown) => error instanceof ProductEvidenceError
    && error.code === code
    && error.message === `PRODUCT_EVIDENCE_ERROR:${code}`);
}

test('valid product references produce validated evidence in one pass', async () => {
  const input = product(2);
  const { provider, requests } = stubProvider(evidenceFor(input));
  const result = await analyzeProductEvidence({ product: input, media: mediaFor(input), intelligence: provider });

  assert.deepEqual(result, evidenceFor(input));
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0]?.media.map(item => item.assetId), ['asset-1', 'asset-2']);
});

test('creative controls are neither accepted by the engine boundary nor included in the evidence pass', async () => {
  const input = product();
  const { provider, requests } = stubProvider(evidenceFor(input));
  await analyzeProductEvidence({ product: input, media: mediaFor(input), intelligence: provider });

  assert.equal('creativeDirection' in (requests[0] ?? {}), false);
  assert.doesNotMatch(requests[0]?.instruction ?? '', /audience|tone|persona/i);
});

test('missing media fails before provider execution', async () => {
  const input = product();
  const { provider, requests } = stubProvider(evidenceFor(input));
  await expectError(analyzeProductEvidence({ product: input, media: [], intelligence: provider }), 'MISSING_MEDIA');
  assert.equal(requests.length, 0);
});

test('duplicate, unknown, and non-image media fail before provider execution', async () => {
  const input = product();
  for (const invalidMedia of [
    [mediaFor(input)[0]!, mediaFor(input)[0]!],
    [{ assetId: 'unknown', mimeType: 'image/jpeg', dataBase64: 'bytes' }],
    [{ assetId: 'asset-1', mimeType: 'video/mp4', dataBase64: 'bytes' }]
  ] as const) {
    const { provider, requests } = stubProvider(evidenceFor(input));
    await expectError(analyzeProductEvidence({ product: input, media: invalidMedia, intelligence: provider }), 'INVALID_MEDIA');
    assert.equal(requests.length, 0);
  }
});

test('malformed and wrong-product output fail closed', async () => {
  const input = product();
  for (const output of [{}, { ...evidenceFor(input), productId: 'another-product' }]) {
    const { provider } = stubProvider(output);
    await expectError(analyzeProductEvidence({ product: input, media: mediaFor(input), intelligence: provider }), 'INVALID_MODEL_OUTPUT');
  }
});

test('unknown evidence assets and evidence claims without assets fail closed', async () => {
  const input = product();
  const unknownAsset = { ...evidenceFor(input), canonicalAssetIds: ['unknown'] };
  const unsupportedReferenceClaim = {
    ...evidenceFor(input),
    claims: [{ ...evidenceFor(input).claims[0]!, source: 'REFERENCE_EVIDENCE' as const, evidenceAssetIds: [] }]
  };
  for (const output of [unknownAsset, unsupportedReferenceClaim]) {
    const { provider } = stubProvider(output);
    await expectError(analyzeProductEvidence({ product: input, media: mediaFor(input), intelligence: provider }), 'INVALID_MODEL_OUTPUT');
  }
});

test('uncertainty and contradiction are preserved explicitly', async () => {
  const input = product(2);
  const output = evidenceFor(input);
  output.uncertainties = [{ subject: 'Fine label text', assetIds: ['asset-1'], reason: 'Text is not legible.' }];
  output.contradictions = [{
    statements: ['Asset one appears light.', 'Asset two appears darker.'],
    assetIds: ['asset-1', 'asset-2'],
    reason: 'Lighting differs between references.'
  }];
  const { provider } = stubProvider(output);
  const result = await analyzeProductEvidence({ product: input, media: mediaFor(input), intelligence: provider });
  assert.deepEqual(result.uncertainties, output.uncertainties);
  assert.deepEqual(result.contradictions, output.contradictions);
});

test('unsupported claims are preserved rather than promoted', async () => {
  const input = product();
  const output = evidenceFor(input);
  output.claims = [{ ...output.claims[0]!, allowed: false }];
  const { provider } = stubProvider(output);
  const result = await analyzeProductEvidence({ product: input, media: mediaFor(input), intelligence: provider });
  assert.equal(result.claims[0]?.allowed, false);
});

test('provider failures normalize without leaking raw details', async () => {
  const input = product();
  const { provider } = stubProvider(evidenceFor(input), true);
  await expectError(analyzeProductEvidence({ product: input, media: mediaFor(input), intelligence: provider }), 'PROVIDER_FAILURE');
});

test('evidence contains no runtime media bytes or provider details', async () => {
  const input = product();
  const { provider } = stubProvider(evidenceFor(input));
  const result = await analyzeProductEvidence({
    product: input,
    media: [{ assetId: 'asset-1', mimeType: 'image/jpeg', dataBase64: 'private-runtime-bytes' }],
    intelligence: provider
  });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /private-runtime-bytes|dataBase64|credential|providerId/i);
});
