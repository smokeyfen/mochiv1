import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEMINI_3_5_FLASH_LITE_MODEL,
  Gemini35FlashLiteIntelligenceProvider,
  createGeminiGenerateContentRequest,
  createGemini35FlashLiteIntelligenceProviderFromEnv,
  type GeminiIntelligenceTransport,
  type GeminiStructuredTransportRequest
} from './gemini-3-5-flash-lite-intelligence.ts';
import { IntelligenceProviderError } from './intelligence.ts';

const request = {
  instruction: 'Describe the supplied image as JSON.',
  media: [{ assetId: 'logical-product-image', mimeType: 'image/png', dataBase64: 'aGVsbG8=' }],
  outputSchema: { type: 'object', properties: { label: { type: 'string' } }, required: ['label'] },
  parse(value: unknown): { label: string } {
    const label = (value as { label?: unknown }).label;
    if (typeof label !== 'string') {
      throw new Error('label is required');
    }
    return { label };
  }
};

test('missing GEMINI_API_KEY fails before a transport is created', () => {
  let factoryCalled = false;

  assert.throws(
    () => createGemini35FlashLiteIntelligenceProviderFromEnv({}, () => {
      factoryCalled = true;
      throw new Error('must not be called');
    }),
    (error: unknown) => error instanceof IntelligenceProviderError
      && error.code === 'CONFIGURATION'
      && error.message === 'INTELLIGENCE_PROVIDER_ERROR:CONFIGURATION'
  );
  assert.equal(factoryCalled, false);
});

test('Gemini intelligence requests use the fixed Flash-Lite model and return typed data', async () => {
  let captured: GeminiStructuredTransportRequest | undefined;
  const transport: GeminiIntelligenceTransport = {
    async generateStructured(nextRequest) {
      captured = nextRequest;
      return JSON.stringify({ label: 'bottle' });
    }
  };
  const provider = new Gemini35FlashLiteIntelligenceProvider(transport);

  const result = await provider.analyzeStructured(request);

  assert.deepEqual(result, { data: { label: 'bottle' } });
  assert.equal(GEMINI_3_5_FLASH_LITE_MODEL, 'gemini-3.5-flash-lite');
  assert.equal(captured?.model, 'gemini-3.5-flash-lite');
  assert.equal(captured?.inputText, undefined);
  assert.equal(captured?.media[0]?.assetId, 'logical-product-image');
  assert.equal(captured?.outputSchema, request.outputSchema);
});

test('Gemini transport maps authoritative instruction and untrusted input to separate SDK fields', () => {
  const mapped = createGeminiGenerateContentRequest({
    model: GEMINI_3_5_FLASH_LITE_MODEL,
    instruction: 'Authoritative policy',
    inputText: 'Untrusted task data',
    media: [{ assetId: 'logical-image', mimeType: 'image/png', dataBase64: 'aGVsbG8=' }],
    outputSchema: { type: 'object' }
  });

  assert.equal(mapped.config.systemInstruction, 'Authoritative policy');
  assert.equal(mapped.config.temperature, 0);
  assert.deepEqual(mapped.contents[0]?.parts[0], { text: 'Untrusted task data' });
  assert.deepEqual(mapped.contents[0]?.parts[1], { inlineData: { mimeType: 'image/png', data: 'aGVsbG8=' } });
  assert.doesNotMatch(JSON.stringify(mapped.contents), /Authoritative policy/);
  assert.doesNotMatch(JSON.stringify(mapped.config.systemInstruction), /Untrusted task data/);
});

test('blank optional input text fails before the transport is called', async () => {
  let called = false;
  const provider = new Gemini35FlashLiteIntelligenceProvider({
    async generateStructured() {
      called = true;
      return '{}';
    }
  });
  await assert.rejects(
    provider.analyzeStructured({ ...request, inputText: ' ' }),
    (error: unknown) => error instanceof IntelligenceProviderError && error.code === 'INVALID_REQUEST'
  );
  assert.equal(called, false);
});

test('text-only structured reasoning is accepted while no-input and invalid media requests fail closed', async () => {
  let calls = 0;
  const provider = new Gemini35FlashLiteIntelligenceProvider({
    async generateStructured() { calls += 1; return JSON.stringify({ label: 'text-only' }); }
  });
  assert.deepEqual(await provider.analyzeStructured({ ...request, inputText: 'pure text reasoning', media: [] }), { data: { label: 'text-only' } });
  assert.equal(calls, 1);
  await assert.rejects(provider.analyzeStructured({ ...request, media: [] }), (error: unknown) => error instanceof IntelligenceProviderError && error.code === 'INVALID_REQUEST');
  await assert.rejects(provider.analyzeStructured({ ...request, media: [{ assetId: '', mimeType: 'image/png', dataBase64: 'aGVsbG8=' }] }), (error: unknown) => error instanceof IntelligenceProviderError && error.code === 'INVALID_REQUEST');
  assert.equal(calls, 1);
});

test('video structured reasoning remains valid with the fixed Flash-Lite model', async () => {
  let captured: GeminiStructuredTransportRequest | undefined;
  const provider = new Gemini35FlashLiteIntelligenceProvider({
    async generateStructured(nextRequest) {
      captured = nextRequest;
      return JSON.stringify({ label: 'video' });
    }
  });

  assert.deepEqual(await provider.analyzeStructured({
    ...request,
    media: [{ assetId: 'logical-scene-video', mimeType: 'video/mp4', dataBase64: 'dmlkZW8=' }]
  }), { data: { label: 'video' } });
  assert.equal(captured?.model, 'gemini-3.5-flash-lite');
  assert.equal(captured?.media[0]?.mimeType, 'video/mp4');
});

test('provider remains an intelligence boundary rather than a VideoProvider', () => {
  const provider = new Gemini35FlashLiteIntelligenceProvider({
    async generateStructured() {
      return '{}';
    }
  });

  assert.equal(provider.id, 'gemini-3-5-flash-lite-intelligence');
  assert.equal(typeof provider.analyzeStructured, 'function');
  assert.equal('generate' in provider, false);
  assert.equal('edit' in provider, false);
});

test('Gemini transport errors normalize without exposing provider details', async () => {
  const provider = new Gemini35FlashLiteIntelligenceProvider({
    async generateStructured() {
      throw { status: 429, message: 'request-123 and an internal provider response' };
    }
  });

  await assert.rejects(
    provider.analyzeStructured(request),
    (error: unknown) => error instanceof IntelligenceProviderError
      && error.code === 'RATE_LIMIT'
      && error.retryable
      && error.message === 'INTELLIGENCE_PROVIDER_ERROR:RATE_LIMIT'
  );
});

test('invalid structured responses fail closed', async () => {
  const provider = new Gemini35FlashLiteIntelligenceProvider({
    async generateStructured() {
      return 'not-json';
    }
  });

  await assert.rejects(
    provider.analyzeStructured(request),
    (error: unknown) => error instanceof IntelligenceProviderError
      && error.code === 'INVALID_RESPONSE'
  );
});
