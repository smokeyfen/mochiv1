export const SCHEMA_VERSION = '1.0.0' as const;
export type SchemaVersion = typeof SCHEMA_VERSION;

export type AssetRole =
  | 'PRODUCT_FRONT' | 'PRODUCT_SIDE' | 'PRODUCT_BACK' | 'PRODUCT_IN_HAND'
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
  audience: string;
  assets: readonly AssetRef[];
}

export interface ProductClaim {
  claimId: string;
  text: string;
  source: 'USER_INPUT' | 'REFERENCE_EVIDENCE';
  evidenceAssetIds: readonly string[];
  allowed: boolean;
}

export interface ProductEvidence {
  schemaVersion: SchemaVersion;
  productId: string;
  canonicalAssetIds: readonly string[];
  identityDescription: string;
  geometryNotes: readonly string[];
  colorNotes: readonly string[];
  labelNotes: readonly string[];
  claims: readonly ProductClaim[];
  prohibitedInferences: readonly string[];
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
  immutable: {
    productId: string;
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
    cameraFamily: string;
    voiceIdentity: string;
  };
  current: PhysicalState;
}

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

export interface BenchmarkDimensionResult {
  dimension: BenchmarkDimension;
  passed: boolean;
  critical: boolean;
  notes: string;
}

export interface BenchmarkObservation {
  schemaVersion: SchemaVersion;
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

const nonBlank = (value: string): boolean => value.trim().length > 0;

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
  if (!nonBlank(observation.observationId)) issues.push('observation_id');
  if (!nonBlank(observation.benchmarkCaseId)) issues.push('benchmark_case_id');
  if (!nonBlank(observation.fixtureId)) issues.push('fixture_id');
  if (observation.evidenceOrigin !== 'REAL_MODEL_VIDEO') issues.push('evidence_origin');
  if (!nonBlank(observation.candidateAssetId)) issues.push('candidate_asset_id');
  if (!nonBlank(observation.reviewerId)) issues.push('reviewer_id');
  if (!nonBlank(observation.reviewedAt) || Number.isNaN(Date.parse(observation.reviewedAt))) issues.push('reviewed_at');
  if (observation.dimensions.length === 0) issues.push('dimensions_required');
  const dimensions = new Set<BenchmarkDimension>();
  for (const result of observation.dimensions) {
    if (dimensions.has(result.dimension)) issues.push(`duplicate_dimension:${result.dimension}`);
    dimensions.add(result.dimension);
  }
  for (const dimension of BENCHMARK_DIMENSIONS) {
    if (!dimensions.has(dimension)) issues.push(`missing_dimension:${dimension}`);
  }
  const criticalFailure = observation.dimensions.some(result => result.critical && !result.passed);
  if (observation.verdict === 'PASS' && criticalFailure) issues.push('critical_failure_cannot_pass');
  return issues;
}

export function assertValidProductInput(input: ProductInput): void {
  const issues = validateProductInput(input);
  if (issues.length > 0) throw new ContractValidationError(issues);
}

export function assertValidScenePlan(scene: ScenePlan): void {
  const issues = validateScenePlan(scene);
  if (issues.length > 0) throw new ContractValidationError(issues);
}
