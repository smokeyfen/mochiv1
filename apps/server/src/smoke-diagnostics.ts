import type { ProductEvidence } from '@mochi/contracts';
import { ProductEvidenceError } from '@mochi/evidence';
import { IntelligenceProviderError } from '@mochi/providers';
import { R1B2SmokeError } from './smoke.ts';

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
  const sanitized = {
    schemaVersion: evidence.schemaVersion,
    productId: evidence.productId,
    canonicalAssetIds: [...evidence.canonicalAssetIds],
    identityDescription: evidence.identityDescription,
    geometryNotes: [...evidence.geometryNotes],
    colorNotes: [...evidence.colorNotes],
    packagingNotes: [...evidence.packagingNotes],
    labelNotes: [...evidence.labelNotes],
    claims: evidence.claims.map(claim => ({
      claimId: claim.claimId,
      text: claim.text,
      source: claim.source,
      evidenceAssetIds: [...claim.evidenceAssetIds],
      allowed: claim.allowed
    })),
    prohibitedInferences: [...evidence.prohibitedInferences],
    uncertainties: evidence.uncertainties.map(uncertainty => ({
      subject: uncertainty.subject,
      assetIds: [...uncertainty.assetIds],
      reason: uncertainty.reason
    })),
    contradictions: evidence.contradictions.map(contradiction => ({
      statements: [...contradiction.statements],
      assetIds: [...contradiction.assetIds],
      reason: contradiction.reason
    }))
  };
  return `R1_B2_PRODUCT_EVIDENCE_JSON=${JSON.stringify(sanitized)}`;
}
