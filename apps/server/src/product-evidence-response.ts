import type { ProductEvidence } from '@mochi/contracts';

/** Copies only declared evidence fields for safe diagnostics and HTTP output. */
export function sanitizeProductEvidence(evidence: ProductEvidence): ProductEvidence {
  return {
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
}
