import {
  PRODUCTION_CONTRACT_V1,
  SCHEMA_VERSION,
  type CreativeDirectionInput,
  type DialoguePlan,
  type Global4ScenePlan,
  type HumanRealism4ScenePlan,
  type KeyPointPlan,
  type ProductionContractV1,
  type ProductionInputBinding,
  type ProductionInputBindingScene,
  type ProductionSceneContractV1,
  type R2CommittedProductContext,
  type StateResolved4ScenePlan,
  validateHumanRealism4ScenePlan,
  validateKeyPointPlan,
  validateProductionContractV1
} from '@mochi/contracts';
import { type ActionCapabilityMap } from '@mochi/core';
import { validateGlobalContinuityState } from './continuity.ts';
import { validateDialogueUpstreamBinding } from './dialogue.ts';
import { HUMAN_REALISM_GLOBAL_CONSTRAINTS } from './human-realism.ts';
import { buildPlanningTruthCatalog, validatePlan } from './planner.ts';
import { evaluateSceneRisk, type GlobalSceneRiskAssessment } from './risk.ts';
import { resolveSceneStates } from './state.ts';

export class ProductionCompilerError extends Error {
  readonly code: 'INVALID_INPUT' | 'INVALID_COMPILED_CONTRACT';
  constructor(code: 'INVALID_INPUT' | 'INVALID_COMPILED_CONTRACT') {
    super(`PRODUCTION_COMPILER_ERROR:${code}`);
    this.code = code;
  }
}

export interface CompileProductionContractRequest {
  readonly context: R2CommittedProductContext;
  readonly creativeDirection: CreativeDirectionInput;
  readonly globalPlan: Global4ScenePlan;
  readonly keyPointPlan: KeyPointPlan;
  readonly statePlan: StateResolved4ScenePlan;
  readonly riskAssessment: GlobalSceneRiskAssessment;
  readonly capabilityMap: ActionCapabilityMap;
  readonly humanRealismPlan: HumanRealism4ScenePlan;
  readonly dialoguePlan: DialoguePlan;
}

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

/** Builds the complete explicit R8 source binding. It has no model or provider dependency. */
export function buildProductionInputBinding(request: CompileProductionContractRequest): ProductionInputBinding {
  return {
    scenes: request.globalPlan.scenes.map((scene, offset) => {
      const state = request.statePlan.scenes[offset]!;
      const realism = request.humanRealismPlan.scenes[offset]!;
      const dialogue = request.dialoguePlan.scenes[offset]!;
      const keyPoints = request.keyPointPlan.scenes[offset]!.keyPoints;
      return {
        sceneId: scene.sceneId,
        index: scene.index,
        role: scene.role,
        physicalObjective: scene.physicalObjective,
        primaryAction: scene.primaryAction,
        desiredStateEffect: scene.desiredStateEffect,
        startState: state.startState,
        endState: state.endState,
        referenceAssetIds: scene.referenceAssetIds,
        keyPoints: [keyPoints[0]!, keyPoints[1]!],
        humanRealismBehavior: realism.behavior,
        dialogue: dialogue.dialogue,
        spokenUnitCount: dialogue.spokenUnitCount,
        voiceIdentityId: request.dialoguePlan.voiceIdentityId
      };
    }) as unknown as ProductionInputBinding['scenes']
  };
}

/** The sole R8 production-prompt compiler; it uses only already validated source values. */
export function compileProductionPrompt(
  context: R2CommittedProductContext,
  continuity: Global4ScenePlan['continuity'],
  constraints: HumanRealism4ScenePlan['globalConstraints'],
  scene: ProductionInputBindingScene
): string {
  return [
    `Canonical product identity: ${context.productTruth.name} (${context.productId}).`,
    'Camera family: SMARTPHONE_POV.',
    'Reviewer face: FORBIDDEN.',
    `Continuity requirements: ${JSON.stringify(continuity.immutable)}.`,
    `Scene ${scene.index} role: ${scene.role}.`,
    `Physical objective: ${scene.physicalObjective}.`,
    `Execute exactly one primary physical action: ${scene.primaryAction}.`,
    `Desired state effect: ${scene.desiredStateEffect}.`,
    `Exact canonical start state: ${JSON.stringify(scene.startState)}.`,
    `Action execution requirement: complete ${scene.primaryAction} before the scene ends.`,
    `Exact canonical end state: ${JSON.stringify(scene.endState)}.`,
    `Human realism behavior: ${JSON.stringify(scene.humanRealismBehavior)}.`,
    `Human realism global constraints: ${JSON.stringify(constraints)}.`,
    `Assigned factual anchors, in order: 1. ${scene.keyPoints[0].text} 2. ${scene.keyPoints[1].text}.`,
    'Exact Vietnamese dialogue, unchanged:',
    scene.dialogue,
    `Preserve the same logical speaker identity: ${scene.voiceIdentityId}.`,
    'Duration: exactly 8 seconds.',
    'Aspect ratio: exactly 9:16.',
    `Reference-product fidelity: match only the canonical reference assets in this exact order: ${scene.referenceAssetIds.join(', ')}.`,
    'No uncontracted cut or reset.',
    'No product teleportation.',
    'No impossible grip or hand-product penetration.',
    'Action completion has priority.'
  ].join('\n');
}

export function compileProductionContract(request: CompileProductionContractRequest): ProductionContractV1 {
  if (validateProductionUpstream(request).length > 0) throw new ProductionCompilerError('INVALID_INPUT');
  const inputBinding = buildProductionInputBinding(request);
  const output: ProductionContractV1 = {
    schemaVersion: SCHEMA_VERSION,
    productionContractVersion: PRODUCTION_CONTRACT_V1,
    productId: request.context.productId,
    sourceEvidenceVersion: request.context.sourceEvidenceVersion,
    canonicalAssetIds: request.context.canonicalAssetIds,
    continuity: request.globalPlan.continuity,
    voiceIdentityId: request.dialoguePlan.voiceIdentityId,
    humanRealismGlobalConstraints: HUMAN_REALISM_GLOBAL_CONSTRAINTS,
    inputBinding,
    scenes: inputBinding.scenes.map(scene => ({
      ...scene,
      durationSeconds: 8,
      aspectRatio: '9:16',
      productionPrompt: compileProductionPrompt(request.context, request.globalPlan.continuity, HUMAN_REALISM_GLOBAL_CONSTRAINTS, scene)
    })) as unknown as ProductionContractV1['scenes']
  };
  const compiledIssues = validateProductionContractAgainstUpstream(output, request);
  if (compiledIssues.length > 0) {
    throw new ProductionCompilerError('INVALID_COMPILED_CONTRACT');
  }
  return output;
}

/** Purely proves that an R8 contract still belongs to the supplied current upstream snapshot. */
export function validateProductionContractAgainstUpstream(
  contract: ProductionContractV1,
  request: CompileProductionContractRequest
): string[] {
  const issues = validateProductionUpstream(request);
  if (validateProductionContractV1(contract).length > 0) issues.push('contract');
  if (contract.productId !== request.context.productId
    || contract.sourceEvidenceVersion !== request.context.sourceEvidenceVersion
    || !same(contract.canonicalAssetIds, request.context.canonicalAssetIds)) issues.push('source');
  if (!same(contract.continuity, request.globalPlan.continuity)) issues.push('continuity');
  if (contract.voiceIdentityId !== request.dialoguePlan.voiceIdentityId) issues.push('voice');
  if (!same(contract.humanRealismGlobalConstraints, HUMAN_REALISM_GLOBAL_CONSTRAINTS)) issues.push('constraints');
  const expectedBinding = buildProductionInputBinding(request);
  if (!same(contract.inputBinding, expectedBinding)) issues.push('input_binding');
  if (contract.scenes.length !== 4) return [...issues, 'scene_count'];
  for (let offset = 0; offset < 4; offset += 1) {
    const scene = contract.scenes[offset];
    const binding = expectedBinding.scenes[offset];
    if (!scene || !binding || scene.sceneId !== binding.sceneId || scene.index !== binding.index
      || scene.role !== binding.role || scene.physicalObjective !== binding.physicalObjective
      || scene.primaryAction !== binding.primaryAction || scene.desiredStateEffect !== binding.desiredStateEffect
      || !same(scene.startState, binding.startState) || !same(scene.endState, binding.endState)
      || !same(scene.referenceAssetIds, binding.referenceAssetIds) || !same(scene.keyPoints, binding.keyPoints)
      || !same(scene.humanRealismBehavior, binding.humanRealismBehavior) || scene.dialogue !== binding.dialogue
      || scene.spokenUnitCount !== binding.spokenUnitCount || scene.voiceIdentityId !== binding.voiceIdentityId) {
      issues.push('scene_binding');
      continue;
    }
    if (scene.durationSeconds !== 8 || scene.aspectRatio !== '9:16') issues.push('format');
    if (scene.productionPrompt !== compileProductionPrompt(request.context, request.globalPlan.continuity, HUMAN_REALISM_GLOBAL_CONSTRAINTS, binding)) issues.push('prompt');
  }
  return issues;
}

function validateProductionUpstream(request: CompileProductionContractRequest): string[] {
  const issues: string[] = [];
  const usableAssetIds = request.context.referenceAssessment.assetAssessments
    .filter(item => (item.targetVisibility === 'CLEAR' || item.targetVisibility === 'PARTIAL')
      && (item.identityConfidence === 'HIGH' || item.identityConfidence === 'MEDIUM'))
    .map(item => item.assetId);
  const catalog = buildPlanningTruthCatalog(request.context);
  if (validateGlobalContinuityState(request.globalPlan.continuity, request.context, request.creativeDirection).length > 0
    || validatePlan(request.globalPlan, request.context, request.globalPlan.continuity, catalog.map(item => item.id), usableAssetIds).length > 0) issues.push('r4');
  if (validateKeyPointPlan(request.keyPointPlan, request.context, request.globalPlan, catalog).length > 0) issues.push('r4_1');
  let resolved: StateResolved4ScenePlan;
  try { resolved = resolveSceneStates(request.globalPlan); } catch { return [...issues, 'r5']; }
  if (!same(resolved, request.statePlan)) issues.push('r5');
  const risk = evaluateSceneRisk(resolved, request.capabilityMap);
  if (!same(risk, request.riskAssessment)) issues.push('r6');
  if (risk.scenes.some(scene => scene.status !== 'READY')) issues.push('r6_not_ready');
  if (validateHumanRealism4ScenePlan(request.humanRealismPlan, resolved, HUMAN_REALISM_GLOBAL_CONSTRAINTS).length > 0) issues.push('r7_a');
  if (validateDialogueUpstreamBinding(request.dialoguePlan, request.context, request.globalPlan, request.keyPointPlan, request.creativeDirection).length > 0) issues.push('r7_b');
  return issues;
}
