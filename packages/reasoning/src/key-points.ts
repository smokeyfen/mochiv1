import {
  KEY_POINTS_V1,
  SCHEMA_VERSION,
  type Global4ScenePlan,
  type KeyPointPlan,
  type PlanningTruthCatalogEntry,
  type R2CommittedProductContext,
  validateKeyPointPlan
} from '@mochi/contracts';
import { type IntelligenceProvider } from '@mochi/providers';
import { buildPlanningTruthCatalog, validatePlan } from './planner.ts';

export class KeyPointPlanError extends Error {
  readonly code: 'INVALID_INPUT' | 'INSUFFICIENT_PLANNABLE_TRUTH' | 'INVALID_MODEL_OUTPUT' | 'PROVIDER_FAILURE';

  constructor(code: 'INVALID_INPUT' | 'INSUFFICIENT_PLANNABLE_TRUTH' | 'INVALID_MODEL_OUTPUT' | 'PROVIDER_FAILURE') {
    super(`KEY_POINT_PLAN_ERROR:${code}`);
    this.code = code;
  }
}

export interface PlanKeyPointsRequest {
  context: R2CommittedProductContext;
  globalPlan: Global4ScenePlan;
  intelligence: IntelligenceProvider;
}

interface SecondaryTruthDecision {
  secondaryTruthRefIds: readonly [string, string, string];
}

const decisionKeys = ['secondaryTruthRefIds'] as const;

/** Fixed policy: the provider selects IDs only and can never write key-point prose. */
export const buildKeyPointPlanInstruction = (): string =>
  'KEY POINTS RULES: Return structured JSON only. Return exactly three existing truth reference IDs, in order for Scene 2 Point 2, Scene 3 Point 2, and Scene 4 Point 2. Do not return product names, factual text, explanations, or any fields other than secondaryTruthRefIds. Each selected ID must differ from that scene primary ID. Scene 4 Point 2 must reuse a truth ID already established by Scenes 1 through 3 and must differ from Scene 4 primary ID.';

/**
 * Carries only provider-neutral source binding, R4 primary IDs, and canonical
 * catalog entries. Product name is intentionally absent because it is never a
 * model decision.
 */
export function buildKeyPointPlanInputText(request: Pick<PlanKeyPointsRequest, 'context' | 'globalPlan'>): string {
  const catalog = buildPlanningTruthCatalog(request.context);
  return `KEY_POINTS_INPUT_JSON:\n${JSON.stringify({
    source: {
      productId: request.context.productId,
      sourceEvidenceVersion: request.context.sourceEvidenceVersion,
      canonicalAssetIds: request.context.canonicalAssetIds
    },
    scenes: request.globalPlan.scenes.map(scene => ({
      sceneId: scene.sceneId,
      index: scene.index,
      primaryTruthRefId: scene.primaryTruthRefId
    })),
    truthCatalog: catalog
  })}\nEND_KEY_POINTS_INPUT_JSON.`;
}

export async function planKeyPoints(request: PlanKeyPointsRequest): Promise<KeyPointPlan> {
  const catalog = buildPlanningTruthCatalog(request.context) as readonly PlanningTruthCatalogEntry[];
  const catalogIds = catalog.map(item => item.id);
  const usableAssetIds = request.context.referenceAssessment.assetAssessments
    .filter(item => (item.targetVisibility === 'CLEAR' || item.targetVisibility === 'PARTIAL')
      && (item.identityConfidence === 'HIGH' || item.identityConfidence === 'MEDIUM'))
    .map(item => item.assetId);

  if (catalog.length < 3) throw new KeyPointPlanError('INSUFFICIENT_PLANNABLE_TRUTH');
  try {
    if (validatePlan(request.globalPlan, request.context, request.globalPlan.continuity, catalogIds, usableAssetIds).length > 0) {
      throw new KeyPointPlanError('INVALID_INPUT');
    }
  } catch (error) {
    if (error instanceof KeyPointPlanError) throw error;
    throw new KeyPointPlanError('INVALID_INPUT');
  }

  let decision: unknown;
  try {
    decision = (await request.intelligence.analyzeStructured<unknown>({
      instruction: buildKeyPointPlanInstruction(),
      inputText: buildKeyPointPlanInputText(request),
      media: [],
      outputSchema: {
        type: 'object',
        properties: {
          secondaryTruthRefIds: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: { type: 'string', enum: catalogIds }
          }
        },
        required: ['secondaryTruthRefIds'],
        additionalProperties: false
      },
      parse: value => value
    })).data;
  } catch {
    throw new KeyPointPlanError('PROVIDER_FAILURE');
  }
  if (!isSecondaryTruthDecision(decision)) throw new KeyPointPlanError('INVALID_MODEL_OUTPUT');

  const plan = compileKeyPointPlan(request.context, request.globalPlan, catalog, decision);
  if (validateKeyPointPlan(plan, request.context, request.globalPlan, catalog).length > 0) {
    throw new KeyPointPlanError('INVALID_MODEL_OUTPUT');
  }
  return plan;
}

function compileKeyPointPlan(
  context: R2CommittedProductContext,
  globalPlan: Global4ScenePlan,
  catalog: readonly PlanningTruthCatalogEntry[],
  decision: SecondaryTruthDecision
): KeyPointPlan {
  const textById = new Map(catalog.map(item => [item.id, item.text]));
  const truthPoint = (index: 1 | 2, truthRefId: string) => ({
    index,
    kind: 'PRODUCT_TRUTH' as const,
    truthRefId,
    text: textById.get(truthRefId) ?? ''
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    keyPointsVersion: KEY_POINTS_V1,
    productId: context.productId,
    sourceEvidenceVersion: context.sourceEvidenceVersion,
    canonicalAssetIds: context.canonicalAssetIds,
    scenes: globalPlan.scenes.map((scene, offset) => ({
      sceneId: scene.sceneId,
      index: scene.index,
      keyPoints: offset === 0
        ? [
          { index: 1 as const, kind: 'PRODUCT_NAME' as const, truthRefId: null, text: context.productTruth.name },
          truthPoint(2, scene.primaryTruthRefId)
        ]
        : [
          truthPoint(1, scene.primaryTruthRefId),
          truthPoint(2, decision.secondaryTruthRefIds[offset - 1] ?? '')
        ]
    }))
  };
}

function isSecondaryTruthDecision(value: unknown): value is SecondaryTruthDecision {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  if (Object.keys(value).length !== decisionKeys.length || !decisionKeys.every(key => key in value)) return false;
  const ids = (value as Record<string, unknown>).secondaryTruthRefIds;
  return Array.isArray(ids) && ids.length === 3 && ids.every(id => typeof id === 'string' && id.trim().length > 0);
}
