export const SCHEMA_VERSION = '1.0.0' as const;
export type SchemaVersion = typeof SCHEMA_VERSION;

export type AssetRole =
  | 'PRODUCT_REFERENCE' | 'PRODUCT_FRONT' | 'PRODUCT_SIDE' | 'PRODUCT_BACK' | 'PRODUCT_IN_HAND'
  | 'HAND_REFERENCE' | 'ENVIRONMENT_REFERENCE' | 'FIRST_FRAME' | 'LAST_FRAME';

export interface AssetRef {
  schemaVersion: SchemaVersion;
  assetId: string;
  role: AssetRole;
  source: 'UPLOAD' | 'GENERATED' | 'DERIVED';
  mimeType: string;
  sha256?: string;
  viewAngle?: string;
  qualityScore?: number;
}

export interface ProductInput {
  schemaVersion: SchemaVersion;
  productId: string;
  name: string;
  details: string;
  category: string;
  assets: readonly AssetRef[];
}

export type VoiceGender = 'MALE' | 'FEMALE';
export type VoiceRegion = 'SOUTH' | 'NORTH';

/**
 * User-controlled creative intent. This is deliberately separate from
 * ProductInput so creative choices cannot be mistaken for product truth.
 */
export interface CreativeDirectionInput {
  audience: string;
  shootingContext: string;
  reviewerPersona: string;
  tone: string;
  voiceStyle: string;
  voiceGender: VoiceGender;
  voiceRegion: VoiceRegion;
}

/**
 * Canonical provider-neutral boundary for a MochiV1 project. Assets remain
 * logical references; uploads, runtime identifiers, model settings, and file data
 * belong outside this contract.
 */
export interface MochiProjectInput {
  schemaVersion: SchemaVersion;
  projectId: string;
  product: ProductInput;
  creativeDirection: CreativeDirectionInput;
}

export interface ProductClaim {
  claimId: string;
  text: string;
  source: 'USER_INPUT' | 'REFERENCE_EVIDENCE';
  evidenceAssetIds: readonly string[];
  allowed: boolean;
}

export interface ProductEvidenceUncertainty {
  subject: string;
  assetIds: readonly string[];
  reason: string;
}

export interface ProductEvidenceContradiction {
  statements: readonly string[];
  assetIds: readonly string[];
  reason: string;
}

export interface ProductEvidence {
  schemaVersion: SchemaVersion;
  productId: string;
  canonicalAssetIds: readonly string[];
  identityDescription: string;
  geometryNotes: readonly string[];
  colorNotes: readonly string[];
  packagingNotes: readonly string[];
  labelNotes: readonly string[];
  claims: readonly ProductClaim[];
  prohibitedInferences: readonly string[];
  uncertainties: readonly ProductEvidenceUncertainty[];
  contradictions: readonly ProductEvidenceContradiction[];
}

/** A factual, provider-neutral truth record compiled only from ProductEvidence. */
export type ProductTruthFactKind = 'IDENTITY' | 'GEOMETRY' | 'COLOR' | 'PACKAGING' | 'LABEL';

export interface ProductTruthFact {
  factId: string;
  kind: ProductTruthFactKind;
  text: string;
  evidenceAssetIds: readonly string[];
}

export interface ProductTruthClaim {
  claimId: string;
  text: string;
  source: ProductClaim['source'];
  evidenceAssetIds: readonly string[];
}

export type ProductTruthExclusionReason = 'UNCERTAIN' | 'CONTRADICTED' | 'INSUFFICIENT_SUPPORT';

export interface ProductTruthExclusion {
  factId: string;
  reason: ProductTruthExclusionReason;
}

/**
 * The immutable factual input for later production reasoning. Creative
 * controls, media bytes, and provider state deliberately do not belong here.
 */
export interface ProductTruth {
  schemaVersion: SchemaVersion;
  productId: string;
  sourceEvidenceVersion: string;
  canonicalAssetIds: readonly string[];
  name: string;
  category: string;
  identityDescription: string;
  facts: readonly ProductTruthFact[];
  allowedClaims: readonly ProductTruthClaim[];
  prohibitedInferences: readonly string[];
  unresolvedUncertainties: readonly ProductEvidenceUncertainty[];
  unresolvedContradictions: readonly ProductEvidenceContradiction[];
  exclusions: readonly ProductTruthExclusion[];
}

export type ReferenceTargetVisibility = 'CLEAR' | 'PARTIAL' | 'POOR';
export type ReferenceIdentityConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type ReferenceGeometryCoverage = 'STRONG' | 'PARTIAL' | 'MINIMAL';
export type ReferenceLabelReadability = 'CLEAR' | 'PARTIAL' | 'UNREADABLE' | 'NOT_VISIBLE';
export type ReferenceOcclusion = 'NONE' | 'PARTIAL' | 'SEVERE';
export type ReferenceBackgroundInterference = 'LOW' | 'MEDIUM' | 'HIGH';
export type ReferenceMultiProductAmbiguity = 'NONE' | 'MODERATE' | 'HIGH';

/** Enum-only assessment of a single logical canonical reference asset. */
export interface ReferenceAssetAssessment {
  assetId: string;
  targetVisibility: ReferenceTargetVisibility;
  identityConfidence: ReferenceIdentityConfidence;
  geometryCoverage: ReferenceGeometryCoverage;
  labelReadability: ReferenceLabelReadability;
  occlusion: ReferenceOcclusion;
  backgroundInterference: ReferenceBackgroundInterference;
  multiProductAmbiguity: ReferenceMultiProductAmbiguity;
}

export type ReferenceReadiness = 'READY' | 'LIMITED' | 'BLOCKED';
export type ReferenceLimitationCode =
  | 'TARGET_VISIBILITY_POOR'
  | 'IDENTITY_CONFIDENCE_LOW'
  | 'GEOMETRY_COVERAGE_PARTIAL'
  | 'GEOMETRY_COVERAGE_MINIMAL'
  | 'LABEL_READABILITY_PARTIAL'
  | 'LABEL_READABILITY_UNREADABLE'
  | 'LABEL_NOT_VISIBLE'
  | 'OCCLUSION_PARTIAL'
  | 'OCCLUSION_SEVERE'
  | 'BACKGROUND_INTERFERENCE_MEDIUM'
  | 'BACKGROUND_INTERFERENCE_HIGH'
  | 'MULTI_PRODUCT_AMBIGUITY_MODERATE'
  | 'MULTI_PRODUCT_AMBIGUITY_HIGH';

/**
 * A provider-neutral, enum-only assessment of the same canonical evidence
 * source used by ProductTruth. Readiness and limitations are deterministic.
 */
export interface ReferenceAssessment {
  schemaVersion: SchemaVersion;
  productId: string;
  sourceEvidenceVersion: string;
  canonicalAssetIds: readonly string[];
  assetAssessments: readonly ReferenceAssetAssessment[];
  readiness: ReferenceReadiness;
  limitationCodes: readonly ReferenceLimitationCode[];
}

/**
 * Atomic provider-neutral context committed only after ProductTruth and
 * ReferenceAssessment independently validate against the same evidence source.
 */
export interface R2CommittedProductContext {
  schemaVersion: SchemaVersion;
  productId: string;
  sourceEvidenceVersion: string;
  canonicalAssetIds: readonly string[];
  productTruth: ProductTruth;
  referenceAssessment: ReferenceAssessment;
}

export type TransitionType = 'CONTINUOUS' | 'MATCH_CUT' | 'JUMP_CUT';
export type HeldBy = 'NONE' | 'LEFT_HAND' | 'RIGHT_HAND' | 'BOTH_HANDS';

export interface PhysicalState {
  productState: Readonly<Record<string, string>>;
  propState: Readonly<Record<string, string>>;
  heldBy: HeldBy;
  productOrientation: string;
  productPosition: string;
}

export interface GlobalContinuityState {
  schemaVersion: SchemaVersion;
  productId: string;
  sourceEvidenceVersion: string;
  canonicalAssetIds: readonly string[];
  immutable: {
    handIdentity: {
      skinTone: string;
      nailStyle: string;
      jewelry: string;
      dominantHand: 'LEFT' | 'RIGHT';
    };
    environment: {
      location: string;
      surface: string;
      background: string;
      lighting: string;
    };
    cameraFamily: 'SMARTPHONE_POV';
    voiceIdentity: {
      voiceGender: VoiceGender;
      voiceRegion: VoiceRegion;
      voiceStyle: string;
    };
  };
}

export type DesiredStateEffect = 'NO_STATE_CHANGE' | 'BECOME_HELD' | 'REMAIN_HELD' | 'BECOME_PLACED' | 'CHANGE_ORIENTATION' | 'CHANGE_PRODUCT_STATE';
export type Global4SceneRole = 'HOOK' | 'FEATURE' | 'PROOF' | 'CTA';
export interface Global4SceneIntent {
  sceneId: string;
  index: 1 | 2 | 3 | 4;
  role: Global4SceneRole;
  durationSeconds: 8;
  aspectRatio: '9:16';
  primaryTruthRefId: string;
  physicalObjective: string;
  primaryAction: ActionId;
  desiredStateEffect: DesiredStateEffect;
  dialogueDraft: string;
  referenceAssetIds: readonly string[];
  transitionToNext?: TransitionType;
}
export interface Global4ScenePlan {
  schemaVersion: SchemaVersion;
  productId: string;
  sourceEvidenceVersion: string;
  canonicalAssetIds: readonly string[];
  continuity: GlobalContinuityState;
  referenceLimitations: readonly ReferenceLimitationCode[];
  referenceReadiness: 'READY' | 'LIMITED';
  scenes: readonly Global4SceneIntent[];
}
export type CanonicalPlacement = 'ON_SURFACE'|'IN_HAND'|'NEAR_CAMERA';
export type CanonicalOrientation = 'FRONT_FACING'|'ROTATED';
export type CanonicalInteractionState = 'BASELINE'|'OPENED'|'ACTUATED'|'CONTENT_TRANSFERRED'|'APPLIED';
export interface CanonicalPhysicalState { heldBy: HeldBy; placement: CanonicalPlacement; orientation: CanonicalOrientation; interactionState: CanonicalInteractionState; }
export interface StateResolvedScene extends Global4SceneIntent { startState: CanonicalPhysicalState; endState: CanonicalPhysicalState; }
export interface StateResolved4ScenePlan { schemaVersion: SchemaVersion; productId:string; sourceEvidenceVersion:string; canonicalAssetIds:readonly string[]; continuity:GlobalContinuityState; referenceLimitations:readonly ReferenceLimitationCode[]; referenceReadiness:'READY'|'LIMITED'; scenes:readonly StateResolvedScene[]; }

export type ActionId =
  | 'REACH' | 'PICK_UP' | 'HOLD' | 'MOVE_CLOSER' | 'ROTATE_SLOW' | 'PLACE_DOWN'
  | 'OPEN_SIMPLE' | 'PRESS_BUTTON' | 'POUR_SIMPLE' | 'APPLY_SIMPLE' | 'POINT';

export type ProductArchetype = 'BOTTLE' | 'TUBE' | 'BOX' | 'DEVICE' | 'SOFT_PACKAGE';

export interface FixtureProductTruth {
  verificationStatus: 'PENDING_REAL_REFERENCES' | 'VERIFIED';
  productId?: string;
  name?: string;
  identityDescription?: string;
  allowedClaims: readonly string[];
  prohibitedInferences: readonly string[];
}

export interface GoldenProductFixture {
  schemaVersion: SchemaVersion;
  fixtureId: string;
  archetype: ProductArchetype;
  productTruth: FixtureProductTruth;
  expectedReferenceRoles: readonly AssetRole[];
  referenceAssets: readonly AssetRef[];
  physicalRiskNotes: readonly string[];
}

export interface BenchmarkCase {
  schemaVersion: SchemaVersion;
  benchmarkCaseId: string;
  fixtureId: string;
  actionId: ActionId;
  sceneContractId: string;
  providerTarget: string;
  modelTarget: string;
  expectedInvariants: readonly string[];
  attemptNumber: number;
}

export const BENCHMARK_DIMENSIONS = [
  'PRODUCT_FIDELITY', 'HAND_ANATOMY', 'ACTION_COMPLETION', 'PHYSICS',
  'CAMERA_REALISM', 'UNEXPECTED_CUTS', 'VISIBLE_ARTIFACTS'
] as const;
export type BenchmarkDimension = typeof BENCHMARK_DIMENSIONS[number];

/** Versioned human-review rubric for one real generated benchmark scene. */
export const RUBRIC_0_VERSION = 'RUBRIC_0' as const;
export type RubricVersion = typeof RUBRIC_0_VERSION;

export interface BenchmarkRubricDimensionDefinition {
  readonly dimension: BenchmarkDimension;
  readonly passCriteria: readonly string[];
  readonly failExamples: readonly string[];
}

/**
 * Rubric-0 is deliberately limited to the existing per-scene benchmark dimensions.
 * Cross-scene continuity belongs to the later production QC pipeline.
 */
export const RUBRIC_0: Readonly<{
  version: RubricVersion;
  dimensions: readonly BenchmarkRubricDimensionDefinition[];
}> = {
  version: RUBRIC_0_VERSION,
  dimensions: [
    {
      dimension: 'PRODUCT_FIDELITY',
      passCriteria: ['Correct target product is preserved.', 'Major silhouette and geometry are stable.', 'Dominant color family is preserved.', 'Identity-bearing packaging, logo, and label are neither substituted nor invented.', 'Unrelated referenced products are not borrowed into the target.'],
      failExamples: ['Wrong SKU or product.', 'Severe geometry morph.', 'Major unexplained color shift.', 'Identity-bearing label or logo substitution.']
    },
    {
      dimension: 'HAND_ANATOMY',
      passCriteria: ['Hand and finger anatomy is plausible.', 'Grip and contact are plausible.', 'There are no fused or duplicated digits.', 'There is no impossible joint behavior.', 'There is no hand or product penetration.'],
      failExamples: ['Fused or duplicated fingers.', 'Impossible joint articulation.', 'Hand penetrating the product.']
    },
    {
      dimension: 'ACTION_COMPLETION',
      passCriteria: ['The benchmarked primary action is visibly completed.', 'Action direction is correct.', 'The expected end state is reached.'],
      failExamples: ['Primary action is incomplete.', 'Action direction is reversed.', 'Expected end state is not reached.']
    },
    {
      dimension: 'PHYSICS',
      passCriteria: ['There is no floating, teleportation, or impossible clipping.', 'The product does not deform impossibly.', 'Grip and object motion remain physically plausible.'],
      failExamples: ['Floating product.', 'Teleportation.', 'Impossible clipping or deformation.']
    },
    {
      dimension: 'CAMERA_REALISM',
      passCriteria: ['The intended smartphone or POV camera family is preserved.', 'Framing supports the physical objective.', 'Camera movement does not contradict the scene contract.'],
      failExamples: ['Camera family contradicts the intended POV.', 'Framing prevents action review.', 'Camera movement contradicts the scene contract.']
    },
    {
      dimension: 'UNEXPECTED_CUTS',
      passCriteria: ['No uncontracted cut or reset breaks action or state progression.'],
      failExamples: ['Uncontracted cut.', 'State-reset cut that breaks the action.']
    },
    {
      dimension: 'VISIBLE_ARTIFACTS',
      passCriteria: ['No prominent generation artifact materially damages product, hand, action readability, or final usability.'],
      failExamples: ['Prominent artifact obscures the product.', 'Artifact damages hand or action readability.']
    }
  ]
};

export interface BenchmarkDimensionResult {
  dimension: BenchmarkDimension;
  passed: boolean;
  critical: boolean;
  notes: string;
}

export interface BenchmarkObservation {
  schemaVersion: SchemaVersion;
  rubricVersion: RubricVersion;
  observationId: string;
  benchmarkCaseId: string;
  fixtureId: string;
  archetype: ProductArchetype;
  actionId: ActionId;
  evidenceOrigin: 'REAL_MODEL_VIDEO';
  candidateAssetId: string;
  reviewerId: string;
  reviewedAt: string;
  dimensions: readonly BenchmarkDimensionResult[];
  verdict: 'PASS' | 'FAIL';
  reviewerNotes: string;
}

/** Rubric-0 never averages failures away: every required dimension must pass. */
export function deriveBenchmarkVerdict(dimensions: readonly BenchmarkDimensionResult[]): 'PASS' | 'FAIL' {
  if (!Array.isArray(dimensions) || dimensions.length !== BENCHMARK_DIMENSIONS.length) return 'FAIL';
  const seen = new Set<BenchmarkDimension>();
  for (const result of dimensions) {
    if (!isRecord(result) || !BENCHMARK_DIMENSIONS.includes(result.dimension as BenchmarkDimension) ||
      seen.has(result.dimension as BenchmarkDimension) || result.passed !== true) return 'FAIL';
    seen.add(result.dimension as BenchmarkDimension);
  }
  return BENCHMARK_DIMENSIONS.every(dimension => seen.has(dimension)) ? 'PASS' : 'FAIL';
}

export interface ActionStep {
  action: ActionId;
  objective: string;
  complexity: 1 | 2 | 3 | 4 | 5;
}

export interface ScenePlan {
  schemaVersion: SchemaVersion;
  sceneId: string;
  index: 1 | 2 | 3 | 4;
  role: 'HOOK' | 'FEATURE' | 'PROOF' | 'CTA';
  durationSeconds: 8;
  aspectRatio: '9:16';
  primaryObjective: string;
  dialogue: string;
  startState: PhysicalState;
  actions: readonly ActionStep[];
  endState: PhysicalState;
  transitionToNext?: TransitionType;
  requiredAssetIds: readonly string[];
}

export interface Constraint {
  id: string;
  text: string;
  level: 'HARD' | 'SOFT' | 'FREE';
}

export interface SceneProductionContract {
  schemaVersion: SchemaVersion;
  contractId: string;
  scene: ScenePlan;
  productionPrompt: string;
  constraints: readonly Constraint[];
  referenceAssetIds: readonly string[];
  firstFrameAssetId?: string;
  lastFrameAssetId?: string;
  compilerVersion: string;
}

export interface GeneratedCandidate {
  schemaVersion: SchemaVersion;
  candidateId: string;
  contractId: string;
  provider: string;
  model: string;
  outputAssetId: string;
  status: 'GENERATED' | 'QC_PENDING' | 'APPROVED' | 'REJECTED';
  generationMetadata: Readonly<Record<string, unknown>>;
}

export type QCGate =
  | 'PRODUCT_IDENTITY' | 'PRODUCT_GEOMETRY' | 'HAND_ANATOMY' | 'ACTION_COMPLETION'
  | 'PHYSICS' | 'ENVIRONMENT' | 'CAMERA' | 'FACTS' | 'AUDIO' | 'CONTINUITY' | 'ARTIFACTS';

export interface QCGateResult {
  gate: QCGate;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  passed: boolean;
  score?: number;
  reason: string;
}

export interface QCReport {
  schemaVersion: SchemaVersion;
  candidateId: string;
  gates: readonly QCGateResult[];
  approved: boolean;
  failureClass: 'NONE' | 'LOCAL_DEFECT' | 'STRUCTURAL_DEFECT' | 'CONTRACT_DEFECT';
}

export class ContractValidationError extends Error {
  readonly issues: readonly string[];
  constructor(issues: readonly string[]) {
    super(`CONTRACT_INVALID:${issues.join(',')}`);
    this.name = 'ContractValidationError';
    this.issues = issues;
  }
}

const nonBlank = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function validateProductInput(input: ProductInput): readonly string[] {
  const issues: string[] = [];
  if (input.schemaVersion !== SCHEMA_VERSION) issues.push('schema_version');
  if (!nonBlank(input.productId)) issues.push('product_id');
  if (!nonBlank(input.name)) issues.push('name');
  if (!nonBlank(input.details)) issues.push('details');
  if (input.assets.length === 0) issues.push('assets_required');
  const ids = new Set<string>();
  for (const asset of input.assets) {
    if (!nonBlank(asset.assetId)) issues.push('asset_id');
    if (ids.has(asset.assetId)) issues.push(`duplicate_asset:${asset.assetId}`);
    ids.add(asset.assetId);
    if (asset.qualityScore !== undefined && (asset.qualityScore < 0 || asset.qualityScore > 1)) issues.push(`asset_quality:${asset.assetId}`);
  }
  return issues;
}

/** Validates evidence only against factual ProductInput and logical asset IDs. */
export function validateProductEvidence(
  evidence: ProductEvidence,
  product: ProductInput
): readonly string[] {
  const issues: string[] = [];
  if (evidence.schemaVersion !== SCHEMA_VERSION) issues.push('schema_version');
  if (!nonBlank(evidence.productId)) issues.push('product_id');
  if (evidence.productId !== product.productId) issues.push('product_id_mismatch');
  if (evidence.canonicalAssetIds.length === 0) issues.push('canonical_assets_required');
  if (!nonBlank(evidence.identityDescription)) issues.push('identity_description');

  const productAssetIds = new Set(product.assets.map(asset => asset.assetId));
  const canonicalAssetIds = new Set<string>();
  for (const assetId of evidence.canonicalAssetIds) {
    if (canonicalAssetIds.has(assetId)) issues.push(`duplicate_canonical_asset:${assetId}`);
    canonicalAssetIds.add(assetId);
    if (!productAssetIds.has(assetId)) issues.push(`unknown_canonical_asset:${assetId}`);
  }

  for (const [name, notes] of [
    ['geometry', evidence.geometryNotes],
    ['color', evidence.colorNotes],
    ['packaging', evidence.packagingNotes],
    ['label', evidence.labelNotes],
    ['prohibited_inference', evidence.prohibitedInferences]
  ] as const) {
    for (const note of notes) if (!nonBlank(note)) issues.push(`blank_${name}_note`);
  }

  const claimIds = new Set<string>();
  for (const claim of evidence.claims) {
    if (!nonBlank(claim.claimId)) issues.push('claim_id');
    if (!nonBlank(claim.text)) issues.push(`claim_text:${claim.claimId}`);
    if (claimIds.has(claim.claimId)) issues.push(`duplicate_claim:${claim.claimId}`);
    claimIds.add(claim.claimId);
    if (claim.source === 'REFERENCE_EVIDENCE' && claim.evidenceAssetIds.length === 0) {
      issues.push(`reference_claim_requires_evidence:${claim.claimId}`);
    }
    for (const assetId of claim.evidenceAssetIds) {
      if (!productAssetIds.has(assetId)) issues.push(`unknown_claim_asset:${claim.claimId}:${assetId}`);
    }
  }

  for (const uncertainty of evidence.uncertainties) {
    if (!nonBlank(uncertainty.subject)) issues.push('uncertainty_subject');
    if (!nonBlank(uncertainty.reason)) issues.push('uncertainty_reason');
    for (const assetId of uncertainty.assetIds) {
      if (!productAssetIds.has(assetId)) issues.push(`unknown_uncertainty_asset:${assetId}`);
    }
  }
  for (const contradiction of evidence.contradictions) {
    if (contradiction.statements.length < 2 || contradiction.statements.some(statement => !nonBlank(statement))) {
      issues.push('contradiction_statements');
    }
    if (!nonBlank(contradiction.reason)) issues.push('contradiction_reason');
    for (const assetId of contradiction.assetIds) {
      if (!productAssetIds.has(assetId)) issues.push(`unknown_contradiction_asset:${assetId}`);
    }
  }
  return issues;
}

/**
 * Creates the complete, stable source fact catalog used by Product Truth.
 * Note text and provenance are copied from validated evidence; no intelligence
 * provider participates in this derivation.
 */
export function buildProductTruthCandidateFacts(evidence: ProductEvidence): readonly ProductTruthFact[] {
  const provenance = evidence.canonicalAssetIds;
  const facts: ProductTruthFact[] = [{
    factId: 'identity', kind: 'IDENTITY', text: evidence.identityDescription, evidenceAssetIds: provenance
  }];
  for (const [kind, prefix, notes] of [
    ['GEOMETRY', 'geometry', evidence.geometryNotes],
    ['COLOR', 'color', evidence.colorNotes],
    ['PACKAGING', 'packaging', evidence.packagingNotes],
    ['LABEL', 'label', evidence.labelNotes]
  ] as const) {
    notes.forEach((text, index) => facts.push({
      factId: `${prefix}:${index}`, kind, text, evidenceAssetIds: provenance
    }));
  }
  return facts;
}

/**
 * Validates that ProductTruth is an exact deterministic projection of one
 * factual ProductInput and ProductEvidence version. It never trusts model text.
 */
export function validateProductTruth(
  truth: ProductTruth,
  product: ProductInput,
  evidence: ProductEvidence,
  sourceEvidenceVersion: string
): readonly string[] {
  const issues: string[] = [];
  if (truth.schemaVersion !== SCHEMA_VERSION) issues.push('schema_version');
  if (!nonBlank(truth.productId)) issues.push('product_id');
  if (truth.productId !== product.productId) issues.push('product_id_mismatch');
  if (!nonBlank(truth.sourceEvidenceVersion)) issues.push('source_evidence_version');
  if (truth.sourceEvidenceVersion !== sourceEvidenceVersion) issues.push('source_evidence_version_mismatch');

  const productAssetIds = new Set(product.assets.map(asset => asset.assetId));
  const canonicalIds = new Set<string>();
  for (const assetId of truth.canonicalAssetIds) {
    if (canonicalIds.has(assetId)) issues.push(`duplicate_canonical_asset:${assetId}`);
    canonicalIds.add(assetId);
    if (!productAssetIds.has(assetId)) issues.push(`unknown_canonical_asset:${assetId}`);
  }
  if (!sameStringArray(truth.canonicalAssetIds, evidence.canonicalAssetIds)) {
    issues.push('canonical_asset_ids_mismatch');
  }
  if (truth.name !== product.name) issues.push('name_mismatch');
  if (truth.category !== product.category) issues.push('category_mismatch');

  const candidates = buildProductTruthCandidateFacts(evidence);
  const candidateById = new Map(candidates.map(fact => [fact.factId, fact]));
  const identity = candidateById.get('identity')!;
  if (!nonBlank(truth.identityDescription)) issues.push('identity_description');
  if (truth.identityDescription !== identity.text) issues.push('identity_description_mismatch');

  const retainedIds = new Set<string>(['identity']);
  const factIds = new Set<string>();
  for (const fact of truth.facts) {
    if (!nonBlank(fact.factId)) issues.push('fact_id');
    if (factIds.has(fact.factId)) issues.push(`duplicate_fact:${fact.factId}`);
    factIds.add(fact.factId);
    const candidate = candidateById.get(fact.factId);
    if (!candidate || fact.factId === 'identity') {
      issues.push(`unknown_fact:${fact.factId}`);
      continue;
    }
    retainedIds.add(fact.factId);
    if (fact.kind !== candidate.kind) issues.push(`fact_kind_mismatch:${fact.factId}`);
    if (fact.text !== candidate.text) issues.push(`fact_text_mismatch:${fact.factId}`);
    if (!sameStringArray(fact.evidenceAssetIds, candidate.evidenceAssetIds)) {
      issues.push(`fact_provenance_mismatch:${fact.factId}`);
    }
    for (const assetId of fact.evidenceAssetIds) {
      if (!productAssetIds.has(assetId)) issues.push(`unknown_fact_asset:${fact.factId}:${assetId}`);
    }
  }

  const evidenceClaims = evidence.claims.filter(claim => claim.allowed);
  const evidenceClaimById = new Map(evidenceClaims.map(claim => [claim.claimId, claim]));
  const truthClaimIds = new Set<string>();
  for (const claim of truth.allowedClaims) {
    if (!nonBlank(claim.claimId)) issues.push('claim_id');
    if (truthClaimIds.has(claim.claimId)) issues.push(`duplicate_claim:${claim.claimId}`);
    truthClaimIds.add(claim.claimId);
    const source = evidenceClaimById.get(claim.claimId);
    if (!source) {
      issues.push(`claim_not_allowed_or_unknown:${claim.claimId}`);
      continue;
    }
    if (claim.text !== source.text || claim.source !== source.source || !sameStringArray(claim.evidenceAssetIds, source.evidenceAssetIds)) {
      issues.push(`claim_mismatch:${claim.claimId}`);
    }
  }
  for (const claim of evidenceClaims) {
    if (!truthClaimIds.has(claim.claimId)) issues.push(`missing_allowed_claim:${claim.claimId}`);
  }

  if (!sameStringArray(truth.prohibitedInferences, evidence.prohibitedInferences)) {
    issues.push('prohibited_inferences_mismatch');
  }
  if (!sameUncertainties(truth.unresolvedUncertainties, evidence.uncertainties)) {
    issues.push('uncertainties_mismatch');
  }
  if (!sameContradictions(truth.unresolvedContradictions, evidence.contradictions)) {
    issues.push('contradictions_mismatch');
  }

  const excludedIds = new Set<string>();
  for (const exclusion of truth.exclusions) {
    if (excludedIds.has(exclusion.factId)) issues.push(`duplicate_exclusion:${exclusion.factId}`);
    excludedIds.add(exclusion.factId);
    if (!candidateById.has(exclusion.factId)) issues.push(`unknown_exclusion:${exclusion.factId}`);
    if (exclusion.reason !== 'UNCERTAIN' && exclusion.reason !== 'CONTRADICTED' && exclusion.reason !== 'INSUFFICIENT_SUPPORT') {
      issues.push(`invalid_exclusion_reason:${exclusion.factId}`);
    }
    if (retainedIds.has(exclusion.factId)) issues.push(`retained_exclusion_overlap:${exclusion.factId}`);
  }
  if (excludedIds.has('identity')) issues.push('identity_excluded');
  for (const candidate of candidates) {
    if (!retainedIds.has(candidate.factId) && !excludedIds.has(candidate.factId)) {
      issues.push(`candidate_partition_incomplete:${candidate.factId}`);
    }
  }
  return issues;
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameUncertainties(
  left: readonly ProductEvidenceUncertainty[], right: readonly ProductEvidenceUncertainty[]
): boolean {
  return left.length === right.length && left.every((value, index) => {
    const source = right[index];
    return source !== undefined && value.subject === source.subject && value.reason === source.reason
      && sameStringArray(value.assetIds, source.assetIds);
  });
}

function sameContradictions(
  left: readonly ProductEvidenceContradiction[], right: readonly ProductEvidenceContradiction[]
): boolean {
  return left.length === right.length && left.every((value, index) => {
    const source = right[index];
    return source !== undefined && value.reason === source.reason
      && sameStringArray(value.statements, source.statements)
      && sameStringArray(value.assetIds, source.assetIds);
  });
}

const REFERENCE_LIMITATION_CODE_ORDER: readonly ReferenceLimitationCode[] = [
  'TARGET_VISIBILITY_POOR',
  'IDENTITY_CONFIDENCE_LOW',
  'GEOMETRY_COVERAGE_PARTIAL',
  'GEOMETRY_COVERAGE_MINIMAL',
  'LABEL_READABILITY_PARTIAL',
  'LABEL_READABILITY_UNREADABLE',
  'LABEL_NOT_VISIBLE',
  'OCCLUSION_PARTIAL',
  'OCCLUSION_SEVERE',
  'BACKGROUND_INTERFERENCE_MEDIUM',
  'BACKGROUND_INTERFERENCE_HIGH',
  'MULTI_PRODUCT_AMBIGUITY_MODERATE',
  'MULTI_PRODUCT_AMBIGUITY_HIGH'
];

/** Derives a stable set of limitations from enum-only asset assessments. */
export function deriveReferenceLimitationCodes(
  assessments: readonly ReferenceAssetAssessment[]
): readonly ReferenceLimitationCode[] {
  const observed = new Set<ReferenceLimitationCode>();
  for (const assessment of assessments) {
    if (assessment.targetVisibility === 'POOR') observed.add('TARGET_VISIBILITY_POOR');
    if (assessment.identityConfidence === 'LOW') observed.add('IDENTITY_CONFIDENCE_LOW');
    if (assessment.geometryCoverage === 'PARTIAL') observed.add('GEOMETRY_COVERAGE_PARTIAL');
    if (assessment.geometryCoverage === 'MINIMAL') observed.add('GEOMETRY_COVERAGE_MINIMAL');
    if (assessment.labelReadability === 'PARTIAL') observed.add('LABEL_READABILITY_PARTIAL');
    if (assessment.labelReadability === 'UNREADABLE') observed.add('LABEL_READABILITY_UNREADABLE');
    if (assessment.labelReadability === 'NOT_VISIBLE') observed.add('LABEL_NOT_VISIBLE');
    if (assessment.occlusion === 'PARTIAL') observed.add('OCCLUSION_PARTIAL');
    if (assessment.occlusion === 'SEVERE') observed.add('OCCLUSION_SEVERE');
    if (assessment.backgroundInterference === 'MEDIUM') observed.add('BACKGROUND_INTERFERENCE_MEDIUM');
    if (assessment.backgroundInterference === 'HIGH') observed.add('BACKGROUND_INTERFERENCE_HIGH');
    if (assessment.multiProductAmbiguity === 'MODERATE') observed.add('MULTI_PRODUCT_AMBIGUITY_MODERATE');
    if (assessment.multiProductAmbiguity === 'HIGH') observed.add('MULTI_PRODUCT_AMBIGUITY_HIGH');
  }
  return REFERENCE_LIMITATION_CODE_ORDER.filter(code => observed.has(code));
}

/** Derives readiness without a model score or model-authored explanation. */
export function deriveReferenceReadiness(
  assessments: readonly ReferenceAssetAssessment[]
): ReferenceReadiness {
  const usable = assessments.filter(assessment =>
    (assessment.targetVisibility === 'CLEAR' || assessment.targetVisibility === 'PARTIAL')
    && (assessment.identityConfidence === 'HIGH' || assessment.identityConfidence === 'MEDIUM')
  );
  if (usable.length === 0) return 'BLOCKED';
  if (usable.some(assessment => assessment.geometryCoverage === 'MINIMAL'
    || assessment.occlusion === 'SEVERE'
    || assessment.multiProductAmbiguity === 'HIGH')) return 'LIMITED';
  return 'READY';
}

/** Validates the exact reference source and deterministic derivations. */
export function validateReferenceAssessment(
  assessment: ReferenceAssessment,
  product: ProductInput,
  evidence: ProductEvidence,
  sourceEvidenceVersion: string
): readonly string[] {
  const issues: string[] = [];
  if (assessment.schemaVersion !== SCHEMA_VERSION) issues.push('schema_version');
  if (!nonBlank(assessment.productId)) issues.push('product_id');
  if (assessment.productId !== product.productId) issues.push('product_id_mismatch');
  if (!nonBlank(assessment.sourceEvidenceVersion)) issues.push('source_evidence_version');
  if (assessment.sourceEvidenceVersion !== sourceEvidenceVersion) issues.push('source_evidence_version_mismatch');

  const productAssetIds = new Set(product.assets.map(asset => asset.assetId));
  const canonicalIds = new Set<string>();
  for (const assetId of assessment.canonicalAssetIds) {
    if (canonicalIds.has(assetId)) issues.push(`duplicate_canonical_asset:${assetId}`);
    canonicalIds.add(assetId);
    if (!productAssetIds.has(assetId)) issues.push(`unknown_canonical_asset:${assetId}`);
  }
  if (!sameStringArray(assessment.canonicalAssetIds, evidence.canonicalAssetIds)) {
    issues.push('canonical_asset_ids_mismatch');
  }

  const assessmentIds = new Set<string>();
  for (const [index, item] of assessment.assetAssessments.entries()) {
    if (!nonBlank(item.assetId)) issues.push('assessment_asset_id');
    if (assessmentIds.has(item.assetId)) issues.push(`duplicate_asset_assessment:${item.assetId}`);
    assessmentIds.add(item.assetId);
    if (!canonicalIds.has(item.assetId)) issues.push(`unknown_asset_assessment:${item.assetId}`);
    if (item.assetId !== assessment.canonicalAssetIds[index]) issues.push(`asset_assessment_order_mismatch:${item.assetId}`);
    if (!isTargetVisibility(item.targetVisibility)) issues.push(`invalid_target_visibility:${item.assetId}`);
    if (!isIdentityConfidence(item.identityConfidence)) issues.push(`invalid_identity_confidence:${item.assetId}`);
    if (!isGeometryCoverage(item.geometryCoverage)) issues.push(`invalid_geometry_coverage:${item.assetId}`);
    if (!isLabelReadability(item.labelReadability)) issues.push(`invalid_label_readability:${item.assetId}`);
    if (!isOcclusion(item.occlusion)) issues.push(`invalid_occlusion:${item.assetId}`);
    if (!isBackgroundInterference(item.backgroundInterference)) issues.push(`invalid_background_interference:${item.assetId}`);
    if (!isMultiProductAmbiguity(item.multiProductAmbiguity)) issues.push(`invalid_multi_product_ambiguity:${item.assetId}`);
  }
  for (const assetId of assessment.canonicalAssetIds) {
    if (!assessmentIds.has(assetId)) issues.push(`missing_asset_assessment:${assetId}`);
  }

  const expectedReadiness = deriveReferenceReadiness(assessment.assetAssessments);
  if (assessment.readiness !== expectedReadiness) issues.push('readiness_mismatch');
  const expectedLimitations = deriveReferenceLimitationCodes(assessment.assetAssessments);
  if (!sameStringArray(assessment.limitationCodes, expectedLimitations)) issues.push('limitation_codes_mismatch');
  return issues;
}

function isTargetVisibility(value: unknown): value is ReferenceTargetVisibility {
  return value === 'CLEAR' || value === 'PARTIAL' || value === 'POOR';
}
function isIdentityConfidence(value: unknown): value is ReferenceIdentityConfidence {
  return value === 'HIGH' || value === 'MEDIUM' || value === 'LOW';
}
function isGeometryCoverage(value: unknown): value is ReferenceGeometryCoverage {
  return value === 'STRONG' || value === 'PARTIAL' || value === 'MINIMAL';
}
function isLabelReadability(value: unknown): value is ReferenceLabelReadability {
  return value === 'CLEAR' || value === 'PARTIAL' || value === 'UNREADABLE' || value === 'NOT_VISIBLE';
}
function isOcclusion(value: unknown): value is ReferenceOcclusion {
  return value === 'NONE' || value === 'PARTIAL' || value === 'SEVERE';
}
function isBackgroundInterference(value: unknown): value is ReferenceBackgroundInterference {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH';
}
function isMultiProductAmbiguity(value: unknown): value is ReferenceMultiProductAmbiguity {
  return value === 'NONE' || value === 'MODERATE' || value === 'HIGH';
}

export function validateCreativeDirectionInput(input: CreativeDirectionInput): readonly string[] {
  const issues: string[] = [];
  if (!nonBlank(input.audience)) issues.push('audience');
  if (!nonBlank(input.shootingContext)) issues.push('shooting_context');
  if (!nonBlank(input.reviewerPersona)) issues.push('reviewer_persona');
  if (!nonBlank(input.tone)) issues.push('tone');
  if (!nonBlank(input.voiceStyle)) issues.push('voice_style');
  if (input.voiceGender !== 'MALE' && input.voiceGender !== 'FEMALE') issues.push('voice_gender');
  if (input.voiceRegion !== 'SOUTH' && input.voiceRegion !== 'NORTH') issues.push('voice_region');
  return issues;
}

/**
 * Validates each concern through its own validator. Product validation is
 * reused verbatim so project validation cannot drift from ProductInput rules.
 */
export function validateMochiProjectInput(input: MochiProjectInput): readonly string[] {
  const issues: string[] = [];
  if (input.schemaVersion !== SCHEMA_VERSION) issues.push('schema_version');
  if (!nonBlank(input.projectId)) issues.push('project_id');

  if (isProductInputLike(input.product)) {
    issues.push(...validateProductInput(input.product));
  } else {
    issues.push('product_input');
  }

  if (isRecord(input.creativeDirection)) {
    issues.push(...validateCreativeDirectionInput(input.creativeDirection as CreativeDirectionInput));
  } else {
    issues.push('creative_direction');
  }
  return issues;
}

function isProductInputLike(value: unknown): value is ProductInput {
  return isRecord(value) && Array.isArray(value.assets);
}

export function validateScenePlan(scene: ScenePlan): readonly string[] {
  const issues: string[] = [];
  if (scene.durationSeconds !== 8) issues.push('duration_must_be_8');
  if (scene.aspectRatio !== '9:16') issues.push('aspect_must_be_9_16');
  if (scene.actions.length === 0) issues.push('action_required');
  if (scene.requiredAssetIds.length === 0) issues.push('reference_required');
  if (!nonBlank(scene.primaryObjective)) issues.push('primary_objective');
  if (!nonBlank(scene.dialogue)) issues.push('dialogue');
  return issues;
}

export function validateGoldenProductFixture(fixture: GoldenProductFixture): readonly string[] {
  const issues: string[] = [];
  if (fixture.schemaVersion !== SCHEMA_VERSION) issues.push('schema_version');
  if (!nonBlank(fixture.fixtureId)) issues.push('fixture_id');
  if (fixture.expectedReferenceRoles.length === 0) issues.push('expected_reference_roles_required');
  if (fixture.productTruth.verificationStatus !== 'VERIFIED') issues.push('product_truth_unverified');
  if (!fixture.productTruth.productId || !nonBlank(fixture.productTruth.productId)) issues.push('product_id_unverified');
  if (!fixture.productTruth.name || !nonBlank(fixture.productTruth.name)) issues.push('product_name_unverified');
  if (!fixture.productTruth.identityDescription || !nonBlank(fixture.productTruth.identityDescription)) issues.push('product_identity_unverified');
  if (fixture.referenceAssets.length === 0) issues.push('real_reference_assets_required');

  const availableRoles = new Set(fixture.referenceAssets.map(asset => asset.role));
  for (const asset of fixture.referenceAssets) {
    if (asset.schemaVersion !== SCHEMA_VERSION) issues.push(`reference_schema_version:${asset.assetId}`);
    if (asset.source !== 'UPLOAD') issues.push(`reference_must_be_real_upload:${asset.assetId}`);
    if (!asset.sha256 || !nonBlank(asset.sha256)) issues.push(`reference_hash_required:${asset.assetId}`);
    if (!asset.mimeType.startsWith('image/')) issues.push(`reference_must_be_image:${asset.assetId}`);
  }
  for (const role of fixture.expectedReferenceRoles) {
    if (!availableRoles.has(role)) issues.push(`missing_reference_role:${role}`);
  }
  return issues;
}

export function validateBenchmarkCase(benchmarkCase: BenchmarkCase): readonly string[] {
  const issues: string[] = [];
  if (benchmarkCase.schemaVersion !== SCHEMA_VERSION) issues.push('schema_version');
  if (!nonBlank(benchmarkCase.benchmarkCaseId)) issues.push('benchmark_case_id');
  if (!nonBlank(benchmarkCase.fixtureId)) issues.push('fixture_id');
  if (!nonBlank(benchmarkCase.sceneContractId)) issues.push('scene_contract_id');
  if (!nonBlank(benchmarkCase.providerTarget)) issues.push('provider_target');
  if (!nonBlank(benchmarkCase.modelTarget)) issues.push('model_target');
  if (benchmarkCase.expectedInvariants.length === 0) issues.push('expected_invariants_required');
  if (!Number.isInteger(benchmarkCase.attemptNumber) || benchmarkCase.attemptNumber < 1) issues.push('attempt_number');
  return issues;
}

export function validateBenchmarkObservation(observation: BenchmarkObservation): readonly string[] {
  const issues: string[] = [];
  if (observation.schemaVersion !== SCHEMA_VERSION) issues.push('schema_version');
  if (observation.rubricVersion !== RUBRIC_0_VERSION) issues.push('rubric_version');
  if (!nonBlank(observation.observationId)) issues.push('observation_id');
  if (!nonBlank(observation.benchmarkCaseId)) issues.push('benchmark_case_id');
  if (!nonBlank(observation.fixtureId)) issues.push('fixture_id');
  if (observation.evidenceOrigin !== 'REAL_MODEL_VIDEO') issues.push('evidence_origin');
  if (!nonBlank(observation.candidateAssetId)) issues.push('candidate_asset_id');
  if (!nonBlank(observation.reviewerId)) issues.push('reviewer_id');
  if (!nonBlank(observation.reviewedAt) || Number.isNaN(Date.parse(observation.reviewedAt))) issues.push('reviewed_at');
  if (!Array.isArray(observation.dimensions) || observation.dimensions.length === 0) issues.push('dimensions_required');
  const dimensions = new Set<BenchmarkDimension>();
  for (const result of Array.isArray(observation.dimensions) ? observation.dimensions : []) {
    if (!isRecord(result) || !BENCHMARK_DIMENSIONS.includes(result.dimension as BenchmarkDimension) ||
      typeof result.passed !== 'boolean' || typeof result.critical !== 'boolean' || !nonBlank(result.notes)) {
      issues.push('malformed_dimension_result');
      continue;
    }
    const dimension = result.dimension as BenchmarkDimension;
    if (dimensions.has(dimension)) issues.push(`duplicate_dimension:${dimension}`);
    dimensions.add(dimension);
  }
  for (const dimension of BENCHMARK_DIMENSIONS) {
    if (!dimensions.has(dimension)) issues.push(`missing_dimension:${dimension}`);
  }
  const derivedVerdict = deriveBenchmarkVerdict(Array.isArray(observation.dimensions) ? observation.dimensions : []);
  if (observation.verdict !== derivedVerdict) issues.push('verdict_inconsistent_with_rubric');
  const criticalFailure = Array.isArray(observation.dimensions) && observation.dimensions.some(result =>
    isRecord(result) && result.critical === true && result.passed === false
  );
  if (observation.verdict === 'PASS' && criticalFailure) issues.push('critical_failure_cannot_pass');
  return issues;
}

export function assertValidProductInput(input: ProductInput): void {
  const issues = validateProductInput(input);
  if (issues.length > 0) throw new ContractValidationError(issues);
}

export function assertValidMochiProjectInput(input: MochiProjectInput): void {
  const issues = validateMochiProjectInput(input);
  if (issues.length > 0) throw new ContractValidationError(issues);
}

export function assertValidScenePlan(scene: ScenePlan): void {
  const issues = validateScenePlan(scene);
  if (issues.length > 0) throw new ContractValidationError(issues);
}
