import type { ProductEvidence } from '@mochi/contracts';
import { ProductEvidenceError } from '@mochi/evidence';
import { IntelligenceProviderError } from '@mochi/providers';
import { R1B2SmokeError } from './smoke.ts';
import { sanitizeProductEvidence } from './product-evidence-response.ts';

/** Converts known, normalized failures into safe one-line smoke categories. */
export function safeCategory(error: unknown): string {
  if (error instanceof R1B2SmokeError) return `SMOKE_${error.code}`;
  if (error instanceof IntelligenceProviderError) return `INTELLIGENCE_${error.code}`;
  if (error instanceof ProductEvidenceError) return `PRODUCT_EVIDENCE_${error.code}`;
  return 'UNKNOWN';
}

/**
 * Emits the exact validated evidence shape while omitting every undeclared
 * property, including any accidental runtime or transport metadata.
 */
export function formatSanitizedEvidenceInspection(evidence: ProductEvidence): string {
  return `R1_B2_PRODUCT_EVIDENCE_JSON=${JSON.stringify(sanitizeProductEvidence(evidence))}`;
}
