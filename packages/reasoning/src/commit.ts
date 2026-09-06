import {
  SCHEMA_VERSION,
  validateProductTruth,
  validateReferenceAssessment,
  type ProductEvidence,
  type ProductInput,
  type ProductTruth,
  type R2CommittedProductContext,
  type ReferenceAssessment
} from '@mochi/contracts';

export type R2CommitErrorCode =
  | 'INVALID_TRUTH'
  | 'INVALID_REFERENCE_ASSESSMENT'
  | 'SOURCE_MISMATCH'
  | 'REFERENCE_BLOCKED';

/** Pure deterministic R2 gate error; it carries no provider/runtime detail. */
export class R2CommitError extends Error {
  readonly code: R2CommitErrorCode;

  constructor(code: R2CommitErrorCode) {
    super(`R2_COMMIT_ERROR:${code}`);
    this.name = 'R2CommitError';
    this.code = code;
  }
}

export interface CommitR2ProductContextRequest {
  readonly product: ProductInput;
  readonly evidence: ProductEvidence;
  readonly sourceEvidenceVersion: string;
  readonly productTruth: ProductTruth;
  readonly referenceAssessment: ReferenceAssessment;
}

/**
 * Atomically commits both validated R2 branches. This function is pure: it
 * has no provider dependency and performs no intelligence or runtime calls.
 */
export function commitR2ProductContext(
  request: CommitR2ProductContextRequest
): R2CommittedProductContext {
  if (validateProductTruth(
    request.productTruth, request.product, request.evidence, request.sourceEvidenceVersion
  ).length > 0) throw new R2CommitError('INVALID_TRUTH');

  if (validateReferenceAssessment(
    request.referenceAssessment, request.product, request.evidence, request.sourceEvidenceVersion
  ).length > 0) throw new R2CommitError('INVALID_REFERENCE_ASSESSMENT');

  if (request.productTruth.productId !== request.referenceAssessment.productId
    || request.productTruth.sourceEvidenceVersion !== request.referenceAssessment.sourceEvidenceVersion
    || !sameStringArray(request.productTruth.canonicalAssetIds, request.referenceAssessment.canonicalAssetIds)) {
    throw new R2CommitError('SOURCE_MISMATCH');
  }
  if (request.referenceAssessment.readiness === 'BLOCKED') throw new R2CommitError('REFERENCE_BLOCKED');

  return {
    schemaVersion: SCHEMA_VERSION,
    productId: request.productTruth.productId,
    sourceEvidenceVersion: request.productTruth.sourceEvidenceVersion,
    canonicalAssetIds: request.productTruth.canonicalAssetIds,
    productTruth: request.productTruth,
    referenceAssessment: request.referenceAssessment
  };
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
