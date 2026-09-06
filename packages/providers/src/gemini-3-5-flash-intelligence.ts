import { GoogleGenAI } from '@google/genai';
import {
  IntelligenceProviderError,
  type IntelligenceMediaInput,
  type IntelligenceProvider,
  type StructuredIntelligenceRequest,
  type StructuredIntelligenceResult,
  type StructuredOutputSchema
} from './intelligence.ts';

/** The only Gemini model accepted by this M2-A intelligence provider. */
export const GEMINI_3_5_FLASH_MODEL = 'gemini-3.5-flash' as const;

export interface GeminiStructuredTransportRequest {
  readonly model: typeof GEMINI_3_5_FLASH_MODEL;
  readonly instruction: string;
  readonly media: readonly IntelligenceMediaInput[];
  readonly outputSchema: StructuredOutputSchema;
}

/**
 * Infrastructure seam for the Gemini SDK.  Tests provide a stub here, while
 * Gemini-specific request details remain confined to this module.
 */
export interface GeminiIntelligenceTransport {
  generateStructured(request: GeminiStructuredTransportRequest): Promise<string>;
}

export type GeminiIntelligenceTransportFactory = (apiKey: string) => GeminiIntelligenceTransport;

class GeminiSdkStructuredTransport implements GeminiIntelligenceTransport {
  readonly #client: GoogleGenAI;

  constructor(apiKey: string) {
    this.#client = new GoogleGenAI({ apiKey });
  }

  async generateStructured(request: GeminiStructuredTransportRequest): Promise<string> {
    const response = await this.#client.models.generateContent({
      model: request.model,
      contents: [{
        role: 'user',
        parts: [
          { text: request.instruction },
          ...request.media.map(media => ({
            inlineData: {
              mimeType: media.mimeType,
              data: media.dataBase64
            }
          }))
        ]
      }],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: request.outputSchema
      }
    });

    return response.text ?? '';
  }
}

const createGeminiSdkTransport: GeminiIntelligenceTransportFactory = apiKey =>
  new GeminiSdkStructuredTransport(apiKey);

export class Gemini35FlashIntelligenceProvider implements IntelligenceProvider {
  readonly id = 'gemini-3-5-flash-intelligence';
  private readonly transport: GeminiIntelligenceTransport;

  constructor(transport: GeminiIntelligenceTransport) {
    this.transport = transport;
  }

  async analyzeStructured<T>(
    request: StructuredIntelligenceRequest<T>
  ): Promise<StructuredIntelligenceResult<T>> {
    validateRequest(request);

    try {
      const text = await this.transport.generateStructured({
        model: GEMINI_3_5_FLASH_MODEL,
        instruction: request.instruction,
        media: request.media,
        outputSchema: request.outputSchema
      });
      if (text.trim().length === 0) {
        throw new IntelligenceProviderError('INVALID_RESPONSE', false);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        throw new IntelligenceProviderError('INVALID_RESPONSE', false);
      }

      try {
        return { data: request.parse(parsed) };
      } catch {
        throw new IntelligenceProviderError('INVALID_RESPONSE', false);
      }
    } catch (error: unknown) {
      if (error instanceof IntelligenceProviderError) {
        throw error;
      }
      throw normalizeGeminiError(error);
    }
  }
}

/**
 * Reads the key at the infrastructure edge only.  The key is never returned,
 * logged, or included in an error message.
 */
export function createGemini35FlashIntelligenceProviderFromEnv(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  transportFactory: GeminiIntelligenceTransportFactory = createGeminiSdkTransport
): Gemini35FlashIntelligenceProvider {
  const apiKey = environment.GEMINI_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) {
    throw new IntelligenceProviderError('CONFIGURATION', false);
  }
  return new Gemini35FlashIntelligenceProvider(transportFactory(apiKey));
}

function validateRequest<T>(request: StructuredIntelligenceRequest<T>): void {
  if (request.instruction.trim().length === 0 || Object.keys(request.outputSchema).length === 0) {
    throw new IntelligenceProviderError('INVALID_REQUEST', false);
  }
  if (request.media.length === 0 || request.media.some(hasInvalidMediaInput)) {
    throw new IntelligenceProviderError('INVALID_REQUEST', false);
  }
}

function hasInvalidMediaInput(media: IntelligenceMediaInput): boolean {
  return media.assetId.trim().length === 0
    || media.dataBase64.trim().length === 0
    || (!media.mimeType.startsWith('image/') && !media.mimeType.startsWith('video/'));
}

function normalizeGeminiError(error: unknown): IntelligenceProviderError {
  const status = readStatus(error);
  if (status === 400) {
    return new IntelligenceProviderError('INVALID_REQUEST', false);
  }
  if (status === 401 || status === 403) {
    return new IntelligenceProviderError('AUTHENTICATION', false);
  }
  if (status === 429) {
    return new IntelligenceProviderError('RATE_LIMIT', true);
  }
  if (status !== undefined && status >= 500) {
    return new IntelligenceProviderError('UNAVAILABLE', true);
  }
  return new IntelligenceProviderError('UNKNOWN', false);
}

function readStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const value = (error as { status?: unknown }).status;
  return typeof value === 'number' ? value : undefined;
}
