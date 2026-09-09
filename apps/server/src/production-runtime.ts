import {
  validateCreativeDirectionInput,
  validateProductInput,
  validateProductionSnapshotV1,
  PRE_F1_RUNTIME_STAGES,
  isPreF1RuntimeStage,
  type CreativeDirectionInput,
  type PreF1RuntimeStage,
  type ProductInput,
  type ActionId, type ProductionSnapshotV1, type ProductEvidence, validateProductEvidence
} from '@mochi/contracts';
import { isDeepStrictEqual } from 'node:util';
import { isSimpleActionFastTrackPolicyV1, type ActionCapabilityMap, type SimpleActionFastTrackPolicyV1 } from '@mochi/core';
import { analyzeProductEvidence } from '@mochi/evidence';
import { type IntelligenceMediaInput, type IntelligenceProvider, type IntelligenceProviderErrorCode } from '@mochi/providers';
import {
  analyzeProductTruth,
  analyzeReferenceAssessment,
  commitR2ProductContext,
  compileProductionContract,
  evaluateSceneRisk,
  finalizeDialogue,
  planGlobal4Scenes,
  planHumanRealism,
  planKeyPoints,
  ProductTruthError,
  resolveSceneStates,
  ScenePlanningBlockedError,
  StatePlanningError,
  synthesizeGlobalContinuity,
  targetedReplan,
  MAX_SCENE_REPLAN_ATTEMPTS,
  type ProductFoundationV1,
  type SceneBlueprintV1,
  type ProductTruthErrorCode,
  type ProductTruthIssueCategory
} from '@mochi/reasoning';
import {
  createProductReferenceBindingV1,
  type LayerArtifactStore
} from './layer-artifact-store.ts';
import { type ProductionSnapshotStore } from './production-snapshot.ts';

/** Ordered safe evidence for the one controlled PRE-F1 runtime invocation. */
export { PRE_F1_RUNTIME_STAGES, isPreF1RuntimeStage };
export type { PreF1RuntimeStage };
export interface PreF1RuntimeTraceEntry { readonly stage: PreF1RuntimeStage; readonly status: 'COMPLETED'; }

/** All caller-controlled runtime input. No computed R2–R8 artifact can enter here. */
export interface ProductionRuntimeRequest {
  readonly projectId: string;
  readonly product: ProductInput;
  readonly creativeDirection: CreativeDirectionInput;
  readonly media: readonly IntelligenceMediaInput[];
  readonly sourceEvidenceVersion: string;
  readonly capabilityMap: ActionCapabilityMap;
  readonly productionEligibilityPolicy?: SimpleActionFastTrackPolicyV1;
}

/** Trusted server composition dependencies. One provider instance is shared by every intelligence stage. */
export interface ProductionRuntimeDependencies {
  readonly intelligence: IntelligenceProvider;
  readonly snapshotStore: ProductionSnapshotStore;
  readonly layerArtifactStore: LayerArtifactStore;
  readonly trustedProductEvidence?: { readonly evidence: ProductEvidence; readonly sourceEvidenceVersion: string };
}

export interface ProductionRuntimeResult {
  /** Compatibility output remains the exact persisted P0 authority. */
  readonly snapshot: ProductionSnapshotV1;
  readonly trace: readonly PreF1RuntimeTraceEntry[];
}

export interface ProductFoundationRuntimeRequest {
  readonly projectId: string;
  readonly product: ProductInput;
  readonly media: readonly IntelligenceMediaInput[];
  readonly sourceEvidenceVersion: string;
}

export interface ProductFoundationRuntimeResult {
  readonly foundation: ProductFoundationV1;
  readonly trace: readonly PreF1RuntimeTraceEntry[];
}

export interface SceneBlueprintRuntimeRequest {
  readonly foundationId: string;
  readonly creativeDirection: CreativeDirectionInput;
  readonly capabilityMap: ActionCapabilityMap;
  readonly productionEligibilityPolicy?: SimpleActionFastTrackPolicyV1;
}

export interface SceneBlueprintRuntimeResult {
  readonly foundation: ProductFoundationV1;
  readonly blueprint: SceneBlueprintV1;
  readonly trace: readonly PreF1RuntimeTraceEntry[];
}

/** Bounded, provider-free root-cause data permitted through the production UI. */
export type ProductionRuntimeDiagnostic =
  | { readonly kind: 'R2_A_PRODUCT_TRUTH'; readonly productTruthErrorCode: ProductTruthErrorCode; readonly providerFailureCode?: IntelligenceProviderErrorCode; readonly issueCategories?: readonly ProductTruthIssueCategory[] }
  | { readonly kind: 'R5_STATE_PLANNING'; readonly code: string; readonly sceneIndex: 1|2|3|4; readonly primaryAction: ActionId }
  | { readonly kind: 'R6_SCENE_RISK'; readonly sceneIndex: 1|2|3|4; readonly primaryAction: ActionId; readonly riskStatus: 'CONDITIONAL'|'BLOCKED'; readonly productionEligibility: 'EMPIRICAL_SAFE'|'FAST_TRACK_AUTHORIZED'|'BLOCKED'; readonly riskReasons: readonly string[]; readonly replanFailureReason?: string; readonly attempt?: number };

export class ProductionRuntimeError extends Error {
  readonly stage: PreF1RuntimeStage;
  readonly trace: readonly PreF1RuntimeTraceEntry[];
  readonly diagnostic?: ProductionRuntimeDiagnostic;

  constructor(stage: PreF1RuntimeStage, trace: readonly PreF1RuntimeTraceEntry[], diagnostic?: ProductionRuntimeDiagnostic) {
    super(`PRE_F1_RUNTIME_ERROR:${stage}`);
    this.name = 'ProductionRuntimeError';
    this.stage = stage;
    this.trace = trace;
    if (diagnostic !== undefined) this.diagnostic = diagnostic;
  }
}

class RuntimeDiagnosticFailure extends Error {
  readonly diagnostic: ProductionRuntimeDiagnostic;
  constructor(diagnostic: ProductionRuntimeDiagnostic) { super('RUNTIME_DIAGNOSTIC_FAILURE'); this.diagnostic = diagnostic; }
}

const ACTION_IDS = [
  'REACH', 'PICK_UP', 'HOLD', 'MOVE_CLOSER', 'ROTATE_SLOW', 'PLACE_DOWN',
  'OPEN_SIMPLE', 'PRESS_BUTTON', 'POUR_SIMPLE', 'APPLY_SIMPLE', 'POINT'
] as const;
const CAPABILITY_LEVELS = new Set(['UNTESTED', 'SAFE', 'RISKY', 'AVOID']);
const ACTION_ID_SET = new Set<ActionId>(ACTION_IDS);
const FOUNDATION_ID_PATTERN = /^pf_[0-9a-f]{64}$/;
const STATE_PLANNING_CODES = new Set(['ACTION_EFFECT_MISMATCH', 'UNSATISFIABLE_INITIAL_STATE', 'PICK_UP_PRECONDITION', 'HOLD_PRECONDITION', 'MOVE_PRECONDITION', 'ROTATE_PRECONDITION', 'PLACE_PRECONDITION', 'INTERACTION_PRECONDITION']);
const RISK_REASONS = new Set(['action_avoid', 'action_untested', 'action_risky', 'unsupported_secondary_action', 'product_state_transformation', 'invalid_pick_up_transition', 'invalid_hold_transition', 'invalid_rotate_slow_transition', 'action_not_simple_fast_track', 'complexity_3']);
const REPLAN_FAILURE_REASONS = new Set(['scene_missing', 'no_eligible_safer_action', 'provider_failure', 'risk_unresolved']);
const PRODUCT_TRUTH_ERROR_CODES = new Set(['INVALID_INPUT', 'INVALID_EVIDENCE', 'INVALID_SOURCE_VERSION', 'INVALID_MODEL_OUTPUT', 'INSUFFICIENT_TRUTH', 'PROVIDER_FAILURE']);
const PROVIDER_FAILURE_CODES = new Set(['CONFIGURATION', 'AUTHENTICATION', 'RATE_LIMIT', 'INVALID_REQUEST', 'INVALID_RESPONSE', 'UNAVAILABLE', 'UNKNOWN']);
const PRODUCT_TRUTH_ISSUE_CATEGORIES = new Set(['DECISION_SHAPE', 'UNKNOWN_EXCLUSION', 'DUPLICATE_EXCLUSION', 'IDENTITY_EXCLUSION', 'INVALID_EXCLUSION_REASON', 'IDENTITY_INSUFFICIENT', 'COMPILED_TRUTH_INVALID']);

function isSceneIndex(value: unknown): value is 1|2|3|4 { return value === 1 || value === 2 || value === 3 || value === 4; }
function isActionId(value: unknown): value is ActionId { return typeof value === 'string' && ACTION_ID_SET.has(value as ActionId); }
function hasSafeReasons(value: unknown): value is readonly string[] { return Array.isArray(value) && value.length <= 8 && value.every(reason => typeof reason === 'string' && RISK_REASONS.has(reason)); }

/** Validates the exact small diagnostic contract again at every untyped transport edge. */
export function isProductionRuntimeDiagnostic(value: unknown): value is ProductionRuntimeDiagnostic {
  if (!value || typeof value !== 'object') return false;
  const diagnostic = value as Record<string, unknown>;
  if (diagnostic.kind === 'R2_A_PRODUCT_TRUTH') return Object.keys(diagnostic).every(key => ['kind', 'productTruthErrorCode', 'providerFailureCode', 'issueCategories'].includes(key))
    && typeof diagnostic.productTruthErrorCode === 'string' && PRODUCT_TRUTH_ERROR_CODES.has(diagnostic.productTruthErrorCode)
    && (diagnostic.providerFailureCode === undefined || (typeof diagnostic.providerFailureCode === 'string' && PROVIDER_FAILURE_CODES.has(diagnostic.providerFailureCode)))
    && (diagnostic.issueCategories === undefined || (Array.isArray(diagnostic.issueCategories) && diagnostic.issueCategories.length <= PRODUCT_TRUTH_ISSUE_CATEGORIES.size
      && diagnostic.issueCategories.every(issue => typeof issue === 'string' && PRODUCT_TRUTH_ISSUE_CATEGORIES.has(issue))
      && new Set(diagnostic.issueCategories).size === diagnostic.issueCategories.length));
  if (diagnostic.kind === 'R5_STATE_PLANNING') return Object.keys(diagnostic).length === 4
    && typeof diagnostic.code === 'string' && STATE_PLANNING_CODES.has(diagnostic.code)
    && isSceneIndex(diagnostic.sceneIndex) && isActionId(diagnostic.primaryAction);
  return diagnostic.kind === 'R6_SCENE_RISK'
    && Object.keys(diagnostic).every(key => ['kind','sceneIndex','primaryAction','riskStatus','productionEligibility','riskReasons','replanFailureReason','attempt'].includes(key))
    && isSceneIndex(diagnostic.sceneIndex) && isActionId(diagnostic.primaryAction)
    && (diagnostic.riskStatus === 'CONDITIONAL' || diagnostic.riskStatus === 'BLOCKED')
    && (diagnostic.productionEligibility === 'EMPIRICAL_SAFE' || diagnostic.productionEligibility === 'FAST_TRACK_AUTHORIZED' || diagnostic.productionEligibility === 'BLOCKED')
    && hasSafeReasons(diagnostic.riskReasons)
    && (diagnostic.replanFailureReason === undefined || (typeof diagnostic.replanFailureReason === 'string' && REPLAN_FAILURE_REASONS.has(diagnostic.replanFailureReason)))
    && (diagnostic.attempt === undefined || (typeof diagnostic.attempt === 'number' && Number.isInteger(diagnostic.attempt) && diagnostic.attempt >= 0 && diagnostic.attempt <= MAX_SCENE_REPLAN_ATTEMPTS));
}

function stateDiagnostic(error: unknown): ProductionRuntimeDiagnostic | undefined {
  return error instanceof StatePlanningError && isSceneIndex(error.sceneIndex) && isActionId(error.primaryAction)
    ? { kind: 'R5_STATE_PLANNING', code: error.code, sceneIndex: error.sceneIndex, primaryAction: error.primaryAction }
    : undefined;
}

function diagnosticFromError(error: unknown): ProductionRuntimeDiagnostic | undefined {
  if (error instanceof ProductTruthError && isProductionRuntimeDiagnostic({ kind: 'R2_A_PRODUCT_TRUTH', ...error.diagnostic })) {
    return { kind: 'R2_A_PRODUCT_TRUTH', ...error.diagnostic };
  }
  return error instanceof RuntimeDiagnosticFailure ? error.diagnostic : stateDiagnostic(error);
}

function riskDiagnostic(scene: { readonly index:number; readonly actionId:string; readonly status:string; readonly productionEligibility:string; readonly reasons:readonly string[] }, replan?: ScenePlanningBlockedError): Extract<ProductionRuntimeDiagnostic, { readonly kind: 'R6_SCENE_RISK' }> {
  const base = { kind: 'R6_SCENE_RISK' as const, sceneIndex: scene.index as 1|2|3|4, primaryAction: scene.actionId as ActionId, riskStatus: scene.status as 'CONDITIONAL'|'BLOCKED', productionEligibility: scene.productionEligibility as 'EMPIRICAL_SAFE'|'FAST_TRACK_AUTHORIZED'|'BLOCKED', riskReasons: [...scene.reasons] };
  return replan === undefined ? base : { ...base, replanFailureReason: replan.reasons[0] ?? 'risk_unresolved', attempt: replan.attempts };
}

function validFoundationRequest(request: ProductFoundationRuntimeRequest): boolean {
  return !!request && typeof request.projectId === 'string' && request.projectId.trim().length > 0
    && typeof request.sourceEvidenceVersion === 'string' && request.sourceEvidenceVersion.trim().length > 0
    && validateProductInput(request.product).length === 0
    && Array.isArray(request.media);
}

function validBlueprintInputs(request: Pick<SceneBlueprintRuntimeRequest, 'creativeDirection' | 'capabilityMap' | 'productionEligibilityPolicy'>): boolean {
  if (!request || validateCreativeDirectionInput(request.creativeDirection).length > 0
    || !request.capabilityMap || typeof request.capabilityMap !== 'object'
    || (request.productionEligibilityPolicy !== undefined && !isSimpleActionFastTrackPolicyV1(request.productionEligibilityPolicy))) return false;
  return ACTION_IDS.every(action => CAPABILITY_LEVELS.has(request.capabilityMap[action]));
}

function validBlueprintRequest(request: SceneBlueprintRuntimeRequest): boolean {
  return !!request && FOUNDATION_ID_PATTERN.test(request.foundationId) && validBlueprintInputs(request);
}

function validRequest(request: ProductionRuntimeRequest): boolean {
  return validFoundationRequest(request) && validBlueprintInputs({
    creativeDirection: request.creativeDirection,
    capabilityMap: request.capabilityMap,
    ...(request.productionEligibilityPolicy === undefined ? {} : { productionEligibilityPolicy: request.productionEligibilityPolicy })
  });
}

function sameValue(left: unknown, right: unknown): boolean {
  return isDeepStrictEqual(left, right);
}

type StageRunner = <T>(name: PreF1RuntimeStage, operation: () => T | Promise<T>) => Promise<T>;

function createStageRunner(trace: PreF1RuntimeTraceEntry[]): StageRunner {
  return async <T>(name: PreF1RuntimeStage, operation: () => T | Promise<T>): Promise<T> => {
    try {
      const value = await operation();
      trace.push({ stage: name, status: 'COMPLETED' });
      return value;
    } catch (error) {
      throw new ProductionRuntimeError(name, trace, diagnosticFromError(error));
    }
  };
}

export type ProductFoundationRuntimeDependencies = Pick<ProductionRuntimeDependencies, 'intelligence' | 'layerArtifactStore' | 'trustedProductEvidence'>;
export type SceneBlueprintRuntimeDependencies = Pick<ProductionRuntimeDependencies, 'intelligence' | 'layerArtifactStore'>;

async function executeProductFoundation(
  dependencies: ProductFoundationRuntimeDependencies,
  request: ProductFoundationRuntimeRequest,
  stage: StageRunner
): Promise<ProductFoundationV1> {
  const evidence = await stage('R1_PRODUCT_EVIDENCE', () => {
    if (dependencies.trustedProductEvidence) {
      if (validateProductEvidence(dependencies.trustedProductEvidence.evidence, request.product).length > 0) throw new Error('invalid_trusted_evidence');
      return dependencies.trustedProductEvidence.evidence;
    }
    return analyzeProductEvidence({ product: request.product, media: request.media, intelligence: dependencies.intelligence });
  });
  const productTruth = await stage('R2_A_PRODUCT_TRUTH', () => analyzeProductTruth({
    product: request.product, evidence, sourceEvidenceVersion: request.sourceEvidenceVersion, intelligence: dependencies.intelligence
  }));
  const referenceAssessment = await stage('R2_B_REFERENCE_ASSESSMENT', () => analyzeReferenceAssessment({
    product: request.product, evidence, sourceEvidenceVersion: request.sourceEvidenceVersion,
    media: request.media, intelligence: dependencies.intelligence
  }));
  return stage('R2_COMMIT', async () => {
    const committedContext = commitR2ProductContext({
      product: request.product, evidence, sourceEvidenceVersion: request.sourceEvidenceVersion, productTruth, referenceAssessment
    });
    return dependencies.layerArtifactStore.createProductFoundation({
      projectId: request.projectId,
      productReferenceBinding: createProductReferenceBindingV1(request.product, request.media),
      productEvidence: evidence,
      committedContext
    });
  });
}

async function executeSceneBlueprint(
  dependencies: SceneBlueprintRuntimeDependencies,
  request: SceneBlueprintRuntimeRequest,
  stage: StageRunner
): Promise<{ foundation: ProductFoundationV1; blueprint: SceneBlueprintV1 }> {
  let foundation: ProductFoundationV1;
  const continuity = await stage('R3_CONTINUITY', async () => {
    if (!validBlueprintRequest(request)) throw new Error('invalid');
    foundation = await dependencies.layerArtifactStore.loadProductFoundation(request.foundationId);
    return synthesizeGlobalContinuity({
      context: foundation.committedContext, creativeDirection: request.creativeDirection, intelligence: dependencies.intelligence
    });
  });
  const context = foundation!;
  const globalPlan = await stage('R4_GLOBAL_PLAN', () => planGlobal4Scenes({
    context: context.committedContext, continuity, creativeDirection: request.creativeDirection, intelligence: dependencies.intelligence
  }));
  const initialStatePlan = await stage('R5_INITIAL_STATE', () => resolveSceneStates(globalPlan));
  const initialRiskAssessment = await stage('R6_INITIAL_RISK', () => evaluateSceneRisk(initialStatePlan, request.capabilityMap, request.productionEligibilityPolicy));
  const finalGlobalPlan = await stage('R6_BOUNDED_REPLAN', async () => {
    let candidatePlan = globalPlan;
    let candidateRiskAssessment = initialRiskAssessment;
    const replannedIndexes = new Set<number>();
    while (candidateRiskAssessment.scenes.some(scene => scene.status !== 'READY')) {
      const target = candidateRiskAssessment.scenes.find(scene => scene.status !== 'READY' && !replannedIndexes.has(scene.index));
      if (!target) {
        const unresolved = candidateRiskAssessment.scenes.find(scene => scene.status !== 'READY');
        if (unresolved) throw new RuntimeDiagnosticFailure({ ...riskDiagnostic(unresolved), replanFailureReason: 'risk_unresolved' });
        throw new Error('risk_unresolved');
      }
      replannedIndexes.add(target.index);
      try {
        candidatePlan = await targetedReplan(
          candidatePlan, context.committedContext, continuity, request.capabilityMap, target.index,
          dependencies.intelligence, MAX_SCENE_REPLAN_ATTEMPTS, request.productionEligibilityPolicy
        );
      } catch (error) {
        if (error instanceof ScenePlanningBlockedError) throw new RuntimeDiagnosticFailure(riskDiagnostic(target, error));
        throw error;
      }
      const candidateStatePlan = resolveSceneStates(candidatePlan);
      candidateRiskAssessment = evaluateSceneRisk(candidateStatePlan, request.capabilityMap, request.productionEligibilityPolicy);
    }
    return candidatePlan;
  });
  const statePlan = await stage('R5_FINAL_STATE', () => resolveSceneStates(finalGlobalPlan));
  const riskAssessment = await stage('R6_FINAL_RISK', () => evaluateSceneRisk(statePlan, request.capabilityMap, request.productionEligibilityPolicy));
  await stage('R6_READY_GATE', () => {
    const blocked = riskAssessment.scenes.find(scene => scene.status !== 'READY');
    if (blocked) throw new RuntimeDiagnosticFailure(riskDiagnostic(blocked));
  });
  const blueprint = await stage('R7_A_HUMAN_REALISM', async () => {
    const humanRealismPlan = await planHumanRealism({
      context: context.committedContext, plan: finalGlobalPlan, statePlan, risk: riskAssessment, creativeDirection: request.creativeDirection,
      capabilityMap: request.capabilityMap, ...(request.productionEligibilityPolicy === undefined ? {} : { productionEligibilityPolicy: request.productionEligibilityPolicy }), intelligence: dependencies.intelligence
    });
    return dependencies.layerArtifactStore.createSceneBlueprint({
      foundationId: context.foundationId,
      creativeDirection: structuredClone(request.creativeDirection),
      eligibilityBinding: {
        capabilityMap: structuredClone(request.capabilityMap),
        productionEligibilityPolicy: request.productionEligibilityPolicy === undefined ? null : structuredClone(request.productionEligibilityPolicy)
      },
      continuity,
      globalPlan: finalGlobalPlan,
      statePlan,
      riskAssessment,
      humanRealismPlan
    });
  });
  return { foundation: context, blueprint };
}

/** Runs and durably commits only R1, R2-A, R2-B, and R2 Commit. */
export async function runProductFoundation(
  dependencies: ProductFoundationRuntimeDependencies,
  request: ProductFoundationRuntimeRequest
): Promise<ProductFoundationRuntimeResult> {
  const trace: PreF1RuntimeTraceEntry[] = [];
  const stage = createStageRunner(trace);
  await stage('VALIDATE_INPUT', () => { if (!validFoundationRequest(request)) throw new Error('invalid'); });
  const foundation = await executeProductFoundation(dependencies, request, stage);
  return { foundation, trace };
}

/** Loads one committed L1 artifact, then runs and durably commits only R3 through R7-A. */
export async function runSceneBlueprint(
  dependencies: SceneBlueprintRuntimeDependencies,
  request: SceneBlueprintRuntimeRequest
): Promise<SceneBlueprintRuntimeResult> {
  const trace: PreF1RuntimeTraceEntry[] = [];
  const result = await executeSceneBlueprint(dependencies, request, createStageRunner(trace));
  return { ...result, trace };
}

/**
 * Server-only orchestration of the locked reasoning pipeline through P0.
 * This layer owns only ordering, safe tracing, and fail-closed error mapping.
 */
export function createProductionRuntime(dependencies: ProductionRuntimeDependencies) {
  if (!dependencies?.intelligence || !dependencies.snapshotStore || !dependencies.layerArtifactStore) throw new ProductionRuntimeError('VALIDATE_INPUT', []);

  return {
    async run(request: ProductionRuntimeRequest): Promise<ProductionRuntimeResult> {
      const trace: PreF1RuntimeTraceEntry[] = [];
      const stage = createStageRunner(trace);

      await stage('VALIDATE_INPUT', () => {
        if (!validRequest(request)) throw new Error('invalid');
      });
      const foundation = await executeProductFoundation(dependencies, request, stage);
      const { blueprint } = await executeSceneBlueprint(dependencies, {
        foundationId: foundation.foundationId,
        creativeDirection: request.creativeDirection,
        capabilityMap: request.capabilityMap,
        ...(request.productionEligibilityPolicy === undefined ? {} : { productionEligibilityPolicy: request.productionEligibilityPolicy })
      }, stage);
      const context = foundation.committedContext;
      const finalGlobalPlan = blueprint.globalPlan;
      const statePlan = blueprint.statePlan;
      const riskAssessment = blueprint.riskAssessment;
      const humanRealismPlan = blueprint.humanRealismPlan;
      const keyPointPlan = await stage('R4_1_KEY_POINTS', () => planKeyPoints({
        context, globalPlan: finalGlobalPlan, intelligence: dependencies.intelligence
      }));
      const dialoguePlan = await stage('R7_B_DIALOGUE', () => finalizeDialogue({
        context, globalPlan: finalGlobalPlan, keyPointPlan, creativeDirection: request.creativeDirection, intelligence: dependencies.intelligence
      }));
      const productionRequest = {
        context, creativeDirection: request.creativeDirection, globalPlan: finalGlobalPlan, keyPointPlan, statePlan,
        riskAssessment, capabilityMap: request.capabilityMap, ...(request.productionEligibilityPolicy === undefined ? {} : { productionEligibilityPolicy: request.productionEligibilityPolicy }), humanRealismPlan, dialoguePlan
      };
      const productionContract = await stage('R8_PRODUCTION_CONTRACT', () => compileProductionContract(productionRequest));
      const snapshot = await stage('P0_CREATE_PERSIST', () => dependencies.snapshotStore.create({
        projectId: request.projectId, productionRequest
      }));
      const loaded = await stage('P0_LOAD', () => dependencies.snapshotStore.load(snapshot.snapshotId));
      await stage('P0_EQUALITY', () => {
        if (!sameValue(loaded, snapshot) || !sameValue(snapshot.productionContract, productionContract)) throw new Error('snapshot_mismatch');
      });
      await stage('RETURN_VALIDATE', () => {
        if (validateProductionSnapshotV1(loaded).length > 0) throw new Error('invalid_snapshot');
      });
      return { snapshot: loaded, trace };
    }
  };
}
