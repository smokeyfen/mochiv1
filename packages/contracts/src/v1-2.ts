import type { Global4SceneRole, SchemaVersion, VoiceIdentityId } from './index.ts';

export const PRODUCT_FOUNDATION_V1_2 = 'PRODUCT_FOUNDATION_V1_2' as const;
export const SCENE_BLUEPRINT_V1_2 = 'SCENE_BLUEPRINT_V1_2' as const;
export const FINALIZED_SCRIPT_V1_2 = 'FINALIZED_SCRIPT_V1_2' as const;
export const PRODUCTION_COMPILED_V1_2 = 'PRODUCTION_COMPILED_V1_2' as const;
export const PRODUCTION_READY_V1_2 = 'PRODUCTION_READY_V1_2' as const;
export const TWO_BEAT_ACTION_SEQUENCE_V1_2 = 'TWO_BEAT_ACTION_SEQUENCE_V1_2' as const;
export const STATE_ENGINE_V2 = 'STATE_ENGINE_V2' as const;
export const HUMAN_REALISM_V2 = 'HUMAN_REALISM_V2' as const;
export const SFX_PLAN_V2 = 'SFX_PLAN_V2' as const;
export const SCENE_EXECUTION_CONTRACT_V2 = 'SCENE_EXECUTION_CONTRACT_V2' as const;
export const PRODUCTION_SNAPSHOT_V1_2 = 'PRODUCTION_SNAPSHOT_V1_2' as const;
export const SCENE_ANCHOR_V2 = 'SCENE_ANCHOR_V2' as const;
export const FOUR_SCENE_EXECUTION_SET_V2 = 'FOUR_SCENE_EXECUTION_SET_V2' as const;
export const FOUR_SCENE_EXECUTION_AUDIT_V1_2 = 'FOUR_SCENE_EXECUTION_AUDIT_V1_2' as const;
export const MAX_SCENE_REPLAN_ATTEMPTS_V1_2 = 2 as const;

const SCHEMA_VERSION_V1_2: SchemaVersion = '1.0.0';
const SCENE_ROLES: readonly Global4SceneRole[] = ['HOOK', 'FEATURE', 'PROOF', 'CTA'];

export const REFERENCE_PURPOSES_V1_2 = [
  'CANONICAL_REVIEWED_PRODUCT_IDENTITY',
  'SUPPORTING_FEATURE',
  'SUPPORTING_FUNCTION',
  'SUPPORTING_VARIANT'
] as const;
export type ReferencePurposeV1_2 = typeof REFERENCE_PURPOSES_V1_2[number];

export interface ReferenceBindingV1_2 {
  readonly assetId: string;
  readonly purpose: ReferencePurposeV1_2;
  readonly productVariantId: string;
  readonly truthRefIds: readonly string[];
}

export interface CommercialScoreV1_2 {
  readonly purchaseTrigger: number;
  readonly productAppeal: number;
  readonly visualDemonstrability: number;
  readonly relevanceUsefulness: number;
  readonly distinctiveness: number;
}

export type ActionBeatLabelV1_2 = 'A' | 'B';
export interface SemanticPairV1_2 {
  readonly pairId: string;
  readonly order: 1 | 2;
  readonly insightId: string;
  readonly truthRefIds: readonly string[];
  readonly semanticGoal: string;
  readonly actionBeat: ActionBeatLabelV1_2;
  readonly dialogueSentenceIndex: 1 | 2;
  readonly keyPointIndex: 1 | 2;
}

export interface SeededDecisionTraceV1_2 {
  readonly creativeSeed: string;
  readonly namespace: string;
  readonly orderedCandidateIds: readonly string[];
  readonly integerWeights: readonly number[];
  readonly selectedId: string;
}

export const ACTION_IDS_V1_2 = [
  'REACH',
  'PICK_UP',
  'HOLD',
  'MOVE_CLOSER',
  'ROTATE_SLOW',
  'PLACE_DOWN',
  'OPEN',
  'CLOSE',
  'REMOVE_CAP',
  'REPLACE_CAP',
  'PRESS',
  'SWITCH_ON',
  'SWITCH_OFF',
  'POUR',
  'DISPENSE',
  'APPLY',
  'ASSEMBLE'
] as const;
export type ActionIdV1_2 = typeof ACTION_IDS_V1_2[number];
export type ActionFamilyV1_2 = 'SIMPLE_PRESENTATION' | 'FUNCTIONAL';
export type ActionCapabilityV1_2 = 'UNTESTED' | 'SAFE' | 'RISKY' | 'AVOID';
export type ActionCapabilityMapV1_2 = Readonly<Record<ActionIdV1_2, ActionCapabilityV1_2>>;
export type ProductionEligibilityV1_2 = 'NOT_AUTHORIZED' | 'V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED';

export const PRODUCTION_ELIGIBILITY_POLICY_V1_2 = {
  policyVersion: 'PRODUCTION_ELIGIBILITY_POLICY_V1_2',
  actionIds: ACTION_IDS_V1_2,
  defaultCapability: 'UNTESTED',
  authorizedEligibility: 'V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED',
  blockedCapabilities: ['AVOID'],
  requireSupportedAffordances: true,
  requireAllPerActionGates: true,
  requireSequenceCompatibility: true,
  neverPromotesUntestedToSafe: true,
  maxSceneReplanAttempts: MAX_SCENE_REPLAN_ATTEMPTS_V1_2
} as const;
export type ProductionEligibilityPolicyV1_2 = typeof PRODUCTION_ELIGIBILITY_POLICY_V1_2;

export interface ActionEligibilityEvidenceV1_2 {
  readonly productionEligibility: ProductionEligibilityV1_2;
  readonly truthEligible: boolean;
  readonly affordanceEligible: boolean;
  readonly stateEligible: boolean;
  readonly handEligible: boolean;
  readonly timingEligible: boolean;
  readonly cameraEligible: boolean;
  readonly humanRealismEligible: boolean;
  readonly riskEligible: boolean;
}

export type HandSideV1_2 = 'LEFT' | 'RIGHT';
export interface HandRequirementV1_2 {
  readonly handCount: 'ONE' | 'TWO';
  readonly hands: readonly HandSideV1_2[];
  readonly declared: true;
}

export interface AffordanceBindingV1_2 {
  readonly affordanceId: string;
  readonly truthRefIds: readonly string[];
}

export type FunctionalClosureStateV2 = 'UNKNOWN' | 'OPEN' | 'CLOSED' | 'NOT_APPLICABLE';
export type FunctionalCapStateV2 = 'UNKNOWN' | 'ATTACHED' | 'REMOVED' | 'NOT_APPLICABLE';
export type FunctionalSwitchStateV2 = 'UNKNOWN' | 'ON' | 'OFF' | 'NOT_APPLICABLE';
export type FunctionalActuatorStateV2 = 'UNKNOWN' | 'IDLE' | 'PRESSED' | 'NOT_APPLICABLE';
export type FunctionalAssemblyStateV2 = 'UNKNOWN' | 'ASSEMBLED' | 'DISASSEMBLED' | 'NOT_APPLICABLE';
export type FunctionalContentsStateV2 = 'UNKNOWN' | 'RETAINED' | 'PARTIALLY_DISPENSED' | 'DISPENSED' | 'EMPTY' | 'NOT_APPLICABLE';

export interface PhysicalStateV2 {
  readonly productVariantId: string;
  readonly productPlacement: string;
  readonly productOrientation: string;
  readonly gripContact: readonly string[];
  readonly activeHands: readonly HandSideV1_2[];
  readonly visibleComponents: readonly string[];
  readonly containedMaterial: string;
}

export interface FunctionalStateV2 {
  readonly closure: FunctionalClosureStateV2;
  readonly cap: FunctionalCapStateV2;
  readonly switch: FunctionalSwitchStateV2;
  readonly actuator: FunctionalActuatorStateV2;
  readonly assembly: FunctionalAssemblyStateV2;
  readonly contents: FunctionalContentsStateV2;
}

export interface FunctionalPhysicalStateV2 {
  readonly physical: PhysicalStateV2;
  readonly functional: FunctionalStateV2;
}

export interface ResolvedSceneStateV2 {
  readonly start: FunctionalPhysicalStateV2;
  readonly mid: FunctionalPhysicalStateV2;
  readonly end: FunctionalPhysicalStateV2;
}

export interface ActionTimingV1_2 {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly targetDurationSeconds: number;
}

export type CameraDistanceV2 = 'CLOSE' | 'MEDIUM';
export type CameraAngleV2 = 'FRONT' | 'THREE_QUARTER' | 'TOP_DOWN';
export type CameraBehaviorV2 = 'STATIC_HANDHELD' | 'SUBTLE_PUSH_IN' | 'SUBTLE_REFRAME' | 'SUBTLE_HANDHELD_DRIFT';
export interface CameraFocusV2 {
  readonly distance: CameraDistanceV2;
  readonly angle: CameraAngleV2;
  readonly focusTarget: string;
  readonly cameraBehavior: CameraBehaviorV2;
  readonly actionVisible: true;
  readonly continuousTake: true;
  readonly stateHidingCut: false;
}

export interface HumanRealismBeatV2 {
  readonly realismVersion: typeof HUMAN_REALISM_V2;
  readonly approach: string;
  readonly gripAndContact: string;
  readonly forceAndTiming: string;
  readonly microAdjustment: string;
  readonly completionAndSettle: string;
  readonly cameraCoordination: string;
  readonly preservesDeclaredHands: true;
  readonly preservesStateTransition: true;
}

export type SfxEventKindV2 = 'CONTACT' | 'CLICK' | 'PRESS' | 'POUR' | 'DISPENSE' | 'APPLICATION' | 'ASSEMBLY';
export interface SfxEventV2 {
  readonly eventId: string;
  readonly kind: SfxEventKindV2;
  readonly actionBeat: ActionBeatLabelV1_2;
  readonly visibleCause: string;
  readonly intensity: 'RESTRAINED';
}
export interface SfxBeatV2 {
  readonly sfxVersion: typeof SFX_PLAN_V2;
  readonly mode: 'NONE' | 'GROUNDED';
  readonly events: readonly SfxEventV2[];
  readonly actionBeat: ActionBeatLabelV1_2;
}

export interface ActionBeatV1_2 {
  readonly beat: ActionBeatLabelV1_2;
  readonly order: 1 | 2;
  readonly actionId: ActionIdV1_2;
  readonly semanticPairId: string;
  readonly actionFamily: ActionFamilyV1_2;
  readonly semanticGoal: string;
  readonly handRequirement: HandRequirementV1_2;
  readonly affordanceBindings: readonly AffordanceBindingV1_2[];
  readonly capability: ActionCapabilityV1_2;
  readonly eligibility: ActionEligibilityEvidenceV1_2;
  readonly inputState: FunctionalPhysicalStateV2;
  readonly outputState: FunctionalPhysicalStateV2;
  readonly timing: ActionTimingV1_2;
  readonly cameraFocus: CameraFocusV2;
  readonly humanRealism: HumanRealismBeatV2;
  readonly sfx: SfxBeatV2;
}

export interface SequenceCompatibilityV1_2 {
  readonly status: 'PASS';
  readonly actionAId: ActionIdV1_2;
  readonly actionBId: ActionIdV1_2;
  readonly actionAOutputState: FunctionalPhysicalStateV2;
  readonly actionBInputState: FunctionalPhysicalStateV2;
  readonly exactMidStateMatch: true;
  readonly noHiddenReset: true;
  readonly noTeleportation: true;
  readonly noStateHidingCut: true;
  readonly noThirdPrimaryAction: true;
}

export interface HandoffTimingEvidenceV1_2 {
  readonly actionAStartSeconds: number;
  readonly actionAEndSeconds: number;
  readonly handoffAtSeconds: number;
  readonly actionBStartSeconds: number;
  readonly actionBEndSeconds: number;
  readonly evidence: string;
}

export interface DialogueSentenceTimingV2 {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly spokenUnitCount: number;
}
export interface DialogueSentenceV2 {
  readonly sentenceIndex: 1 | 2;
  readonly pairId: string;
  readonly actionBeat: ActionBeatLabelV1_2;
  readonly text: string;
  readonly language: 'vi-VN';
  readonly containsExactProductName: boolean;
  readonly timing: DialogueSentenceTimingV2;
}

export interface DialogueDerivedKeyPointV2 {
  readonly keyPointIndex: 1 | 2;
  readonly pairId: string;
  readonly actionBeat: ActionBeatLabelV1_2;
  readonly sentenceIndex: 1 | 2;
  readonly text: string;
  readonly sourceSentenceText: string;
  readonly derivedFromDialogue: true;
}

export interface EffectsV2 {
  readonly bgm: 'NONE';
  readonly vfx: 'NONE';
}

export interface ExecutionLineageV1_2 {
  readonly productFoundationVersion: typeof PRODUCT_FOUNDATION_V1_2;
  readonly sceneBlueprintVersion: typeof SCENE_BLUEPRINT_V1_2;
  readonly finalizedScriptVersion: typeof FINALIZED_SCRIPT_V1_2;
  readonly productionCompiledVersion: typeof PRODUCTION_COMPILED_V1_2;
  readonly productFoundationId: string;
  readonly sceneBlueprintId: string;
  readonly finalizedScriptId: string;
  readonly projectId: string;
  readonly productId: string;
  readonly productVariantId: string;
  readonly sourceEvidenceVersion: string;
  readonly creativeSeed: string;
}

export interface SceneExecutionContractV2 {
  readonly schemaVersion: SchemaVersion;
  readonly sceneExecutionContractVersion: typeof SCENE_EXECUTION_CONTRACT_V2;
  readonly actionSequenceVersion: typeof TWO_BEAT_ACTION_SEQUENCE_V1_2;
  readonly stateEngineVersion: typeof STATE_ENGINE_V2;
  readonly humanRealismVersion: typeof HUMAN_REALISM_V2;
  readonly sfxPlanVersion: typeof SFX_PLAN_V2;
  readonly lineage: ExecutionLineageV1_2;
  readonly sceneId: string;
  readonly index: 1 | 2 | 3 | 4;
  readonly role: Global4SceneRole;
  readonly durationSeconds: 8;
  readonly aspectRatio: '9:16';
  readonly cameraFamily: 'SMARTPHONE_POV';
  readonly reviewerFaceVisibility: 'FORBIDDEN';
  readonly productName: string;
  readonly voiceIdentityId: VoiceIdentityId;
  readonly creativeSeed: string;
  readonly seededDecisionTraces: readonly SeededDecisionTraceV1_2[];
  readonly referenceBindings: readonly ReferenceBindingV1_2[];
  readonly semanticPairs: readonly [SemanticPairV1_2, SemanticPairV1_2];
  readonly states: ResolvedSceneStateV2;
  readonly actionBeats: readonly [ActionBeatV1_2, ActionBeatV1_2];
  readonly sequenceCompatibility: SequenceCompatibilityV1_2;
  readonly handoffTiming: HandoffTimingEvidenceV1_2;
  readonly dialogueSentences: readonly [DialogueSentenceV2, DialogueSentenceV2];
  readonly keyPoints: readonly [DialogueDerivedKeyPointV2, DialogueDerivedKeyPointV2];
  readonly effects: EffectsV2;
}

export interface FourSceneExecutionSetV2 {
  readonly schemaVersion: SchemaVersion;
  readonly executionSetVersion: typeof FOUR_SCENE_EXECUTION_SET_V2;
  readonly lineage: ExecutionLineageV1_2;
  readonly productName: string;
  readonly scenes: readonly [SceneExecutionContractV2, SceneExecutionContractV2, SceneExecutionContractV2, SceneExecutionContractV2];
}

export interface ProductionContractV1_2 {
  readonly schemaVersion: SchemaVersion;
  readonly productionCompiledVersion: typeof PRODUCTION_COMPILED_V1_2;
  readonly lineage: ExecutionLineageV1_2;
  readonly productName: string;
  readonly scenes: FourSceneExecutionSetV2['scenes'];
}

export interface ProductionSnapshotV1_2 {
  readonly schemaVersion: SchemaVersion;
  readonly snapshotVersion: typeof PRODUCTION_SNAPSHOT_V1_2;
  readonly snapshotId: string;
  readonly projectId: string;
  readonly productId: string;
  readonly lineage: ExecutionLineageV1_2;
  readonly productionContract: ProductionContractV1_2;
}

export interface SceneAnchorV2 {
  readonly schemaVersion: SchemaVersion;
  readonly sceneAnchorVersion: typeof SCENE_ANCHOR_V2;
  readonly snapshotId: string;
  readonly lineage: ExecutionLineageV1_2;
  readonly scene: SceneExecutionContractV2;
}

export interface FourSceneAuditResultV1_2 {
  readonly auditVersion: typeof FOUR_SCENE_EXECUTION_AUDIT_V1_2;
  readonly status: 'PASS' | 'FAIL';
  readonly issues: readonly string[];
}

const commercialScoreKeys = ['purchaseTrigger', 'productAppeal', 'visualDemonstrability', 'relevanceUsefulness', 'distinctiveness'] as const;
const referenceBindingKeys = ['assetId', 'purpose', 'productVariantId', 'truthRefIds'] as const;
const semanticPairKeys = ['pairId', 'order', 'insightId', 'truthRefIds', 'semanticGoal', 'actionBeat', 'dialogueSentenceIndex', 'keyPointIndex'] as const;
const seededDecisionKeys = ['creativeSeed', 'namespace', 'orderedCandidateIds', 'integerWeights', 'selectedId'] as const;
const policyKeys = ['policyVersion', 'actionIds', 'defaultCapability', 'authorizedEligibility', 'blockedCapabilities', 'requireSupportedAffordances', 'requireAllPerActionGates', 'requireSequenceCompatibility', 'neverPromotesUntestedToSafe', 'maxSceneReplanAttempts'] as const;
const eligibilityKeys = ['productionEligibility', 'truthEligible', 'affordanceEligible', 'stateEligible', 'handEligible', 'timingEligible', 'cameraEligible', 'humanRealismEligible', 'riskEligible'] as const;
const handRequirementKeys = ['handCount', 'hands', 'declared'] as const;
const affordanceBindingKeys = ['affordanceId', 'truthRefIds'] as const;
const stateKeys = ['physical', 'functional'] as const;
const physicalStateKeys = ['productVariantId', 'productPlacement', 'productOrientation', 'gripContact', 'activeHands', 'visibleComponents', 'containedMaterial'] as const;
const functionalStateKeys = ['closure', 'cap', 'switch', 'actuator', 'assembly', 'contents'] as const;
const resolvedStateKeys = ['start', 'mid', 'end'] as const;
const timingKeys = ['startSeconds', 'endSeconds', 'targetDurationSeconds'] as const;
const cameraFocusKeys = ['distance', 'angle', 'focusTarget', 'cameraBehavior', 'actionVisible', 'continuousTake', 'stateHidingCut'] as const;
const humanRealismKeys = ['realismVersion', 'approach', 'gripAndContact', 'forceAndTiming', 'microAdjustment', 'completionAndSettle', 'cameraCoordination', 'preservesDeclaredHands', 'preservesStateTransition'] as const;
const sfxEventKeys = ['eventId', 'kind', 'actionBeat', 'visibleCause', 'intensity'] as const;
const sfxKeys = ['sfxVersion', 'mode', 'events', 'actionBeat'] as const;
const actionBeatKeys = ['beat', 'order', 'actionId', 'semanticPairId', 'actionFamily', 'semanticGoal', 'handRequirement', 'affordanceBindings', 'capability', 'eligibility', 'inputState', 'outputState', 'timing', 'cameraFocus', 'humanRealism', 'sfx'] as const;
const sequenceCompatibilityKeys = ['status', 'actionAId', 'actionBId', 'actionAOutputState', 'actionBInputState', 'exactMidStateMatch', 'noHiddenReset', 'noTeleportation', 'noStateHidingCut', 'noThirdPrimaryAction'] as const;
const handoffKeys = ['actionAStartSeconds', 'actionAEndSeconds', 'handoffAtSeconds', 'actionBStartSeconds', 'actionBEndSeconds', 'evidence'] as const;
const dialogueTimingKeys = ['startSeconds', 'endSeconds', 'spokenUnitCount'] as const;
const dialogueSentenceKeys = ['sentenceIndex', 'pairId', 'actionBeat', 'text', 'language', 'containsExactProductName', 'timing'] as const;
const keyPointKeys = ['keyPointIndex', 'pairId', 'actionBeat', 'sentenceIndex', 'text', 'sourceSentenceText', 'derivedFromDialogue'] as const;
const effectsKeys = ['bgm', 'vfx'] as const;
const lineageKeys = ['productFoundationVersion', 'sceneBlueprintVersion', 'finalizedScriptVersion', 'productionCompiledVersion', 'productFoundationId', 'sceneBlueprintId', 'finalizedScriptId', 'projectId', 'productId', 'productVariantId', 'sourceEvidenceVersion', 'creativeSeed'] as const;
const sceneKeys = ['schemaVersion', 'sceneExecutionContractVersion', 'actionSequenceVersion', 'stateEngineVersion', 'humanRealismVersion', 'sfxPlanVersion', 'lineage', 'sceneId', 'index', 'role', 'durationSeconds', 'aspectRatio', 'cameraFamily', 'reviewerFaceVisibility', 'productName', 'voiceIdentityId', 'creativeSeed', 'seededDecisionTraces', 'referenceBindings', 'semanticPairs', 'states', 'actionBeats', 'sequenceCompatibility', 'handoffTiming', 'dialogueSentences', 'keyPoints', 'effects'] as const;
const executionSetKeys = ['schemaVersion', 'executionSetVersion', 'lineage', 'productName', 'scenes'] as const;
const productionContractKeys = ['schemaVersion', 'productionCompiledVersion', 'lineage', 'productName', 'scenes'] as const;
const productionSnapshotKeys = ['schemaVersion', 'snapshotVersion', 'snapshotId', 'projectId', 'productId', 'lineage', 'productionContract'] as const;
const sceneAnchorKeys = ['schemaVersion', 'sceneAnchorVersion', 'snapshotId', 'lineage', 'scene'] as const;

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => key in value);
}

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function allNonBlankStrings(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(nonBlank);
}

function uniqueStrings(value: readonly string[]): boolean {
  return new Set(value).size === value.length;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.includes(value as T);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue((value as Record<string, unknown>)[key])]));
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalValue(left)) === JSON.stringify(canonicalValue(right));
}

function addNested(issues: string[], prefix: string, nested: readonly string[]): void {
  for (const issue of nested) issues.push(`${prefix}.${issue}`);
}

export function validateCommercialScoreV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, commercialScoreKeys)) return ['shape'];
  return commercialScoreKeys.every(key => Number.isInteger(value[key]) && (value[key] as number) >= 0 && (value[key] as number) <= 100)
    ? [] : ['score'];
}

export function validateReferenceBindingV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, referenceBindingKeys)) return ['shape'];
  const issues: string[] = [];
  if (!nonBlank(value.assetId) || !nonBlank(value.productVariantId)) issues.push('identity');
  if (!enumValue(value.purpose, REFERENCE_PURPOSES_V1_2)) issues.push('purpose');
  if (!allNonBlankStrings(value.truthRefIds) || value.truthRefIds.length === 0 || !uniqueStrings(value.truthRefIds)) issues.push('truth_refs');
  return issues;
}

export function validateSemanticPairV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, semanticPairKeys)) return ['shape'];
  const issues: string[] = [];
  if (!nonBlank(value.pairId) || !nonBlank(value.insightId) || !nonBlank(value.semanticGoal)) issues.push('identity');
  if (!allNonBlankStrings(value.truthRefIds) || value.truthRefIds.length === 0 || !uniqueStrings(value.truthRefIds)) issues.push('truth_refs');
  if ((value.order !== 1 && value.order !== 2) || (value.actionBeat !== 'A' && value.actionBeat !== 'B')
    || (value.dialogueSentenceIndex !== 1 && value.dialogueSentenceIndex !== 2)
    || (value.keyPointIndex !== 1 && value.keyPointIndex !== 2)) issues.push('mapping');
  return issues;
}

export function validateSeededDecisionTraceV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, seededDecisionKeys)) return ['shape'];
  const issues: string[] = [];
  if (typeof value.creativeSeed !== 'string' || !/^[0-9a-f]{32}$/.test(value.creativeSeed) || !nonBlank(value.namespace)) issues.push('source');
  if (!allNonBlankStrings(value.orderedCandidateIds) || value.orderedCandidateIds.length === 0 || !uniqueStrings(value.orderedCandidateIds)) issues.push('candidates');
  if (!Array.isArray(value.integerWeights) || value.integerWeights.length !== (value.orderedCandidateIds as unknown[] | undefined)?.length
    || value.integerWeights.some(weight => !Number.isInteger(weight) || weight <= 0)) issues.push('weights');
  if (!nonBlank(value.selectedId) || !Array.isArray(value.orderedCandidateIds) || !value.orderedCandidateIds.includes(value.selectedId)) issues.push('selection');
  return issues;
}

export function validateActionCapabilityMapV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, ACTION_IDS_V1_2)) return ['shape'];
  return ACTION_IDS_V1_2.every(actionId => enumValue(value[actionId], ['UNTESTED', 'SAFE', 'RISKY', 'AVOID'] as const)) ? [] : ['capability'];
}

export function validateProductionEligibilityPolicyV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, policyKeys)) return ['shape'];
  return sameValue(value, PRODUCTION_ELIGIBILITY_POLICY_V1_2) ? [] : ['policy'];
}

export function validateActionEligibilityEvidenceV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, eligibilityKeys)) return ['shape'];
  const issues: string[] = [];
  if (!enumValue(value.productionEligibility, ['NOT_AUTHORIZED', 'V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED'] as const)) issues.push('production_eligibility');
  for (const key of eligibilityKeys.slice(1)) if (typeof value[key] !== 'boolean') issues.push(key);
  return issues;
}

export function validateHandRequirementV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, handRequirementKeys)) return ['shape'];
  if ((value.handCount !== 'ONE' && value.handCount !== 'TWO') || value.declared !== true
    || !Array.isArray(value.hands) || !value.hands.every(hand => hand === 'LEFT' || hand === 'RIGHT')
    || new Set(value.hands).size !== value.hands.length
    || value.hands.length !== (value.handCount === 'ONE' ? 1 : 2)) return ['hands'];
  return [];
}

export function validateAffordanceBindingV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, affordanceBindingKeys)) return ['shape'];
  return nonBlank(value.affordanceId) && allNonBlankStrings(value.truthRefIds) && value.truthRefIds.length > 0 && uniqueStrings(value.truthRefIds)
    ? [] : ['binding'];
}

export function validateFunctionalPhysicalStateV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, stateKeys)) return ['shape'];
  const issues: string[] = [];
  if (!hasExactKeys(value.physical, physicalStateKeys)) {
    issues.push('physical_shape');
  } else {
    const physical = value.physical;
    if (!nonBlank(physical.productVariantId) || !nonBlank(physical.productPlacement) || !nonBlank(physical.productOrientation)
      || !nonBlank(physical.containedMaterial)) issues.push('physical_identity');
    for (const key of ['gripContact', 'visibleComponents'] as const) {
      if (!allNonBlankStrings(physical[key]) || !uniqueStrings(physical[key])) issues.push(key);
    }
    if (!Array.isArray(physical.activeHands) || physical.activeHands.length > 2
      || !physical.activeHands.every(hand => hand === 'LEFT' || hand === 'RIGHT')
      || new Set(physical.activeHands).size !== physical.activeHands.length) issues.push('active_hands');
  }
  if (!hasExactKeys(value.functional, functionalStateKeys)) {
    issues.push('functional_shape');
  } else {
    const functional = value.functional;
    if (!enumValue(functional.closure, ['UNKNOWN', 'OPEN', 'CLOSED', 'NOT_APPLICABLE'] as const)) issues.push('closure');
    if (!enumValue(functional.cap, ['UNKNOWN', 'ATTACHED', 'REMOVED', 'NOT_APPLICABLE'] as const)) issues.push('cap');
    if (!enumValue(functional.switch, ['UNKNOWN', 'ON', 'OFF', 'NOT_APPLICABLE'] as const)) issues.push('switch');
    if (!enumValue(functional.actuator, ['UNKNOWN', 'IDLE', 'PRESSED', 'NOT_APPLICABLE'] as const)) issues.push('actuator');
    if (!enumValue(functional.assembly, ['UNKNOWN', 'ASSEMBLED', 'DISASSEMBLED', 'NOT_APPLICABLE'] as const)) issues.push('assembly');
    if (!enumValue(functional.contents, ['UNKNOWN', 'RETAINED', 'PARTIALLY_DISPENSED', 'DISPENSED', 'EMPTY', 'NOT_APPLICABLE'] as const)) issues.push('contents');
  }
  return issues;
}

export function validateResolvedSceneStateV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, resolvedStateKeys)) return ['shape'];
  const issues: string[] = [];
  addNested(issues, 'start', validateFunctionalPhysicalStateV2(value.start));
  addNested(issues, 'mid', validateFunctionalPhysicalStateV2(value.mid));
  addNested(issues, 'end', validateFunctionalPhysicalStateV2(value.end));
  return issues;
}

export function validateActionTimingV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, timingKeys)) return ['shape'];
  if (!finiteNumber(value.startSeconds) || !finiteNumber(value.endSeconds) || !finiteNumber(value.targetDurationSeconds)
    || value.startSeconds < 0 || value.endSeconds <= value.startSeconds
    || value.targetDurationSeconds !== value.endSeconds - value.startSeconds) return ['timing'];
  return [];
}

export function validateCameraFocusV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, cameraFocusKeys)) return ['shape'];
  if (!enumValue(value.distance, ['CLOSE', 'MEDIUM'] as const)
    || !enumValue(value.angle, ['FRONT', 'THREE_QUARTER', 'TOP_DOWN'] as const)
    || !nonBlank(value.focusTarget)
    || !enumValue(value.cameraBehavior, ['STATIC_HANDHELD', 'SUBTLE_PUSH_IN', 'SUBTLE_REFRAME', 'SUBTLE_HANDHELD_DRIFT'] as const)
    || value.actionVisible !== true || value.continuousTake !== true || value.stateHidingCut !== false) return ['camera'];
  return [];
}

export function validateHumanRealismBeatV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, humanRealismKeys)) return ['shape'];
  if (value.realismVersion !== HUMAN_REALISM_V2
    || !['approach', 'gripAndContact', 'forceAndTiming', 'microAdjustment', 'completionAndSettle', 'cameraCoordination'].every(key => nonBlank(value[key]))
    || value.preservesDeclaredHands !== true || value.preservesStateTransition !== true) return ['realism'];
  return [];
}

export function validateSfxEventV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, sfxEventKeys)) return ['shape'];
  if (!nonBlank(value.eventId) || !enumValue(value.kind, ['CONTACT', 'CLICK', 'PRESS', 'POUR', 'DISPENSE', 'APPLICATION', 'ASSEMBLY'] as const)
    || (value.actionBeat !== 'A' && value.actionBeat !== 'B') || !nonBlank(value.visibleCause) || value.intensity !== 'RESTRAINED') return ['event'];
  return [];
}

export function validateSfxBeatV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, sfxKeys)) return ['shape'];
  const issues: string[] = [];
  if (value.sfxVersion !== SFX_PLAN_V2 || (value.mode !== 'NONE' && value.mode !== 'GROUNDED') || (value.actionBeat !== 'A' && value.actionBeat !== 'B')) issues.push('fields');
  if (!Array.isArray(value.events)) return [...issues, 'events'];
  value.events.forEach((event, index) => {
    addNested(issues, `event_${index}`, validateSfxEventV2(event));
    if (hasExactKeys(event, sfxEventKeys) && event.actionBeat !== value.actionBeat) issues.push(`event_${index}.beat`);
  });
  if ((value.mode === 'NONE' && value.events.length !== 0) || (value.mode === 'GROUNDED' && value.events.length === 0)) issues.push('mode');
  return issues;
}

export function validateActionBeatV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, actionBeatKeys)) return ['shape'];
  const issues: string[] = [];
  if ((value.beat !== 'A' && value.beat !== 'B') || (value.order !== 1 && value.order !== 2)
    || !enumValue(value.actionId, ACTION_IDS_V1_2) || !enumValue(value.actionFamily, ['SIMPLE_PRESENTATION', 'FUNCTIONAL'] as const)
    || !nonBlank(value.semanticPairId) || !nonBlank(value.semanticGoal)) issues.push('identity');
  addNested(issues, 'hand', validateHandRequirementV1_2(value.handRequirement));
  if (!Array.isArray(value.affordanceBindings) || value.affordanceBindings.length === 0) issues.push('affordances');
  else value.affordanceBindings.forEach((binding, index) => addNested(issues, `affordance_${index}`, validateAffordanceBindingV1_2(binding)));
  if (!enumValue(value.capability, ['UNTESTED', 'SAFE', 'RISKY', 'AVOID'] as const)) issues.push('capability');
  addNested(issues, 'eligibility', validateActionEligibilityEvidenceV1_2(value.eligibility));
  const eligibility = value.eligibility;
  if (hasExactKeys(eligibility, eligibilityKeys)) {
    if (value.capability === 'AVOID') issues.push('avoid_blocked');
    if (eligibility.productionEligibility !== 'V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED'
      || eligibilityKeys.slice(1).some(key => eligibility[key] !== true)) issues.push('authorization');
  }
  addNested(issues, 'input_state', validateFunctionalPhysicalStateV2(value.inputState));
  addNested(issues, 'output_state', validateFunctionalPhysicalStateV2(value.outputState));
  addNested(issues, 'timing', validateActionTimingV1_2(value.timing));
  addNested(issues, 'camera', validateCameraFocusV2(value.cameraFocus));
  addNested(issues, 'realism', validateHumanRealismBeatV2(value.humanRealism));
  addNested(issues, 'sfx', validateSfxBeatV2(value.sfx));
  if (hasExactKeys(value.sfx, sfxKeys) && value.sfx.actionBeat !== value.beat) issues.push('sfx_beat');
  return issues;
}

export function validateSequenceCompatibilityV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, sequenceCompatibilityKeys)) return ['shape'];
  const issues: string[] = [];
  if (value.status !== 'PASS' || !enumValue(value.actionAId, ACTION_IDS_V1_2) || !enumValue(value.actionBId, ACTION_IDS_V1_2)) issues.push('identity');
  addNested(issues, 'action_a_output', validateFunctionalPhysicalStateV2(value.actionAOutputState));
  addNested(issues, 'action_b_input', validateFunctionalPhysicalStateV2(value.actionBInputState));
  if (!sameValue(value.actionAOutputState, value.actionBInputState) || value.exactMidStateMatch !== true
    || value.noHiddenReset !== true || value.noTeleportation !== true || value.noStateHidingCut !== true
    || value.noThirdPrimaryAction !== true) issues.push('compatibility');
  return issues;
}

export function validateHandoffTimingEvidenceV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, handoffKeys)) return ['shape'];
  const numbers = handoffKeys.slice(0, 5).map(key => value[key]);
  if (numbers.some(item => !finiteNumber(item)) || !nonBlank(value.evidence)) return ['fields'];
  const handoff = value.handoffAtSeconds as number;
  if (value.actionAStartSeconds !== 0 || value.actionBEndSeconds !== 8
    || value.actionAEndSeconds !== handoff || value.actionBStartSeconds !== handoff
    || handoff < 3.5 || handoff > 4.5) return ['handoff'];
  return [];
}

export function validateDialogueSentenceV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, dialogueSentenceKeys)) return ['shape'];
  const issues: string[] = [];
  if ((value.sentenceIndex !== 1 && value.sentenceIndex !== 2) || !nonBlank(value.pairId)
    || (value.actionBeat !== 'A' && value.actionBeat !== 'B') || !nonBlank(value.text)
    || value.language !== 'vi-VN' || typeof value.containsExactProductName !== 'boolean') issues.push('sentence');
  const timing = value.timing;
  if (!hasExactKeys(timing, dialogueTimingKeys)
    || !finiteNumber(timing.startSeconds) || !finiteNumber(timing.endSeconds)
    || timing.startSeconds < 0 || timing.endSeconds <= timing.startSeconds || timing.endSeconds > 8
    || !Number.isInteger(timing.spokenUnitCount) || typeof timing.spokenUnitCount !== 'number' || timing.spokenUnitCount <= 0) issues.push('timing');
  return issues;
}

export function validateDialogueDerivedKeyPointV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, keyPointKeys)) return ['shape'];
  if ((value.keyPointIndex !== 1 && value.keyPointIndex !== 2) || !nonBlank(value.pairId)
    || (value.actionBeat !== 'A' && value.actionBeat !== 'B') || (value.sentenceIndex !== 1 && value.sentenceIndex !== 2)
    || !nonBlank(value.text) || !nonBlank(value.sourceSentenceText) || value.derivedFromDialogue !== true) return ['key_point'];
  return [];
}

export function validateExecutionLineageV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, lineageKeys)) return ['shape'];
  const issues: string[] = [];
  if (value.productFoundationVersion !== PRODUCT_FOUNDATION_V1_2 || value.sceneBlueprintVersion !== SCENE_BLUEPRINT_V1_2
    || value.finalizedScriptVersion !== FINALIZED_SCRIPT_V1_2 || value.productionCompiledVersion !== PRODUCTION_COMPILED_V1_2) issues.push('version');
  for (const key of ['productFoundationId', 'sceneBlueprintId', 'finalizedScriptId', 'projectId', 'productId', 'productVariantId', 'sourceEvidenceVersion'] as const) {
    if (!nonBlank(value[key])) issues.push(key);
  }
  if (typeof value.creativeSeed !== 'string' || !/^[0-9a-f]{32}$/.test(value.creativeSeed)) issues.push('creative_seed');
  return issues;
}

function validateSceneMappings(scene: Record<string, unknown>, issues: string[]): void {
  const pairs = scene.semanticPairs;
  const beats = scene.actionBeats;
  const sentences = scene.dialogueSentences;
  const points = scene.keyPoints;
  if (!Array.isArray(pairs) || pairs.length !== 2) issues.push('semantic_pair_count');
  if (!Array.isArray(beats) || beats.length !== 2) issues.push('primary_action_count');
  if (!Array.isArray(sentences) || sentences.length !== 2) issues.push('dialogue_sentence_count');
  if (!Array.isArray(points) || points.length !== 2) issues.push('key_point_count');
  if (!Array.isArray(pairs) || pairs.length !== 2 || !Array.isArray(beats) || beats.length !== 2
    || !Array.isArray(sentences) || sentences.length !== 2 || !Array.isArray(points) || points.length !== 2) return;

  for (let offset = 0; offset < 2; offset += 1) {
    const expectedOrder = offset + 1;
    const expectedBeat = offset === 0 ? 'A' : 'B';
    const pair = pairs[offset];
    const beat = beats[offset];
    const sentence = sentences[offset];
    const point = points[offset];
    addNested(issues, `pair_${expectedOrder}`, validateSemanticPairV1_2(pair));
    addNested(issues, `beat_${expectedBeat}`, validateActionBeatV1_2(beat));
    addNested(issues, `sentence_${expectedOrder}`, validateDialogueSentenceV2(sentence));
    addNested(issues, `key_point_${expectedOrder}`, validateDialogueDerivedKeyPointV2(point));
    if (!hasExactKeys(pair, semanticPairKeys) || !hasExactKeys(beat, actionBeatKeys)
      || !hasExactKeys(sentence, dialogueSentenceKeys) || !hasExactKeys(point, keyPointKeys)) continue;
    if (pair.order !== expectedOrder || pair.actionBeat !== expectedBeat || pair.dialogueSentenceIndex !== expectedOrder || pair.keyPointIndex !== expectedOrder
      || beat.order !== expectedOrder || beat.beat !== expectedBeat
      || beat.semanticPairId !== pair.pairId
      || sentence.sentenceIndex !== expectedOrder || sentence.actionBeat !== expectedBeat || sentence.pairId !== pair.pairId
      || point.keyPointIndex !== expectedOrder || point.actionBeat !== expectedBeat || point.sentenceIndex !== expectedOrder || point.pairId !== pair.pairId
      || point.sourceSentenceText !== sentence.text) issues.push(`mapping_${expectedOrder}`);
    if (hasExactKeys(beat.timing, timingKeys) && hasExactKeys(sentence.timing, dialogueTimingKeys)
      && (sentence.timing.startSeconds !== beat.timing.startSeconds || sentence.timing.endSeconds !== beat.timing.endSeconds)) issues.push(`sentence_timing_${expectedOrder}`);
  }
}

export function validateSceneExecutionContractV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, sceneKeys)) return ['shape'];
  const scene = value;
  const issues: string[] = [];
  if (scene.schemaVersion !== SCHEMA_VERSION_V1_2 || scene.sceneExecutionContractVersion !== SCENE_EXECUTION_CONTRACT_V2
    || scene.actionSequenceVersion !== TWO_BEAT_ACTION_SEQUENCE_V1_2 || scene.stateEngineVersion !== STATE_ENGINE_V2
    || scene.humanRealismVersion !== HUMAN_REALISM_V2 || scene.sfxPlanVersion !== SFX_PLAN_V2) issues.push('version');
  addNested(issues, 'lineage', validateExecutionLineageV1_2(scene.lineage));
  if (!nonBlank(scene.sceneId) || !SCENE_ROLES.includes(scene.role as Global4SceneRole) || ![1, 2, 3, 4].includes(scene.index as number)
    || scene.durationSeconds !== 8 || scene.aspectRatio !== '9:16' || scene.cameraFamily !== 'SMARTPHONE_POV'
    || scene.reviewerFaceVisibility !== 'FORBIDDEN' || !nonBlank(scene.productName) || !nonBlank(scene.voiceIdentityId)) issues.push('scene_identity');
  if (!hasExactKeys(scene.lineage, lineageKeys) || scene.creativeSeed !== scene.lineage.creativeSeed) issues.push('creative_seed');
  if (!Array.isArray(scene.seededDecisionTraces) || scene.seededDecisionTraces.length === 0) issues.push('decision_traces');
  else scene.seededDecisionTraces.forEach((trace, index) => {
    addNested(issues, `decision_${index}`, validateSeededDecisionTraceV1_2(trace));
    if (hasExactKeys(trace, seededDecisionKeys) && trace.creativeSeed !== scene.creativeSeed) issues.push(`decision_${index}.creative_seed`);
  });
  if (!Array.isArray(scene.referenceBindings) || scene.referenceBindings.length === 0) issues.push('references');
  else {
    let canonicalCount = 0;
    const seen = new Set<string>();
    scene.referenceBindings.forEach((binding, index) => {
      addNested(issues, `reference_${index}`, validateReferenceBindingV1_2(binding));
      if (!hasExactKeys(binding, referenceBindingKeys)) return;
      if (binding.purpose === 'CANONICAL_REVIEWED_PRODUCT_IDENTITY') canonicalCount += 1;
      if (seen.has(binding.assetId as string)) issues.push('duplicate_reference');
      seen.add(binding.assetId as string);
      if (hasExactKeys(scene.lineage, lineageKeys) && binding.productVariantId !== scene.lineage.productVariantId) issues.push('reference_variant');
    });
    if (canonicalCount === 0) issues.push('canonical_reference_required');
  }
  validateSceneMappings(scene, issues);
  addNested(issues, 'states', validateResolvedSceneStateV2(scene.states));
  addNested(issues, 'sequence', validateSequenceCompatibilityV1_2(scene.sequenceCompatibility));
  addNested(issues, 'handoff', validateHandoffTimingEvidenceV1_2(scene.handoffTiming));
  if (!hasExactKeys(scene.effects, effectsKeys) || scene.effects.bgm !== 'NONE' || scene.effects.vfx !== 'NONE') issues.push('effects');

  if (Array.isArray(scene.actionBeats) && scene.actionBeats.length === 2 && hasExactKeys(scene.states, resolvedStateKeys)) {
    const actionA = scene.actionBeats[0];
    const actionB = scene.actionBeats[1];
    if (hasExactKeys(actionA, actionBeatKeys) && hasExactKeys(actionB, actionBeatKeys)) {
      if (!sameValue(actionA.inputState, scene.states.start) || !sameValue(actionA.outputState, scene.states.mid)
        || !sameValue(actionB.inputState, scene.states.mid) || !sameValue(actionB.outputState, scene.states.end)) issues.push('state_chain');
      if (hasExactKeys(scene.sequenceCompatibility, sequenceCompatibilityKeys)
        && (scene.sequenceCompatibility.actionAId !== actionA.actionId || scene.sequenceCompatibility.actionBId !== actionB.actionId
          || !sameValue(scene.sequenceCompatibility.actionAOutputState, scene.states.mid)
          || !sameValue(scene.sequenceCompatibility.actionBInputState, scene.states.mid))) issues.push('sequence_binding');
      if (hasExactKeys(scene.handoffTiming, handoffKeys) && hasExactKeys(actionA.timing, timingKeys) && hasExactKeys(actionB.timing, timingKeys)
        && (scene.handoffTiming.actionAStartSeconds !== actionA.timing.startSeconds
          || scene.handoffTiming.actionAEndSeconds !== actionA.timing.endSeconds
          || scene.handoffTiming.actionBStartSeconds !== actionB.timing.startSeconds
          || scene.handoffTiming.actionBEndSeconds !== actionB.timing.endSeconds)) issues.push('handoff_binding');
    }
  }
  if (scene.index === 1 && Array.isArray(scene.dialogueSentences) && scene.dialogueSentences.length === 2
    && Array.isArray(scene.keyPoints) && scene.keyPoints.length === 2) {
    const sentence = scene.dialogueSentences[0];
    const point = scene.keyPoints[0];
    if (!hasExactKeys(sentence, dialogueSentenceKeys) || sentence.containsExactProductName !== true
      || typeof sentence.text !== 'string' || typeof scene.productName !== 'string' || !sentence.text.includes(scene.productName)) issues.push('scene1_product_name_sentence');
    if (!hasExactKeys(point, keyPointKeys) || point.text !== scene.productName) issues.push('scene1_product_name_key_point');
  }
  return [...new Set(issues)];
}

function canonicalReferences(scene: Record<string, unknown>): unknown[] | undefined {
  if (!Array.isArray(scene.referenceBindings)) return undefined;
  return scene.referenceBindings.filter(binding => hasExactKeys(binding, referenceBindingKeys)
    && binding.purpose === 'CANONICAL_REVIEWED_PRODUCT_IDENTITY').map(canonicalValue);
}

function cameraDiversityIssues(scenes: readonly Record<string, unknown>[]): readonly string[] {
  const cameras: Record<string, unknown>[] = [];
  for (const scene of scenes) {
    if (!Array.isArray(scene.actionBeats)) continue;
    for (const beat of scene.actionBeats) {
      if (hasExactKeys(beat, actionBeatKeys) && hasExactKeys(beat.cameraFocus, cameraFocusKeys)) cameras.push(beat.cameraFocus);
    }
  }
  if (cameras.length !== 8) return ['camera_diversity'];
  return ['distance', 'angle', 'focusTarget', 'cameraBehavior'].some(key => new Set(cameras.map(camera => camera[key])).size < 2)
    ? ['camera_diversity'] : [];
}

export function validateFourSceneExecutionSetV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, executionSetKeys)) return ['shape'];
  const issues: string[] = [];
  if (value.schemaVersion !== SCHEMA_VERSION_V1_2 || value.executionSetVersion !== FOUR_SCENE_EXECUTION_SET_V2) issues.push('version');
  addNested(issues, 'lineage', validateExecutionLineageV1_2(value.lineage));
  if (!nonBlank(value.productName)) issues.push('product_name');
  if (!Array.isArray(value.scenes) || value.scenes.length !== 4) return [...issues, 'scene_count'];
  const scenes = value.scenes;
  let expectedCanonical: unknown[] | undefined;
  for (let offset = 0; offset < 4; offset += 1) {
    const scene = scenes[offset];
    addNested(issues, `scene_${offset + 1}`, validateSceneExecutionContractV2(scene));
    if (!hasExactKeys(scene, sceneKeys)) continue;
    if (scene.index !== offset + 1 || scene.role !== SCENE_ROLES[offset]) issues.push(`scene_${offset + 1}.order`);
    if (!sameValue(scene.lineage, value.lineage) || scene.productName !== value.productName) issues.push(`scene_${offset + 1}.lineage`);
    const references = canonicalReferences(scene);
    if (offset === 0) expectedCanonical = references;
    else if (!sameValue(references, expectedCanonical)) issues.push(`scene_${offset + 1}.canonical_references`);
    if (offset > 0) {
      const previous = scenes[offset - 1];
      if (hasExactKeys(previous, sceneKeys) && hasExactKeys(previous.states, resolvedStateKeys) && hasExactKeys(scene.states, resolvedStateKeys)
        && !sameValue(previous.states.end, scene.states.start)) issues.push(`scene_${offset}.to_${offset + 1}.state_continuity`);
    }
  }
  issues.push(...cameraDiversityIssues(scenes.filter(scene => typeof scene === 'object' && scene !== null) as Record<string, unknown>[]));
  return [...new Set(issues)];
}

export function auditFourSceneExecutionSetV2(value: unknown): FourSceneAuditResultV1_2 {
  const issues = validateFourSceneExecutionSetV2(value);
  return {
    auditVersion: FOUR_SCENE_EXECUTION_AUDIT_V1_2,
    status: issues.length === 0 ? 'PASS' : 'FAIL',
    issues
  };
}

export function validateProductionContractV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, productionContractKeys)) return ['shape'];
  const issues: string[] = [];
  if (value.schemaVersion !== SCHEMA_VERSION_V1_2 || value.productionCompiledVersion !== PRODUCTION_COMPILED_V1_2) issues.push('version');
  addNested(issues, 'lineage', validateExecutionLineageV1_2(value.lineage));
  if (!nonBlank(value.productName) || !Array.isArray(value.scenes) || value.scenes.length !== 4) return [...issues, 'scenes'];
  const set = { schemaVersion: value.schemaVersion, executionSetVersion: FOUR_SCENE_EXECUTION_SET_V2, lineage: value.lineage, productName: value.productName, scenes: value.scenes };
  addNested(issues, 'execution_set', validateFourSceneExecutionSetV2(set));
  return issues;
}

export function validateProductionSnapshotV1_2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, productionSnapshotKeys)) return ['shape'];
  const issues: string[] = [];
  if (value.schemaVersion !== SCHEMA_VERSION_V1_2 || value.snapshotVersion !== PRODUCTION_SNAPSHOT_V1_2) issues.push('version');
  if (typeof value.snapshotId !== 'string' || !/^ps12_[0-9a-f]{64}$/.test(value.snapshotId)) issues.push('snapshot_id');
  if (!nonBlank(value.projectId) || !nonBlank(value.productId)) issues.push('identity');
  addNested(issues, 'lineage', validateExecutionLineageV1_2(value.lineage));
  addNested(issues, 'production_contract', validateProductionContractV1_2(value.productionContract));
  if (hasExactKeys(value.lineage, lineageKeys) && (value.projectId !== value.lineage.projectId || value.productId !== value.lineage.productId)) issues.push('lineage_binding');
  if (hasExactKeys(value.productionContract, productionContractKeys) && !sameValue(value.productionContract.lineage, value.lineage)) issues.push('production_binding');
  return issues;
}

export function validateSceneAnchorV2(value: unknown): readonly string[] {
  if (!hasExactKeys(value, sceneAnchorKeys)) return ['shape'];
  const issues: string[] = [];
  if (value.schemaVersion !== SCHEMA_VERSION_V1_2 || value.sceneAnchorVersion !== SCENE_ANCHOR_V2
    || typeof value.snapshotId !== 'string' || !/^ps12_[0-9a-f]{64}$/.test(value.snapshotId)) issues.push('version_or_snapshot');
  addNested(issues, 'lineage', validateExecutionLineageV1_2(value.lineage));
  addNested(issues, 'scene', validateSceneExecutionContractV2(value.scene));
  if (hasExactKeys(value.scene, sceneKeys) && !sameValue(value.scene.lineage, value.lineage)) issues.push('lineage_binding');
  return issues;
}
