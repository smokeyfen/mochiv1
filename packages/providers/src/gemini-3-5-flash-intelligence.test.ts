import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEMINI_3_5_FLASH_MODEL,
  Gemini35FlashIntelligenceProvider,
  createGemini35FlashIntelligenceProviderFromEnv,
  type GeminiIntelligenceTransport,
  type GeminiStructuredTransportRequest
} from './gemini-3-5-flash-intelligence.ts';
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
    () => createGemini35FlashIntelligenceProviderFromEnv({}, () => {
      factoryCalled = true;
      throw new Error('must not be called');
    }),
    (error: unknown) => error instanceof IntelligenceProviderError
      && error.code === 'CONFIGURATION'
      && error.message === 'INTELLIGENCE_PROVIDER_ERROR:CONFIGURATION'
  );
  assert.equal(factoryCalled, false);
});

test('Gemini intelligence requests use the fixed free-tier model and return typed data', async () => {
  let captured: GeminiStructuredTransportRequest | undefined;
  const transport: GeminiIntelligenceTransport = {
    async generateStructured(nextRequest) {
      captured = nextRequest;
      return JSON.stringify({ label: 'bottle' });
    }
  };
  const provider = new Gemini35FlashIntelligenceProvider(transport);

  const result = await provider.analyzeStructured(request);

  assert.deepEqual(result, { data: { label: 'bottle' } });
  assert.equal(captured?.model, GEMINI_3_5_FLASH_MODEL);
  assert.equal(captured?.media[0]?.assetId, 'logical-product-image');
  assert.equal(captured?.outputSchema, request.outputSchema);
});

test('provider remains an intelligence boundary rather than a VideoProvider', () => {
  const provider = new Gemini35FlashIntelligenceProvider({
    async generateStructured() {
      return '{}';
    }
  });

  assert.equal(typeof provider.analyzeStructured, 'function');
  assert.equal('generate' in provider, false);
  assert.equal('edit' in provider, false);
});

test('Gemini transport errors normalize without exposing provider details', async () => {
  const provider = new Gemini35FlashIntelligenceProvider({
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
  const provider = new Gemini35FlashIntelligenceProvider({
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
