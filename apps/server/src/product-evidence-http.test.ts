import assert from 'node:assert/strict';
import test from 'node:test';
import { SCHEMA_VERSION, type ProductEvidence, type ProductInput } from '@mochi/contracts';
import { ProductEvidenceError } from '@mochi/evidence';
import { IntelligenceProviderError, type IntelligenceMediaInput } from '@mochi/providers';
import type { ProductEvidenceService } from './product-evidence-service.ts';
import { createProductEvidenceHttpHandler } from './product-evidence-http.ts';

const product = (assetCount = 1): ProductInput => ({
  schemaVersion: SCHEMA_VERSION,
  productId: 'http-product',
  name: 'HTTP bottle',
  details: 'Factual product details.',
  category: 'Beauty',
  assets: Array.from({ length: assetCount }, (_, index) => ({
    schemaVersion: SCHEMA_VERSION,
    assetId: `asset-${index + 1}`,
    role: 'PRODUCT_REFERENCE' as const,
    source: 'UPLOAD' as const,
    mimeType: 'image/jpeg'
  }))
});

const evidenceFor = (input: ProductInput): ProductEvidence => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  canonicalAssetIds: input.assets.map(asset => asset.assetId),
  identityDescription: 'A factual bottle identity.',
  geometryNotes: ['A cylindrical body is visible.'],
  colorNotes: ['A light color is visible.'],
  packagingNotes: ['A capped package is visible.'],
  labelNotes: ['A front label is visible.'],
  claims: [],
  prohibitedInferences: ['Do not infer efficacy.'],
  uncertainties: [],
  contradictions: []
});

function createStubService(
  behavior: (request: { readonly product: ProductInput; readonly media: readonly IntelligenceMediaInput[] }) => Promise<ProductEvidence>
) {
  const calls: { readonly product: ProductInput; readonly media: readonly IntelligenceMediaInput[] }[] = [];
  const service: ProductEvidenceService = {
    async analyze(request) {
      calls.push(request);
      return behavior(request);
    }
  };
  return { service, calls };
}

function validForm(input = product(), options: { readonly fileType?: string; readonly bytes?: string } = {}): FormData {
  const form = new FormData();
  form.set('product', JSON.stringify(input));
  for (const asset of input.assets) {
    form.append(
      `asset:${asset.assetId}`,
      new Blob([options.bytes ?? 'image-bytes'], { type: options.fileType ?? asset.mimeType }),
      `${asset.assetId}.jpg`
    );
  }
  return form;
}

function requestFor(form: FormData, method = 'POST', path = '/api/product-evidence'): Request {
  return method === 'GET'
    ? new Request(`http://server.test${path}`, { method })
    : new Request(`http://server.test${path}`, { method, body: form });
}

async function responseBody(response: Response) {
  return await response.json() as { ok: boolean; error?: { code: string; issueCodes?: readonly string[] }; evidence?: ProductEvidence; analysisReceiptId?:string; receiptVersion?:string };
}

test('valid multipart ProductInput maps one generic reference to one service call', async () => {
  const input = product();
  const { service, calls } = createStubService(async request => evidenceFor(request.product));
  const handler = createProductEvidenceHttpHandler({ service });
  const response = await handler(requestFor(validForm(input)));
  const body = await responseBody(response);

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.evidence?.productId, input.productId);
  assert.match(body.analysisReceiptId ?? '',/^par_[A-Za-z0-9_-]{40,}$/);
  assert.equal(body.receiptVersion,'PRODUCT_ANALYSIS_RECEIPT_V1');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.media.map(item => item.assetId), ['asset-1']);
  assert.equal(calls[0]?.media[0]?.mimeType, 'image/jpeg');
  assert.ok((calls[0]?.media[0]?.dataBase64.length ?? 0) > 0);
});

test('multiple arbitrary PRODUCT_REFERENCE images map deterministically in one call', async () => {
  const input = product(2);
  const { service, calls } = createStubService(async request => evidenceFor(request.product));
  const response = await createProductEvidenceHttpHandler({ service })(requestFor(validForm(input)));

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.media.map(item => item.assetId), ['asset-1', 'asset-2']);
});

test('malformed product input and untrusted field injection fail before the service', async () => {
  const input = product();
  const cases: readonly ((form: FormData) => void)[] = [
    form => form.set('product', '{bad json'),
    form => form.delete('product'),
    form => form.set('product', JSON.stringify({ ...input, creativeDirection: { audience: 'injected' } })),
    form => form.set('product', JSON.stringify({ ...input, localPath: 'C:\\private\\item.jpg' })),
    form => form.set('product', JSON.stringify({ ...input, assets: [{ ...input.assets[0], role: 'INVALID_ROLE' }] })),
    form => form.set('product', JSON.stringify({ ...input, assets: [{ ...input.assets[0], source: 'INVALID_SOURCE' }] })),
    form => form.set('product', JSON.stringify({ ...input, assets: [{}] }))
  ];
  for (const mutate of cases) {
    const { service, calls } = createStubService(async request => evidenceFor(request.product));
    const form = validForm(input);
    mutate(form);
    const response = await createProductEvidenceHttpHandler({ service })(requestFor(form));
    const body = await responseBody(response);
    assert.equal(response.status, 400);
    assert.equal(body.error?.code, 'INVALID_PRODUCT_INPUT');
    assert.equal(calls.length, 0);
  }
});

test('multipart media integrity fails closed before the service', async () => {
  const input = product();
  const cases: readonly { readonly expected: string; readonly mutate: (form: FormData) => void }[] = [
    { expected: 'MISSING_MEDIA', mutate: form => form.delete('asset:asset-1') },
    { expected: 'INVALID_MEDIA', mutate: form => form.append('asset:asset-1', new Blob(['two'], { type: 'image/jpeg' }), 'two.jpg') },
    { expected: 'INVALID_MEDIA', mutate: form => form.append('asset:unknown', new Blob(['unknown'], { type: 'image/jpeg' }), 'unknown.jpg') },
    { expected: 'INVALID_MEDIA', mutate: form => { form.delete('asset:asset-1'); form.append('asset:asset-1', new Blob(['image'], { type: 'text/plain' }), 'text.txt'); } },
    { expected: 'INVALID_MEDIA', mutate: form => { form.delete('asset:asset-1'); form.append('asset:asset-1', new Blob([], { type: 'image/jpeg' }), 'empty.jpg'); } },
    { expected: 'INVALID_MEDIA', mutate: form => { form.delete('asset:asset-1'); form.append('asset:asset-1', new Blob(['image'], { type: 'image/png' }), 'mismatch.png'); } }
  ];
  for (const { expected, mutate } of cases) {
    const { service, calls } = createStubService(async request => evidenceFor(request.product));
    const form = validForm(input);
    mutate(form);
    const response = await createProductEvidenceHttpHandler({ service })(requestFor(form));
    const body = await responseBody(response);
    assert.equal(response.status, 400);
    assert.equal(body.error?.code, expected);
    assert.equal(calls.length, 0);
  }
});

test('method, route, and multipart content type are enforced', async () => {
  const { service } = createStubService(async request => evidenceFor(request.product));
  const handler = createProductEvidenceHttpHandler({ service });
  const getResponse = await handler(requestFor(validForm(), 'GET'));
  const wrongContentType = await handler(new Request('http://server.test/api/product-evidence', { method: 'POST', body: '{}' }));
  const missingRoute = await handler(requestFor(validForm(), 'POST', '/other'));

  assert.equal(getResponse.status, 405);
  assert.equal((await responseBody(getResponse)).error?.code, 'METHOD_NOT_ALLOWED');
  assert.equal(wrongContentType.status, 415);
  assert.equal((await responseBody(wrongContentType)).error?.code, 'UNSUPPORTED_MEDIA_TYPE');
  assert.equal(missingRoute.status, 404);
});

test('normalized service errors receive stable safe HTTP mappings', async () => {
  const input = product();
  const cases: readonly { readonly error: Error; readonly status: number; readonly code: string }[] = [
    { error: new IntelligenceProviderError('RATE_LIMIT', true), status: 429, code: 'ANALYSIS_RATE_LIMITED' },
    { error: new IntelligenceProviderError('UNAVAILABLE', true), status: 503, code: 'ANALYSIS_UNAVAILABLE' },
    { error: new IntelligenceProviderError('AUTHENTICATION', false), status: 503, code: 'ANALYSIS_AUTHENTICATION' },
    { error: new IntelligenceProviderError('CONFIGURATION', false), status: 503, code: 'ANALYSIS_CONFIGURATION' },
    { error: new IntelligenceProviderError('INVALID_RESPONSE', false), status: 502, code: 'PROVIDER_INVALID_RESPONSE' },
    { error: new ProductEvidenceError('PROVIDER_FAILURE'), status: 502, code: 'ANALYSIS_PROVIDER_FAILURE' }
  ];
  for (const expected of cases) {
    const { service } = createStubService(async () => { throw expected.error; });
    const response = await createProductEvidenceHttpHandler({ service })(requestFor(validForm(input)));
    const body = await responseBody(response);
    assert.equal(response.status, expected.status);
    assert.equal(body.error?.code, expected.code);
  }
});

test('Product Evidence model validation and provider invalid responses remain distinct and data-free', async () => {
  const input = product();
  const invalidEvidence = new ProductEvidenceError('INVALID_MODEL_OUTPUT', ['unknown_canonical_asset:asset-private-7b4b3d']);
  const invalidResponse = new IntelligenceProviderError('INVALID_RESPONSE', false);
  for (const [error, expected] of [[invalidEvidence, { code: 'PRODUCT_EVIDENCE_INVALID_MODEL_OUTPUT', issueCodes: ['unknown_canonical_asset'] }], [invalidResponse, { code: 'PROVIDER_INVALID_RESPONSE' }]] as const) {
    const { service } = createStubService(async () => { throw error; });
    const response = await createProductEvidenceHttpHandler({ service })(requestFor(validForm(input)));
    const body = await responseBody(response);
    assert.equal(response.status, 502);
    assert.deepEqual(body.error, expected);
    assert.doesNotMatch(JSON.stringify(body), /private|7b4b3d|asset-/);
  }
});

test('HTTP response omits runtime, credential, path, and transport details', async () => {
  const input = product();
  const unsafeEvidence = {
    ...evidenceFor(input),
    dataBase64: 'image-bytes-must-not-return',
    localPath: 'C:\\private\\item.jpg',
    geminiApiKey: 'must-not-return',
    requestId: 'must-not-return',
    flowMediaId: 'must-not-return'
  } as unknown as ProductEvidence;
  const { service } = createStubService(async () => unsafeEvidence);
  const response = await createProductEvidenceHttpHandler({ service })(requestFor(validForm(input)));
  const text = await response.text();

  assert.equal(response.status, 200);
  assert.doesNotMatch(text, /dataBase64|image-bytes-must-not-return|localPath|geminiApiKey|requestId|flowMediaId|C:\\private/i);
  assert.match(text, /"ok":true/);
  assert.match(text, /"evidence"/);
});
