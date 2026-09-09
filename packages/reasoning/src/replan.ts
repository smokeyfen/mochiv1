import {
  type ActionId,
  type DesiredStateEffect,
  type Global4ScenePlan,
  type GlobalContinuityState,
  type R2CommittedProductContext
} from '@mochi/contracts';
import {
  productionEligibleActionIds,
  type ActionCapabilityMap,
  type SimpleActionFastTrackPolicyV1
} from '@mochi/core';
import { type IntelligenceProvider } from '@mochi/providers';
import { buildPlanningTruthCatalog, validatePlan } from './planner.ts';
import { evaluateSceneRisk } from './risk.ts';
import { ACTION_SEMANTICS, resolveSceneStates } from './state.ts';

export const MAX_SCENE_REPLAN_ATTEMPTS = 2;

export class ScenePlanningBlockedError extends Error {
  readonly sceneId: string;
  readonly index: number;
  readonly reasons: readonly string[];
  readonly attempts: number;

  constructor(sceneId: string, index: number, reasons: string[], attempts: number) {
    super('SCENE_PLANNING_BLOCKED');
    this.sceneId = sceneId;
    this.index = index;
    this.reasons = reasons;
    this.attempts = attempts;
  }
}

export interface TargetedReplanDecision {
  physicalObjective: string;
  primaryAction: ActionId;
  dialogueDraft: string;
  referenceAssetIds: string[];
}

export async function targetedReplan(
  plan: Global4ScenePlan,
  context: R2CommittedProductContext,
  continuity: GlobalContinuityState,
  map: ActionCapabilityMap,
  index: number,
  intelligence: IntelligenceProvider,
  maxAttempts = MAX_SCENE_REPLAN_ATTEMPTS,
  policy?: SimpleActionFastTrackPolicyV1
): Promise<Global4ScenePlan> {
  const target = plan.scenes[index - 1];
  if (!target) throw new ScenePlanningBlockedError('unknown', index, ['scene_missing'], 0);

  const usable = context.referenceAssessment.assetAssessments
    .filter(assessment =>
      (assessment.targetVisibility === 'CLEAR' || assessment.targetVisibility === 'PARTIAL')
      && (assessment.identityConfidence === 'HIGH' || assessment.identityConfidence === 'MEDIUM'))
    .map(assessment => assessment.assetId);
  const truth = buildPlanningTruthCatalog(context).map(entry => entry.id);
  const eligibleSaferActions = productionEligibleActionIds(map, policy)
    .filter(action => ACTION_SEMANTICS[action].complexity <= ACTION_SEMANTICS[target.primaryAction].complexity);
  const stateFeasibleActions = eligibleSaferActions.filter(action => {
    const candidate = replaceTargetAction(plan, index, action);
    if (validatePlan(candidate, context, continuity, truth, usable).length > 0) return false;
    try {
      const resolved = resolveSceneStates(candidate);
      return evaluateSceneRisk(resolved, map, policy).scenes[index - 1]?.status === 'READY';
    } catch {
      return false;
    }
  });

  if (!stateFeasibleActions.length) {
    throw new ScenePlanningBlockedError(target.sceneId, index, ['no_eligible_safer_action'], 0);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let data: TargetedReplanDecision;
    try {
      data = (await intelligence.analyzeStructured<TargetedReplanDecision>({
        instruction: 'TARGETED REPLAN: structured output only.',
        inputText: JSON.stringify({
          targetScene: {
            role: target.role,
            primaryTruthRefId: target.primaryTruthRefId,
            currentPrimaryAction: target.primaryAction,
            currentPhysicalObjective: target.physicalObjective
          },
          stateFeasibleActions,
          usableReferenceAssetIds: usable
        }),
        media: [],
        outputSchema: {
          type: 'object',
          properties: {
            physicalObjective: { type: 'string' },
            primaryAction: { type: 'string', enum: stateFeasibleActions },
            dialogueDraft: { type: 'string' },
            referenceAssetIds: {
              type: 'array',
              items: { type: 'string', enum: usable },
              minItems: 1
            }
          },
          required: ['physicalObjective', 'primaryAction', 'dialogueDraft', 'referenceAssetIds'],
          additionalProperties: false
        },
        parse: value => value as TargetedReplanDecision
      })).data;
    } catch {
      throw new ScenePlanningBlockedError(target.sceneId, index, ['provider_failure'], attempt);
    }

    if (!isTargetedReplanDecision(data, stateFeasibleActions, usable)) continue;
    const next = replaceTargetScene(plan, index, data);
    if (validatePlan(next, context, continuity, truth, usable).length > 0) continue;
    try {
      if (evaluateSceneRisk(resolveSceneStates(next), map, policy).scenes[index - 1]?.status === 'READY') {
        return next;
      }
    } catch {
      // A model-authored semantic edit can still invalidate the complete plan; retry within the locked bound.
    }
  }

  throw new ScenePlanningBlockedError(target.sceneId, index, ['risk_unresolved'], maxAttempts);
}

function replaceTargetAction(plan: Global4ScenePlan, index: number, primaryAction: ActionId): Global4ScenePlan {
  return {
    ...plan,
    scenes: plan.scenes.map((scene, offset) => offset === index - 1 ? {
      ...scene,
      primaryAction,
      desiredStateEffect: ACTION_SEMANTICS[primaryAction].effect as DesiredStateEffect
    } : scene)
  };
}

function replaceTargetScene(
  plan: Global4ScenePlan,
  index: number,
  decision: TargetedReplanDecision
): Global4ScenePlan {
  return {
    ...plan,
    scenes: plan.scenes.map((scene, offset) => offset === index - 1 ? {
      ...scene,
      physicalObjective: decision.physicalObjective,
      primaryAction: decision.primaryAction,
      desiredStateEffect: ACTION_SEMANTICS[decision.primaryAction].effect as DesiredStateEffect,
      dialogueDraft: decision.dialogueDraft,
      referenceAssetIds: decision.referenceAssetIds
    } : scene)
  };
}

function isTargetedReplanDecision(
  value: unknown,
  allowed: readonly string[],
  usable: readonly string[]
): value is TargetedReplanDecision {
  if (!value || typeof value !== 'object') return false;
  const decision = value as Record<string, unknown>;
  const keys = ['physicalObjective', 'primaryAction', 'dialogueDraft', 'referenceAssetIds'];
  return Object.keys(decision).length === keys.length
    && keys.every(key => key in decision)
    && typeof decision.physicalObjective === 'string'
    && decision.physicalObjective.trim().length > 0
    && typeof decision.primaryAction === 'string'
    && allowed.includes(decision.primaryAction)
    && typeof decision.dialogueDraft === 'string'
    && decision.dialogueDraft.trim().length > 0
    && Array.isArray(decision.referenceAssetIds)
    && decision.referenceAssetIds.length > 0
    && decision.referenceAssetIds.every(assetId => typeof assetId === 'string' && usable.includes(assetId));
}
