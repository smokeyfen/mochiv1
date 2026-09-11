import {
  SCHEMA_VERSION,
  deriveReferenceLimitationCodes,
  deriveReferenceReadiness,
  validateReferenceBindingV1_2,
  type FactualAuthorityReferenceV1_2,
  type GroundedProductTruthAuthorityReferenceV1_2,
  type R2CommittedProductContext,
  type ReferenceAssetAssessment,
  type ReferenceBindingV1_2
} from '@mochi/contracts';

export const PLANNABLE_TRUTH_V1_2 = 'PLANNABLE_TRUTH_V1_2' as const;

export type PlannableTruthReasonCodeV1_2 =
  | 'INVALID_COMMITTED_CONTEXT'
  | 'INVALID_REFERENCE_PURPOSES'
  | 'REFERENCE_IDENTITY_CONFLICT'
  | 'PRODUCT_NAME_UNAVAILABLE'
  | 'NO_PLANNABLE_PRODUCT_TRUTH';

export type PlannableTruthBlockReasonV1_2 =
  | 'UNRESOLVED_CONTRADICTION'
  | 'UNSAFE_UNCERTAINTY'
  | 'PROHIBITED_INFERENCE'
  | 'R2_EXCLUDED';

export interface ReferencePurposesV1_2 {
  readonly referencePurposeVersion: 'REFERENCE_PURPOSES_V1_2';
  readonly productId: string;
  readonly sourceEvidenceVersion: string;
  readonly canonicalAssetIds: readonly string[];
  readonly reviewedVariantId: string;
  readonly references: readonly ReferenceBindingV1_2[];
}

export interface PlannableTruthItemV1_2 {
  readonly itemId: string;
  readonly exactText: string;
  readonly authorityReference: FactualAuthorityReferenceV1_2;
}

export interface BlockedPlannableTruthItemV1_2 {
  readonly sourceId: string;
  readonly exactText?: string;
  readonly authorityReference?: GroundedProductTruthAuthorityReferenceV1_2;
  readonly reasonCodes: readonly PlannableTruthBlockReasonV1_2[];
}

export interface PlannableTruthResultV1_2 {
  readonly plannableTruthVersion: typeof PLANNABLE_TRUTH_V1_2;
  readonly productId: string;
  readonly sourceEvidenceVersion: string;
  readonly status: 'PASS' | 'FAIL';
  readonly reasonCodes: readonly PlannableTruthReasonCodeV1_2[];
  readonly plannableItems: readonly PlannableTruthItemV1_2[];
  readonly blockedItems: readonly BlockedPlannableTruthItemV1_2[];
}

type GroundedSource = {
  readonly id: string;
  readonly text: string;
  readonly evidenceAssetIds: readonly string[];
  readonly authorityReference: GroundedProductTruthAuthorityReferenceV1_2;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every(key => actual.includes(key));
}

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(nonBlank);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function uniqueStrings(value: readonly string[]): boolean {
  return new Set(value).size === value.length;
}

export function isValidCommittedContextV1_2(context: unknown): context is R2CommittedProductContext {
  if (!hasExactKeys(context, ['schemaVersion', 'productId', 'sourceEvidenceVersion', 'canonicalAssetIds', 'productTruth', 'referenceAssessment'])
    || context.schemaVersion !== SCHEMA_VERSION || !nonBlank(context.productId) || !nonBlank(context.sourceEvidenceVersion)
    || !stringArray(context.canonicalAssetIds) || context.canonicalAssetIds.length === 0 || !uniqueStrings(context.canonicalAssetIds)) return false;
  const canonicalAssetIds = context.canonicalAssetIds;
  const truth = context.productTruth;
  const assessment = context.referenceAssessment;
  if (!hasExactKeys(truth, ['schemaVersion', 'productId', 'sourceEvidenceVersion', 'canonicalAssetIds', 'name', 'category', 'identityDescription', 'facts', 'allowedClaims', 'prohibitedInferences', 'unresolvedUncertainties', 'unresolvedContradictions', 'exclusions'])
    || truth.schemaVersion !== SCHEMA_VERSION || truth.productId !== context.productId
    || truth.sourceEvidenceVersion !== context.sourceEvidenceVersion || !stringArray(truth.canonicalAssetIds)
    || !sameStrings(truth.canonicalAssetIds, canonicalAssetIds) || !nonBlank(truth.name)
    || !nonBlank(truth.category) || !nonBlank(truth.identityDescription)
    || !Array.isArray(truth.facts) || !Array.isArray(truth.allowedClaims)
    || !Array.isArray(truth.prohibitedInferences) || !Array.isArray(truth.unresolvedUncertainties)
    || !Array.isArray(truth.unresolvedContradictions) || !Array.isArray(truth.exclusions)) return false;
  if (!hasExactKeys(assessment, ['schemaVersion', 'productId', 'sourceEvidenceVersion', 'canonicalAssetIds', 'assetAssessments', 'readiness', 'limitationCodes'])
    || assessment.schemaVersion !== SCHEMA_VERSION || assessment.productId !== context.productId
    || assessment.sourceEvidenceVersion !== context.sourceEvidenceVersion || !stringArray(assessment.canonicalAssetIds)
    || !sameStrings(assessment.canonicalAssetIds, canonicalAssetIds) || assessment.readiness === 'BLOCKED'
    || !Array.isArray(assessment.assetAssessments) || assessment.assetAssessments.length !== canonicalAssetIds.length
    || !sameStrings(assessment.assetAssessments.map(item => isRecord(item) && nonBlank(item.assetId) ? item.assetId : ''), canonicalAssetIds)) return false;
  const assetAssessments: ReferenceAssetAssessment[] = [];
  for (const item of assessment.assetAssessments) {
    if (!hasExactKeys(item, ['assetId', 'targetVisibility', 'identityConfidence', 'geometryCoverage', 'labelReadability', 'occlusion', 'backgroundInterference', 'multiProductAmbiguity'])
      || !nonBlank(item.assetId)
      || !['CLEAR', 'PARTIAL', 'POOR'].includes(item.targetVisibility as string)
      || !['HIGH', 'MEDIUM', 'LOW'].includes(item.identityConfidence as string)
      || !['STRONG', 'PARTIAL', 'MINIMAL'].includes(item.geometryCoverage as string)
      || !['CLEAR', 'PARTIAL', 'UNREADABLE', 'NOT_VISIBLE'].includes(item.labelReadability as string)
      || !['NONE', 'PARTIAL', 'SEVERE'].includes(item.occlusion as string)
      || !['LOW', 'MEDIUM', 'HIGH'].includes(item.backgroundInterference as string)
      || !['NONE', 'MODERATE', 'HIGH'].includes(item.multiProductAmbiguity as string)) return false;
    assetAssessments.push(item as unknown as ReferenceAssetAssessment);
  }
  if (deriveReferenceReadiness(assetAssessments) !== assessment.readiness
    || !stringArray(assessment.limitationCodes)
    || !sameStrings(deriveReferenceLimitationCodes(assetAssessments), assessment.limitationCodes)) return false;

  const factIds = new Set<string>();
  for (const fact of truth.facts) {
    if (!hasExactKeys(fact, ['factId', 'kind', 'text', 'evidenceAssetIds']) || !nonBlank(fact.factId)
      || !['IDENTITY', 'GEOMETRY', 'COLOR', 'PACKAGING', 'LABEL'].includes(fact.kind as string)
      || factIds.has(fact.factId) || !nonBlank(fact.text) || !stringArray(fact.evidenceAssetIds)
      || fact.evidenceAssetIds.some(id => !canonicalAssetIds.includes(id))) return false;
    factIds.add(fact.factId);
  }
  const claimIds = new Set<string>();
  for (const claim of truth.allowedClaims) {
    if (!hasExactKeys(claim, ['claimId', 'text', 'source', 'evidenceAssetIds']) || !nonBlank(claim.claimId)
      || (claim.source !== 'USER_INPUT' && claim.source !== 'REFERENCE_EVIDENCE')
      || claimIds.has(claim.claimId) || !nonBlank(claim.text) || !stringArray(claim.evidenceAssetIds)
      || claim.evidenceAssetIds.some(id => !canonicalAssetIds.includes(id))) return false;
    claimIds.add(claim.claimId);
  }
  if (!stringArray(truth.prohibitedInferences)) return false;
  for (const uncertainty of truth.unresolvedUncertainties) {
    if (!hasExactKeys(uncertainty, ['subject', 'assetIds', 'reason']) || !nonBlank(uncertainty.subject)
      || !stringArray(uncertainty.assetIds) || uncertainty.assetIds.some(id => !canonicalAssetIds.includes(id))
      || !nonBlank(uncertainty.reason)) return false;
  }
  for (const contradiction of truth.unresolvedContradictions) {
    if (!hasExactKeys(contradiction, ['statements', 'assetIds', 'reason']) || !stringArray(contradiction.statements)
      || contradiction.statements.length < 2 || !stringArray(contradiction.assetIds)
      || contradiction.assetIds.some(id => !canonicalAssetIds.includes(id)) || !nonBlank(contradiction.reason)) return false;
  }
  const exclusionIds = new Set<string>();
  for (const exclusion of truth.exclusions) {
    if (!hasExactKeys(exclusion, ['factId', 'reason']) || !nonBlank(exclusion.factId) || exclusionIds.has(exclusion.factId)
      || factIds.has(exclusion.factId) || !['UNCERTAIN', 'CONTRADICTED', 'INSUFFICIENT_SUPPORT'].includes(exclusion.reason as string)) return false;
    exclusionIds.add(exclusion.factId);
  }
  return true;
}

function authorityIsKnown(context: R2CommittedProductContext, reference: FactualAuthorityReferenceV1_2): boolean {
  if (reference.authority === 'PRODUCT_NAME') return reference.exactProductName === context.productTruth.name;
  if (reference.authority === 'PRODUCT_TRUTH_FACT') return context.productTruth.facts.some(fact => fact.factId === reference.factId);
  return context.productTruth.allowedClaims.some(claim => claim.claimId === reference.claimId);
}

export function validateReferencePurposesForContextV1_2(
  context: R2CommittedProductContext,
  purposes: unknown
): readonly string[] {
  if (!hasExactKeys(purposes, ['referencePurposeVersion', 'productId', 'sourceEvidenceVersion', 'canonicalAssetIds', 'reviewedVariantId', 'references'])) return ['shape'];
  const issues: string[] = [];
  if (purposes.referencePurposeVersion !== 'REFERENCE_PURPOSES_V1_2' || purposes.productId !== context.productId
    || purposes.sourceEvidenceVersion !== context.sourceEvidenceVersion || !stringArray(purposes.canonicalAssetIds)
    || !sameStrings(purposes.canonicalAssetIds, context.canonicalAssetIds) || purposes.reviewedVariantId !== `reviewed:${context.productId}`) issues.push('source');
  if (!Array.isArray(purposes.references) || purposes.references.length !== context.canonicalAssetIds.length) return [...issues, 'references'];
  const ids: string[] = [];
  let canonicalCount = 0;
  for (const candidate of purposes.references) {
    if (validateReferenceBindingV1_2(candidate).length > 0) {
      issues.push('reference_binding');
      continue;
    }
    const reference = candidate as ReferenceBindingV1_2;
    ids.push(reference.assetId);
    if (reference.productVariantId !== purposes.reviewedVariantId) issues.push('reference_identity_conflict');
    if (reference.purpose === 'CANONICAL_REVIEWED_PRODUCT_IDENTITY') {
      canonicalCount += 1;
      if (reference.authorityReferences.length !== 1 || reference.authorityReferences[0]?.authority !== 'PRODUCT_NAME'
        || reference.authorityReferences[0].exactProductName !== context.productTruth.name) issues.push('canonical_authority');
    }
    if (reference.authorityReferences.some(authority => !authorityIsKnown(context, authority))) issues.push('unknown_authority');
  }
  if (!sameStrings(ids, context.canonicalAssetIds) || !uniqueStrings(ids)) issues.push('reference_order');
  if (canonicalCount === 0) issues.push('canonical_required');
  return [...new Set(issues)];
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}

function textMatchesRisk(text: string, riskText: string): boolean {
  const left = normalized(text);
  const right = normalized(riskText);
  return left === right || (right.length >= 12 && (left.includes(right) || right.includes(left)));
}

function intersects(left: readonly string[], right: readonly string[]): boolean {
  return left.some(value => right.includes(value));
}

export function groundedSourcesV1_2(context: R2CommittedProductContext): readonly GroundedSource[] {
  return [
    ...context.productTruth.facts.map(fact => ({
      id: fact.factId,
      text: fact.text,
      evidenceAssetIds: fact.evidenceAssetIds,
      authorityReference: { authority: 'PRODUCT_TRUTH_FACT' as const, factId: fact.factId }
    })),
    ...context.productTruth.allowedClaims.map(claim => ({
      id: claim.claimId,
      text: claim.text,
      evidenceAssetIds: claim.evidenceAssetIds,
      authorityReference: { authority: 'PRODUCT_TRUTH_CLAIM' as const, claimId: claim.claimId }
    }))
  ];
}

export function blockReasonsForGroundedSourceV1_2(
  context: R2CommittedProductContext,
  source: GroundedSource
): readonly Exclude<PlannableTruthBlockReasonV1_2, 'R2_EXCLUDED'>[] {
  const reasons: Exclude<PlannableTruthBlockReasonV1_2, 'R2_EXCLUDED'>[] = [];
  const contradicted = context.productTruth.unresolvedContradictions.some(contradiction =>
    contradiction.statements.some(statement => textMatchesRisk(source.text, statement))
    && (source.evidenceAssetIds.length === 0 || intersects(source.evidenceAssetIds, contradiction.assetIds))
  );
  const uncertain = context.productTruth.unresolvedUncertainties.some(uncertainty =>
    (textMatchesRisk(source.text, uncertainty.subject) || textMatchesRisk(source.text, uncertainty.reason))
    && (source.evidenceAssetIds.length === 0 || intersects(source.evidenceAssetIds, uncertainty.assetIds))
  );
  const prohibited = context.productTruth.prohibitedInferences.some(inference => textMatchesRisk(source.text, inference));
  if (contradicted) reasons.push('UNRESOLVED_CONTRADICTION');
  if (uncertain) reasons.push('UNSAFE_UNCERTAINTY');
  if (prohibited) reasons.push('PROHIBITED_INFERENCE');
  return reasons;
}

function failedResult(context: R2CommittedProductContext, reason: PlannableTruthReasonCodeV1_2): PlannableTruthResultV1_2 {
  return {
    plannableTruthVersion: PLANNABLE_TRUTH_V1_2,
    productId: nonBlank(context?.productId) ? context.productId : '',
    sourceEvidenceVersion: nonBlank(context?.sourceEvidenceVersion) ? context.sourceEvidenceVersion : '',
    status: 'FAIL',
    reasonCodes: [reason],
    plannableItems: [],
    blockedItems: []
  };
}

export function evaluatePlannableTruthV1_2(
  context: R2CommittedProductContext,
  purposes: ReferencePurposesV1_2
): PlannableTruthResultV1_2 {
  if (!isValidCommittedContextV1_2(context)) return failedResult(context, 'INVALID_COMMITTED_CONTEXT');
  const purposeIssues = validateReferencePurposesForContextV1_2(context, purposes);
  if (purposeIssues.includes('reference_identity_conflict')) return failedResult(context, 'REFERENCE_IDENTITY_CONFLICT');
  if (purposeIssues.length > 0) return failedResult(context, 'INVALID_REFERENCE_PURPOSES');
  if (!nonBlank(context.productTruth.name)) return failedResult(context, 'PRODUCT_NAME_UNAVAILABLE');

  const plannableItems: PlannableTruthItemV1_2[] = [{
    itemId: 'product-name',
    exactText: context.productTruth.name,
    authorityReference: { authority: 'PRODUCT_NAME', exactProductName: context.productTruth.name }
  }];
  const blockedItems: BlockedPlannableTruthItemV1_2[] = [];
  for (const source of groundedSourcesV1_2(context)) {
    const reasonCodes = blockReasonsForGroundedSourceV1_2(context, source);
    if (reasonCodes.length > 0) blockedItems.push({
      sourceId: source.id,
      exactText: source.text,
      authorityReference: source.authorityReference,
      reasonCodes
    });
    else plannableItems.push({ itemId: source.authorityReference.authority === 'PRODUCT_TRUTH_FACT' ? `fact:${source.id}` : `claim:${source.id}`, exactText: source.text, authorityReference: source.authorityReference });
  }
  for (const exclusion of context.productTruth.exclusions) blockedItems.push({
    sourceId: exclusion.factId,
    reasonCodes: ['R2_EXCLUDED']
  });
  const hasGroundedTruth = plannableItems.some(item => item.authorityReference.authority !== 'PRODUCT_NAME');
  return {
    plannableTruthVersion: PLANNABLE_TRUTH_V1_2,
    productId: context.productId,
    sourceEvidenceVersion: context.sourceEvidenceVersion,
    status: hasGroundedTruth ? 'PASS' : 'FAIL',
    reasonCodes: hasGroundedTruth ? [] : ['NO_PLANNABLE_PRODUCT_TRUTH'],
    plannableItems,
    blockedItems
  };
}
