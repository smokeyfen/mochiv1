import {
  SCHEMA_VERSION,
  validateCreativeDirectionInput,
  validateKeyPointPlan,
  validateHumanRealism4ScenePlan,
  validateProductEvidence,
  validateProductInput,
  validateProductTruth,
  validateReferenceAssessment,
  type CreativeDirectionInput,
  type DialoguePlan,
  type Global4ScenePlan,
  type GlobalContinuityState,
  type HumanRealism4ScenePlan,
  type KeyPointPlan,
  type ProductEvidence,
  type ProductInput,
  type R2CommittedProductContext,
  type StateResolved4ScenePlan
} from '@mochi/contracts';
import {
  isSimpleActionFastTrackPolicyV1,
  type ActionCapabilityMap,
  type CapabilityLevel,
  type SimpleActionFastTrackPolicyV1
} from '@mochi/core';
import { commitR2ProductContext } from './commit.ts';
import { validateGlobalContinuityState } from './continuity.ts';
import { HUMAN_REALISM_GLOBAL_CONSTRAINTS } from './human-realism.ts';
import { buildPlanningTruthCatalog, validatePlan } from './planner.ts';
import { evaluateSceneRisk, type GlobalSceneRiskAssessment } from './risk.ts';
import { resolveSceneStates } from './state.ts';
import { validateDialogueUpstreamBinding } from './dialogue.ts';

export const PRODUCT_REFERENCE_BINDING_V1 = 'PRODUCT_REFERENCE_BINDING_V1' as const;
export const PRODUCT_FOUNDATION_V1 = 'PRODUCT_FOUNDATION_V1' as const;
export const SCENE_BLUEPRINT_V1 = 'SCENE_BLUEPRINT_V1' as const;
export const FINALIZED_SCRIPT_V1 = 'FINALIZED_SCRIPT_V1' as const;

export interface ReferenceContentFingerprintV1 {
  readonly assetId: string;
  readonly mimeType: string;
  readonly sha256: string;
}

/** Exact factual and reference-byte identity. Reference bytes never enter the artifact. */
export interface ProductReferenceBindingV1 {
  readonly bindingVersion: typeof PRODUCT_REFERENCE_BINDING_V1;
  readonly product: ProductInput;
  readonly references: readonly ReferenceContentFingerprintV1[];
}

export interface ProductFoundationV1 {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly foundationVersion: typeof PRODUCT_FOUNDATION_V1;
  readonly foundationId: string;
  readonly projectId: string;
  readonly productReferenceBinding: ProductReferenceBindingV1;
  readonly productEvidence: ProductEvidence;
  readonly committedContext: R2CommittedProductContext;
}

export interface SceneBlueprintEligibilityBindingV1 {
  readonly capabilityMap: ActionCapabilityMap;
  readonly productionEligibilityPolicy: SimpleActionFastTrackPolicyV1 | null;
}

export interface SceneBlueprintV1 {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly blueprintVersion: typeof SCENE_BLUEPRINT_V1;
  readonly blueprintId: string;
  readonly foundationId: string;
  readonly creativeDirection: CreativeDirectionInput;
  readonly eligibilityBinding: SceneBlueprintEligibilityBindingV1;
  readonly continuity: GlobalContinuityState;
  readonly globalPlan: Global4ScenePlan;
  readonly statePlan: StateResolved4ScenePlan;
  readonly riskAssessment: GlobalSceneRiskAssessment;
  readonly humanRealismPlan: HumanRealism4ScenePlan;
}

/** Durable L3 authority. Upstream L1/L2 content remains authoritative by ID only. */
export interface FinalizedScriptV1 {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly scriptVersion: typeof FINALIZED_SCRIPT_V1;
  readonly scriptId: string;
  readonly blueprintId: string;
  readonly keyPointPlan: KeyPointPlan;
  readonly dialoguePlan: DialoguePlan;
}

const FOUNDATION_ID = /^pf_[0-9a-f]{64}$/;
const BLUEPRINT_ID = /^sb_[0-9a-f]{64}$/;
const SCRIPT_ID = /^fs_[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const ACTION_IDS = [
  'REACH', 'PICK_UP', 'HOLD', 'MOVE_CLOSER', 'ROTATE_SLOW', 'PLACE_DOWN',
  'OPEN_SIMPLE', 'PRESS_BUTTON', 'POUR_SIMPLE', 'APPLY_SIMPLE', 'POINT'
] as const;
const CAPABILITY_LEVELS: readonly CapabilityLevel[] = ['UNTESTED', 'SAFE', 'RISKY', 'AVOID'];

const FOUNDATION_KEYS = ['schemaVersion', 'foundationVersion', 'foundationId', 'projectId', 'productReferenceBinding', 'productEvidence', 'committedContext'] as const;
const BINDING_KEYS = ['bindingVersion', 'product', 'references'] as const;
const REFERENCE_KEYS = ['assetId', 'mimeType', 'sha256'] as const;
const PRODUCT_KEYS = ['schemaVersion', 'productId', 'name', 'details', 'category', 'assets'] as const;
const ASSET_REQUIRED_KEYS = ['schemaVersion', 'assetId', 'role', 'source', 'mimeType'] as const;
const ASSET_OPTIONAL_KEYS = ['sha256', 'viewAngle', 'qualityScore'] as const;
const EVIDENCE_KEYS = ['schemaVersion', 'productId', 'canonicalAssetIds', 'identityDescription', 'geometryNotes', 'colorNotes', 'packagingNotes', 'labelNotes', 'claims', 'prohibitedInferences', 'uncertainties', 'contradictions'] as const;
const CLAIM_KEYS = ['claimId', 'text', 'source', 'evidenceAssetIds', 'allowed'] as const;
const UNCERTAINTY_KEYS = ['subject', 'assetIds', 'reason'] as const;
const CONTRADICTION_KEYS = ['statements', 'assetIds', 'reason'] as const;
const CONTEXT_KEYS = ['schemaVersion', 'productId', 'sourceEvidenceVersion', 'canonicalAssetIds', 'productTruth', 'referenceAssessment'] as const;
const TRUTH_KEYS = ['schemaVersion', 'productId', 'sourceEvidenceVersion', 'canonicalAssetIds', 'name', 'category', 'identityDescription', 'facts', 'allowedClaims', 'prohibitedInferences', 'unresolvedUncertainties', 'unresolvedContradictions', 'exclusions'] as const;
const TRUTH_FACT_KEYS = ['factId', 'kind', 'text', 'evidenceAssetIds'] as const;
const TRUTH_CLAIM_KEYS = ['claimId', 'text', 'source', 'evidenceAssetIds'] as const;
const EXCLUSION_KEYS = ['factId', 'reason'] as const;
const ASSESSMENT_KEYS = ['schemaVersion', 'productId', 'sourceEvidenceVersion', 'canonicalAssetIds', 'assetAssessments', 'readiness', 'limitationCodes'] as const;
const ASSET_ASSESSMENT_KEYS = ['assetId', 'targetVisibility', 'identityConfidence', 'geometryCoverage', 'labelReadability', 'occlusion', 'backgroundInterference', 'multiProductAmbiguity'] as const;

const BLUEPRINT_KEYS = ['schemaVersion', 'blueprintVersion', 'blueprintId', 'foundationId', 'creativeDirection', 'eligibilityBinding', 'continuity', 'globalPlan', 'statePlan', 'riskAssessment', 'humanRealismPlan'] as const;
const SCRIPT_KEYS = ['schemaVersion', 'scriptVersion', 'scriptId', 'blueprintId', 'keyPointPlan', 'dialoguePlan'] as const;
const CREATIVE_KEYS = ['audience', 'shootingContext', 'reviewerPersona', 'tone', 'voiceStyle', 'voiceGender', 'voiceRegion'] as const;
const ELIGIBILITY_KEYS = ['capabilityMap', 'productionEligibilityPolicy'] as const;
const CONTINUITY_KEYS = ['schemaVersion', 'productId', 'sourceEvidenceVersion', 'canonicalAssetIds', 'immutable'] as const;
const IMMUTABLE_KEYS = ['handIdentity', 'environment', 'cameraFamily', 'voiceIdentity'] as const;
const HAND_KEYS = ['skinTone', 'nailStyle', 'jewelry', 'dominantHand'] as const;
const ENVIRONMENT_KEYS = ['location', 'surface', 'background', 'lighting'] as const;
const VOICE_KEYS = ['voiceGender', 'voiceRegion', 'voiceStyle'] as const;
const PLAN_KEYS = ['schemaVersion', 'productId', 'sourceEvidenceVersion', 'canonicalAssetIds', 'continuity', 'referenceLimitations', 'referenceReadiness', 'scenes'] as const;
const PLAN_SCENE_REQUIRED_KEYS = ['sceneId', 'index', 'role', 'durationSeconds', 'aspectRatio', 'primaryTruthRefId', 'physicalObjective', 'primaryAction', 'desiredStateEffect', 'dialogueDraft', 'referenceAssetIds'] as const;
const PLAN_SCENE_OPTIONAL_KEYS = ['transitionToNext'] as const;
const STATE_SCENE_REQUIRED_KEYS = [...PLAN_SCENE_REQUIRED_KEYS, 'startState', 'endState'] as const;
const STATE_KEYS = ['heldBy', 'placement', 'orientation', 'interactionState'] as const;
const RISK_KEYS = ['scenes'] as const;
const RISK_SCENE_KEYS = ['sceneId', 'index', 'actionId', 'actionCapability', 'productionEligibility', 'actionComplexity', 'referenceQuality', 'status', 'reasons', 'warnings', 'replanRecommended'] as const;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exact(value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> {
  if (!record(value)) return false;
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  return required.every(key => key in value) && keys.every(key => allowed.has(key));
}

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function comparableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(comparableJson).join(',')}]`;
  if (record(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${comparableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function same(left: unknown, right: unknown): boolean {
  return comparableJson(left) === comparableJson(right);
}

function strictProductShape(product: unknown): product is ProductInput {
  if (!exact(product, PRODUCT_KEYS) || !Array.isArray(product.assets)) return false;
  return product.assets.every(asset => exact(asset, ASSET_REQUIRED_KEYS, ASSET_OPTIONAL_KEYS));
}

function strictEvidenceShape(evidence: unknown): evidence is ProductEvidence {
  if (!exact(evidence, EVIDENCE_KEYS)) return false;
  return Array.isArray(evidence.claims) && evidence.claims.every(claim => exact(claim, CLAIM_KEYS))
    && Array.isArray(evidence.uncertainties) && evidence.uncertainties.every(item => exact(item, UNCERTAINTY_KEYS))
    && Array.isArray(evidence.contradictions) && evidence.contradictions.every(item => exact(item, CONTRADICTION_KEYS));
}

function strictContextShape(context: unknown): context is R2CommittedProductContext {
  if (!exact(context, CONTEXT_KEYS)) return false;
  const truth = context.productTruth;
  const assessment = context.referenceAssessment;
  return exact(truth, TRUTH_KEYS)
    && Array.isArray(truth.facts) && truth.facts.every(fact => exact(fact, TRUTH_FACT_KEYS))
    && Array.isArray(truth.allowedClaims) && truth.allowedClaims.every(claim => exact(claim, TRUTH_CLAIM_KEYS))
    && Array.isArray(truth.unresolvedUncertainties) && truth.unresolvedUncertainties.every(item => exact(item, UNCERTAINTY_KEYS))
    && Array.isArray(truth.unresolvedContradictions) && truth.unresolvedContradictions.every(item => exact(item, CONTRADICTION_KEYS))
    && Array.isArray(truth.exclusions) && truth.exclusions.every(item => exact(item, EXCLUSION_KEYS))
    && exact(assessment, ASSESSMENT_KEYS)
    && Array.isArray(assessment.assetAssessments) && assessment.assetAssessments.every(item => exact(item, ASSET_ASSESSMENT_KEYS));
}

function strictContinuityShape(value: unknown): value is GlobalContinuityState {
  if (!exact(value, CONTINUITY_KEYS) || !exact(value.immutable, IMMUTABLE_KEYS)) return false;
  const immutable = value.immutable;
  return exact(immutable.handIdentity, HAND_KEYS) && exact(immutable.environment, ENVIRONMENT_KEYS)
    && exact(immutable.voiceIdentity, VOICE_KEYS);
}

function strictPlanShape(value: unknown, stateResolved: boolean): boolean {
  if (!exact(value, PLAN_KEYS) || !strictContinuityShape(value.continuity) || !Array.isArray(value.scenes)) return false;
  return value.scenes.every(scene => {
    if (!exact(scene, stateResolved ? STATE_SCENE_REQUIRED_KEYS : PLAN_SCENE_REQUIRED_KEYS, PLAN_SCENE_OPTIONAL_KEYS)) return false;
    if (!stateResolved) return true;
    return exact(scene.startState, STATE_KEYS) && exact(scene.endState, STATE_KEYS);
  });
}

function strictRiskShape(value: unknown): value is GlobalSceneRiskAssessment {
  return exact(value, RISK_KEYS) && Array.isArray(value.scenes) && value.scenes.every(scene => exact(scene, RISK_SCENE_KEYS));
}

function validCapabilityMap(value: unknown): value is ActionCapabilityMap {
  if (!record(value) || Object.keys(value).length !== ACTION_IDS.length) return false;
  return ACTION_IDS.every(action => CAPABILITY_LEVELS.includes(value[action] as CapabilityLevel));
}

/** Reuses the locked R1/R2 validators and commit gate to prove the complete durable L1 authority. */
export function validateProductFoundationV1(value: unknown): string[] {
  const issues: string[] = [];
  if (!exact(value, FOUNDATION_KEYS)) return ['shape'];
  const foundation = value as unknown as ProductFoundationV1;
  if (foundation.schemaVersion !== SCHEMA_VERSION || foundation.foundationVersion !== PRODUCT_FOUNDATION_V1) issues.push('version');
  if (!FOUNDATION_ID.test(foundation.foundationId)) issues.push('foundation_id');
  if (!nonBlank(foundation.projectId)) issues.push('project_id');
  if (!exact(foundation.productReferenceBinding, BINDING_KEYS)
    || foundation.productReferenceBinding.bindingVersion !== PRODUCT_REFERENCE_BINDING_V1
    || !strictProductShape(foundation.productReferenceBinding.product)
    || !Array.isArray(foundation.productReferenceBinding.references)
    || !foundation.productReferenceBinding.references.every(reference => exact(reference, REFERENCE_KEYS)
      && nonBlank(reference.assetId) && nonBlank(reference.mimeType)
      && typeof reference.sha256 === 'string' && SHA256.test(reference.sha256))) {
    issues.push('product_reference_binding');
    return issues;
  }
  const product = foundation.productReferenceBinding.product;
  if (validateProductInput(product).length > 0) issues.push('product');
  const references = foundation.productReferenceBinding.references;
  const productAssetIds = new Set(product.assets.map(asset => asset.assetId));
  if (references.length !== product.assets.length || new Set(references.map(reference => reference.assetId)).size !== references.length
    || references.some(reference => !productAssetIds.has(reference.assetId))) issues.push('reference_binding');
  if (!strictEvidenceShape(foundation.productEvidence)
    || validateProductEvidence(foundation.productEvidence, product).length > 0) issues.push('product_evidence');
  if (!strictContextShape(foundation.committedContext)) {
    issues.push('committed_context');
    return issues;
  }
  const context = foundation.committedContext;
  if (validateProductTruth(context.productTruth, product, foundation.productEvidence, context.sourceEvidenceVersion).length > 0) issues.push('product_truth');
  if (validateReferenceAssessment(context.referenceAssessment, product, foundation.productEvidence, context.sourceEvidenceVersion).length > 0) issues.push('reference_assessment');
  try {
    const committed = commitR2ProductContext({
      product,
      evidence: foundation.productEvidence,
      sourceEvidenceVersion: context.sourceEvidenceVersion,
      productTruth: context.productTruth,
      referenceAssessment: context.referenceAssessment
    });
    if (!same(committed, context)) issues.push('commit_binding');
  } catch {
    issues.push('commit_binding');
  }
  return issues;
}

/** Recomputes every deterministic L2 boundary and reuses the locked R3/R4/R5/R6/R7-A validators. */
export function validateSceneBlueprintV1(value: unknown, foundation: ProductFoundationV1): string[] {
  const issues: string[] = [];
  if (validateProductFoundationV1(foundation).length > 0) return ['foundation'];
  if (!exact(value, BLUEPRINT_KEYS)) return ['shape'];
  const blueprint = value as unknown as SceneBlueprintV1;
  if (blueprint.schemaVersion !== SCHEMA_VERSION || blueprint.blueprintVersion !== SCENE_BLUEPRINT_V1) issues.push('version');
  if (!BLUEPRINT_ID.test(blueprint.blueprintId)) issues.push('blueprint_id');
  if (blueprint.foundationId !== foundation.foundationId) issues.push('foundation_lineage');
  if (!exact(blueprint.creativeDirection, CREATIVE_KEYS) || validateCreativeDirectionInput(blueprint.creativeDirection).length > 0) issues.push('creative_direction');
  if (!exact(blueprint.eligibilityBinding, ELIGIBILITY_KEYS)
    || !validCapabilityMap(blueprint.eligibilityBinding.capabilityMap)
    || (blueprint.eligibilityBinding.productionEligibilityPolicy !== null
      && !isSimpleActionFastTrackPolicyV1(blueprint.eligibilityBinding.productionEligibilityPolicy))) issues.push('eligibility_binding');
  if (issues.includes('creative_direction') || issues.includes('eligibility_binding')) return issues;

  const context = foundation.committedContext;
  if (!strictContinuityShape(blueprint.continuity)
    || validateGlobalContinuityState(blueprint.continuity, context, blueprint.creativeDirection).length > 0) issues.push('continuity');
  const usable = context.referenceAssessment.assetAssessments
    .filter(item => (item.targetVisibility === 'CLEAR' || item.targetVisibility === 'PARTIAL')
      && (item.identityConfidence === 'HIGH' || item.identityConfidence === 'MEDIUM'))
    .map(item => item.assetId);
  const truth = buildPlanningTruthCatalog(context).map(item => item.id);
  if (!strictPlanShape(blueprint.globalPlan, false)
    || validatePlan(blueprint.globalPlan, context, blueprint.continuity, truth, usable).length > 0) issues.push('global_plan');

  let expectedState: StateResolved4ScenePlan | undefined;
  try { expectedState = resolveSceneStates(blueprint.globalPlan); } catch { issues.push('state_plan'); }
  if (!strictPlanShape(blueprint.statePlan, true) || !expectedState || !same(blueprint.statePlan, expectedState)) issues.push('state_plan');

  if (!strictRiskShape(blueprint.riskAssessment) || !expectedState) {
    issues.push('risk_assessment');
  } else {
    const policy = blueprint.eligibilityBinding.productionEligibilityPolicy ?? undefined;
    const expectedRisk = evaluateSceneRisk(expectedState, blueprint.eligibilityBinding.capabilityMap, policy);
    if (!same(blueprint.riskAssessment, expectedRisk) || expectedRisk.scenes.some(scene => scene.status !== 'READY')) issues.push('risk_assessment');
  }
  if (!expectedState || !same(blueprint.humanRealismPlan?.globalConstraints, HUMAN_REALISM_GLOBAL_CONSTRAINTS)
    || validateHumanRealism4ScenePlan(
      blueprint.humanRealismPlan, expectedState, blueprint.humanRealismPlan?.globalConstraints
    ).length > 0) issues.push('human_realism');
  return [...new Set(issues)];
}

/** Reuses locked L1/L2, R4.1, and R7-B validators to prove exact durable L3 lineage. */
export function validateFinalizedScriptV1(
  value: unknown,
  blueprint: SceneBlueprintV1,
  foundation: ProductFoundationV1
): string[] {
  if (validateSceneBlueprintV1(blueprint, foundation).length > 0) return ['blueprint'];
  if (!exact(value, SCRIPT_KEYS)) return ['shape'];
  const script = value as unknown as FinalizedScriptV1;
  const issues: string[] = [];
  if (script.schemaVersion !== SCHEMA_VERSION || script.scriptVersion !== FINALIZED_SCRIPT_V1) issues.push('version');
  if (!SCRIPT_ID.test(script.scriptId)) issues.push('script_id');
  if (script.blueprintId !== blueprint.blueprintId) issues.push('blueprint_lineage');

  const context = foundation.committedContext;
  const catalog = buildPlanningTruthCatalog(context);
  if (validateKeyPointPlan(script.keyPointPlan, context, blueprint.globalPlan, catalog).length > 0) issues.push('key_points');
  if (validateDialogueUpstreamBinding(
    script.dialoguePlan, context, blueprint.globalPlan, script.keyPointPlan, blueprint.creativeDirection
  ).length > 0) issues.push('dialogue');
  return [...new Set(issues)];
}
