/**
 * Provider-neutral boundary for structured multimodal intelligence.  These
 * inputs use logical asset identity and raw caller-supplied media bytes; they
 * deliberately contain no provider upload, file, operation, or session IDs.
 */
export type StructuredOutputSchema = Readonly<Record<string, unknown>>;

export interface IntelligenceMediaInput {
  readonly assetId: string;
  readonly mimeType: string;
  readonly dataBase64: string;
}

export interface StructuredIntelligenceRequest<T> {
  /** Authoritative engine policy, kept separate from caller-supplied data. */
  readonly instruction: string;
  /** Optional untrusted task data, delivered separately from instruction. */
  readonly inputText?: string;
  readonly media: readonly IntelligenceMediaInput[];
  readonly outputSchema: StructuredOutputSchema;
  readonly parse: (value: unknown) => T;
}

export interface StructuredIntelligenceResult<T> {
  readonly data: T;
}

export interface IntelligenceProvider {
  readonly id: string;
  analyzeStructured<T>(request: StructuredIntelligenceRequest<T>): Promise<StructuredIntelligenceResult<T>>;
}

export type IntelligenceProviderErrorCode =
  | 'CONFIGURATION'
  | 'AUTHENTICATION'
  | 'RATE_LIMIT'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

/**
 * Deliberately exposes a stable category only.  Provider response bodies,
 * request identifiers, and configuration values are never surfaced to Core.
 */
export class IntelligenceProviderError extends Error {
  readonly code: IntelligenceProviderErrorCode;
  readonly retryable: boolean;

  constructor(code: IntelligenceProviderErrorCode, retryable: boolean) {
    super(`INTELLIGENCE_PROVIDER_ERROR:${code}`);
    this.name = 'IntelligenceProviderError';
    this.code = code;
    this.retryable = retryable;
  }
}
