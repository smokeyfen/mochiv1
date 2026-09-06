import type { ProductEvidence, ProductInput } from '@mochi/contracts';
import { analyzeProductEvidence } from '@mochi/evidence';
import {
  createGemini35FlashIntelligenceProviderFromEnv,
  type IntelligenceMediaInput,
  type IntelligenceProvider
} from '@mochi/providers';

export interface ProductEvidenceServiceRequest {
  readonly product: ProductInput;
  readonly media: readonly IntelligenceMediaInput[];
}

export interface ProductEvidenceService {
  analyze(request: ProductEvidenceServiceRequest): Promise<ProductEvidence>;
}

export type ServerEnvironment = Readonly<Record<string, string | undefined>>;
export type IntelligenceProviderFromEnvironment = (environment: ServerEnvironment) => IntelligenceProvider;

/**
 * Provider-neutral application service. It delegates all factual evidence
 * behavior to the existing evidence package.
 */
export function createProductEvidenceService(
  dependencies: { readonly intelligence: IntelligenceProvider }
): ProductEvidenceService {
  return {
    analyze: request => analyzeProductEvidence({
      product: request.product,
      media: request.media,
      intelligence: dependencies.intelligence
    })
  };
}

/**
 * Server-only composition edge. Environment credentials are consumed only by
 * the concrete provider factory and are never returned by this module.
 */
export function createProductEvidenceServiceFromEnv(
  environment: ServerEnvironment = process.env,
  createIntelligence: IntelligenceProviderFromEnvironment = createGemini35FlashIntelligenceProviderFromEnv
): ProductEvidenceService {
  return createProductEvidenceService({ intelligence: createIntelligence(environment) });
}
