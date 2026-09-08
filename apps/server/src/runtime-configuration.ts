import {
  createGemini35FlashIntelligenceProviderFromEnv,
  type IntelligenceProvider
} from '@mochi/providers';

export type RuntimeStatus = 'GEMINI_READY' | 'GEMINI_NOT_CONFIGURED';

/**
 * The sole owner of the browser-session credential. It deliberately keeps the
 * secret only inside this Node process and exposes status, never configuration.
 */
export class RuntimeConfiguration {
  #provider: IntelligenceProvider | undefined;

  status(): RuntimeStatus { return this.#provider === undefined ? 'GEMINI_NOT_CONFIGURED' : 'GEMINI_READY'; }
  provider(): IntelligenceProvider | undefined { return this.#provider; }
  connect(apiKey: unknown): RuntimeStatus {
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) throw new Error('INVALID_CONFIGURATION');
    // The provider factory is reused with a one-off object; process.env is never changed.
    this.#provider = createGemini35FlashIntelligenceProviderFromEnv({ GEMINI_API_KEY: apiKey });
    return this.status();
  }
  disconnect(): RuntimeStatus { this.#provider = undefined; return this.status(); }
}
