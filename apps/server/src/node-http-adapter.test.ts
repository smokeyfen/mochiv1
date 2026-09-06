import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import { createNodeHttpServerAdapter, type WebRequestHandler } from './node-http-adapter.ts';
import { createProductEvidenceHttpHandler } from './product-evidence-http.ts';
import type { ProductEvidenceService } from './product-evidence-service.ts';
import { SCHEMA_VERSION, type ProductEvidence, type ProductInput } from '@mochi/contracts';

async function start(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_UNAVAILABLE');
  return `http://127.0.0.1:${address.port}`;
}

async function stop(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close(error => error === undefined ? resolve() : reject(error)));
}

const product = (): ProductInput => ({
  schemaVersion: SCHEMA_VERSION,
  productId: 'adapter-product',
  name: 'Adapter bottle',
  details: 'Factual details.',
  category: 'Beauty',
  assets: [{
    schemaVersion: SCHEMA_VERSION,
    assetId: 'adapter-asset',
    role: 'PRODUCT_REFERENCE',
    source: 'UPLOAD',
    mimeType: 'image/jpeg'
  }]
});

const evidenceFor = (input: ProductInput): ProductEvidence => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  canonicalAssetIds: input.assets.map(asset => asset.assetId),
  identityDescription: 'A bottle identity.',
  geometryNotes: [], colorNotes: [], packagingNotes: [], labelNotes: [], claims: [],
  prohibitedInferences: [], uncertainties: [], contradictions: []
});

function multipartBody(input = product()): FormData {
  const form = new FormData();
  form.set('product', JSON.stringify(input));
  form.append('asset:adapter-asset', new Blob(['adapter-image-bytes'], { type: 'image/jpeg' }), 'adapter.jpg');
  return form;
}

test('Node adapter preserves multipart method, path, query, headers, and body for a Web handler', async () => {
  let calls = 0;
  const handler: WebRequestHandler = async request => {
    calls += 1;
    assert.equal(request.method, 'POST');
    assert.equal(new URL(request.url).pathname, '/api/product-evidence');
    assert.equal(new URL(request.url).searchParams.get('trace'), 'local');
    assert.equal(request.headers.get('x-test'), 'adapter');
    const form = await request.formData();
    const file = form.get('asset:adapter-asset');
    assert.ok(file instanceof Blob);
    assert.equal(await file.text(), 'adapter-image-bytes');
    return new Response('adapter-ok', { status: 201, headers: { 'x-adapter-response': 'preserved' } });
  };
  const server = createNodeHttpServerAdapter({ handler });
  const origin = await start(server);
  try {
    const response = await fetch(`${origin}/api/product-evidence?trace=local`, {
      method: 'POST', headers: { 'x-test': 'adapter' }, body: multipartBody()
    });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('x-adapter-response'), 'preserved');
    assert.equal(await response.text(), 'adapter-ok');
    assert.equal(calls, 1);
  } finally {
    await stop(server);
  }
});

test('Node adapter retains the locked handler 404 behavior without invoking the service', async () => {
  let serviceCalls = 0;
  const service: ProductEvidenceService = {
    async analyze(request) {
      serviceCalls += 1;
      return evidenceFor(request.product);
    }
  };
  const server = createNodeHttpServerAdapter({ handler: createProductEvidenceHttpHandler({ service }) });
  const origin = await start(server);
  try {
    const response = await fetch(`${origin}/not-found`, { method: 'POST', body: multipartBody() });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { ok: false, error: { code: 'NOT_FOUND' } });
    assert.equal(serviceCalls, 0);
  } finally {
    await stop(server);
  }
});
