import {
  DIALOGUE_V1,
  SCHEMA_VERSION,
  type CreativeDirectionInput,
  type DialogueInputBinding,
  type DialoguePlan,
  type Global4ScenePlan,
  type KeyPointPlan,
  type R2CommittedProductContext,
  validateCreativeDirectionInput,
  validateDialoguePlan,
  validateKeyPointPlan
} from '@mochi/contracts';
import { countVietnameseSpokenUnits, resolveV1ReviewVoiceIdentity } from '@mochi/core';
import { type IntelligenceProvider } from '@mochi/providers';
import { validateGlobalContinuityState } from './continuity.ts';
import { buildPlanningTruthCatalog, validatePlan } from './planner.ts';

export class DialogueFinalizationError extends Error {
  readonly code: 'INVALID_INPUT' | 'INVALID_MODEL_OUTPUT' | 'DIALOGUE_REJECTED' | 'PROVIDER_FAILURE';

  constructor(code: 'INVALID_INPUT' | 'INVALID_MODEL_OUTPUT' | 'DIALOGUE_REJECTED' | 'PROVIDER_FAILURE') {
    super(`DIALOGUE_FINALIZATION_ERROR:${code}`);
    this.code = code;
  }
}

export interface FinalizeDialogueRequest {
  readonly context: R2CommittedProductContext;
  readonly globalPlan: Global4ScenePlan;
  readonly keyPointPlan: KeyPointPlan;
  readonly creativeDirection: CreativeDirectionInput;
  readonly intelligence: IntelligenceProvider;
}

interface DialogueDecisionScene {
  sceneId: string;
  index: 1 | 2 | 3 | 4;
  dialogue: string;
  addressedKeyPointIndexes: readonly [1, 2];
}
interface DialogueDecision { scenes: readonly DialogueDecisionScene[]; }
interface SemanticSceneVerdict {
  coversKeyPoint1: boolean;
  coversKeyPoint2: boolean;
  introducesUnsupportedProductFact: boolean;
  naturalSouthernConversationalVietnamese: boolean;
  containsStageDirectionOrNonSpeechText: boolean;
}
interface SemanticVerdict {
  scenes: readonly SemanticSceneVerdict[];
  sameReviewerPersonaAcrossScenes: boolean;
}

const decisionKeys = ['scenes'] as const;
const decisionSceneKeys = ['sceneId', 'index', 'dialogue', 'addressedKeyPointIndexes'] as const;
const semanticKeys = ['scenes', 'sameReviewerPersonaAcrossScenes'] as const;
const semanticSceneKeys = [
  'coversKeyPoint1',
  'coversKeyPoint2',
  'introducesUnsupportedProductFact',
  'naturalSouthernConversationalVietnamese',
  'containsStageDirectionOrNonSpeechText'
] as const;

const hasExactKeys = (value: unknown, keys: readonly string[]): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => key in value);
const sameOrderedStrings = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);
const nonBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const comparableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(comparableJson).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${comparableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

export const buildDialogueGenerationInstruction = (): string =>
  'DIALOGUE FINALIZATION RULES: Return structured JSON only. Return exactly four scene decisions in the supplied order, with only sceneId, index, dialogue, and addressedKeyPointIndexes. Each addressedKeyPointIndexes value must be [1,2]. Write Vietnamese spoken dialogue only: natural Southern Vietnamese, informal authentic product-review delivery, subtle regional wording without caricature, natural reactions and sentence rhythm, and the same reviewer persona throughout. Use one concise utterance intended to fit naturally inside an 8-second scene. Do not write formal Vietnamese, announcer or commercial-narrator delivery, stage directions, quotation labels, subtitles, visual instructions, or non-speech text. Address both supplied key points in every scene. Do not invent prices, discounts, promotions, mechanisms, benefits, or any product fact outside the two supplied key points. Let HOOK express natural reaction or curiosity, FEATURE give conversational explanation, PROOF give hands-on realization, and CTA give a soft personal recommendation without hard sell. Speaker identity must not vary.';

/** Single pure authority for the exact non-source context consumed by R7-B generation. */
export function buildDialogueInputBinding(
  globalPlan: Global4ScenePlan,
  keyPointPlan: KeyPointPlan,
  creativeDirection: CreativeDirectionInput
): DialogueInputBinding {
  return {
    creative: {
      audience: creativeDirection.audience,
      reviewerPersona: creativeDirection.reviewerPersona,
      tone: creativeDirection.tone,
      voiceGender: creativeDirection.voiceGender,
      voiceRegion: creativeDirection.voiceRegion,
      voiceStyle: creativeDirection.voiceStyle
    },
    scenes: globalPlan.scenes.map((scene, offset) => ({
      sceneId: scene.sceneId,
      index: scene.index,
      role: scene.role,
      physicalObjective: scene.physicalObjective,
      primaryAction: scene.primaryAction,
      keyPoints: keyPointPlan.scenes[offset]!.keyPoints.map(point => ({
        index: point.index,
        kind: point.kind,
        truthRefId: point.truthRefId,
        text: point.text
      })) as unknown as DialogueInputBinding['scenes'][number]['keyPoints']
    })) as unknown as DialogueInputBinding['scenes']
  };
}

/** Bounded global context: no ProductTruth catalog, R4 dialogue draft, media, or runtime provider metadata. */
export function buildDialogueGenerationInputText(
  request: Pick<FinalizeDialogueRequest, 'context' | 'globalPlan' | 'keyPointPlan' | 'creativeDirection'>,
  inputBinding = buildDialogueInputBinding(request.globalPlan, request.keyPointPlan, request.creativeDirection)
): string {
  return `DIALOGUE_GENERATION_INPUT_JSON:\n${JSON.stringify({
    source: {
      productId: request.context.productId,
      sourceEvidenceVersion: request.context.sourceEvidenceVersion,
      canonicalAssetIds: request.context.canonicalAssetIds
    },
    creative: inputBinding.creative,
    scenes: inputBinding.scenes
  })}\nEND_DIALOGUE_GENERATION_INPUT_JSON.`;
}

export const buildDialogueSemanticValidationInstruction = (): string =>
  'DIALOGUE SEMANTIC VALIDATION RULES: Return structured JSON only. Return exactly four verdict objects in supplied dialogue order and one sameReviewerPersonaAcrossScenes boolean. Each scene verdict may contain only coversKeyPoint1, coversKeyPoint2, introducesUnsupportedProductFact, naturalSouthernConversationalVietnamese, and containsStageDirectionOrNonSpeechText, all booleans. Do not rewrite dialogue. Do not return suggestions, explanations, factual prose, dialogue, or any additional fields.';

/** QC receives only dialogue, its two assigned key points, role, and language/style metadata. */
export function buildDialogueSemanticValidationInputText(
  dialogue: DialoguePlan,
  keyPointPlan: KeyPointPlan,
  globalPlan: Global4ScenePlan,
  creativeDirection: CreativeDirectionInput
): string {
  return `DIALOGUE_SEMANTIC_VALIDATION_INPUT_JSON:\n${JSON.stringify({
    voice: {
      language: dialogue.language,
      voiceGender: creativeDirection.voiceGender,
      voiceRegion: creativeDirection.voiceRegion,
      voiceStyle: creativeDirection.voiceStyle
    },
    scenes: dialogue.scenes.map((scene, offset) => ({
      dialogue: scene.dialogue,
      role: globalPlan.scenes[offset]!.role,
      keyPointTexts: keyPointPlan.scenes[offset]!.keyPoints.map(point => point.text)
    }))
  })}\nEND_DIALOGUE_SEMANTIC_VALIDATION_INPUT_JSON.`;
}

export async function finalizeDialogue(request: FinalizeDialogueRequest): Promise<DialoguePlan> {
  const voiceIdentityId = validateInput(request);
  const inputBinding = buildDialogueInputBinding(request.globalPlan, request.keyPointPlan, request.creativeDirection);
  let decision: unknown;
  try {
    decision = (await request.intelligence.analyzeStructured<unknown>({
      instruction: buildDialogueGenerationInstruction(),
      inputText: buildDialogueGenerationInputText(request, inputBinding),
      media: [],
      outputSchema: generationSchema(request),
      parse: value => value
    })).data;
  } catch {
    throw new DialogueFinalizationError('PROVIDER_FAILURE');
  }
  if (!isDialogueDecision(decision, request.globalPlan)) throw new DialogueFinalizationError('INVALID_MODEL_OUTPUT');

  const dialogue = compileDialogue(request, voiceIdentityId, inputBinding, decision);
  if (validateDialoguePlan(dialogue).length > 0
    || validateDialogueUpstreamBinding(dialogue, request.context, request.globalPlan, request.keyPointPlan, request.creativeDirection).length > 0) {
    throw new DialogueFinalizationError('INVALID_MODEL_OUTPUT');
  }

  let verdict: unknown;
  try {
    verdict = (await request.intelligence.analyzeStructured<unknown>({
      instruction: buildDialogueSemanticValidationInstruction(),
      inputText: buildDialogueSemanticValidationInputText(dialogue, request.keyPointPlan, request.globalPlan, request.creativeDirection),
      media: [],
      outputSchema: semanticSchema(),
      parse: value => value
    })).data;
  } catch {
    throw new DialogueFinalizationError('PROVIDER_FAILURE');
  }
  if (!isSemanticVerdict(verdict)) throw new DialogueFinalizationError('INVALID_MODEL_OUTPUT');
  if (!acceptsSemanticVerdict(verdict)) throw new DialogueFinalizationError('DIALOGUE_REJECTED');
  return dialogue;
}

function validateInput(request: FinalizeDialogueRequest): string {
  return validateDialogueUpstreamInputs(request.context, request.globalPlan, request.keyPointPlan, request.creativeDirection);
}

function validateDialogueUpstreamInputs(
  context: R2CommittedProductContext,
  globalPlan: Global4ScenePlan,
  keyPointPlan: KeyPointPlan,
  creativeDirection: CreativeDirectionInput
): string {
  const catalog = buildPlanningTruthCatalog(context);
  const usableAssetIds = context.referenceAssessment.assetAssessments
    .filter(item => (item.targetVisibility === 'CLEAR' || item.targetVisibility === 'PARTIAL')
      && (item.identityConfidence === 'HIGH' || item.identityConfidence === 'MEDIUM'))
    .map(item => item.assetId);
  try {
    if (validateGlobalContinuityState(globalPlan.continuity, context, creativeDirection).length > 0
      || validatePlan(globalPlan, context, globalPlan.continuity, catalog.map(item => item.id), usableAssetIds).length > 0
      || validateKeyPointPlan(keyPointPlan, context, globalPlan, catalog).length > 0
      || validateCreativeDirectionInput(creativeDirection).length > 0) {
      throw new DialogueFinalizationError('INVALID_INPUT');
    }
    return resolveV1ReviewVoiceIdentity(
      'vi-VN',
      creativeDirection.voiceGender,
      creativeDirection.voiceRegion,
      creativeDirection.voiceStyle
    );
  } catch (error) {
    if (error instanceof DialogueFinalizationError) throw error;
    throw new DialogueFinalizationError('INVALID_INPUT');
  }
}

/** Pure proof that a finalized dialogue still belongs to the supplied current upstream inputs. */
export function validateDialogueUpstreamBinding(
  dialogue: DialoguePlan,
  context: R2CommittedProductContext,
  globalPlan: Global4ScenePlan,
  keyPointPlan: KeyPointPlan,
  creativeDirection: CreativeDirectionInput
): string[] {
  const issues: string[] = [];
  let voiceIdentityId: string;
  try {
    voiceIdentityId = validateDialogueUpstreamInputs(context, globalPlan, keyPointPlan, creativeDirection);
  } catch {
    return ['invalid_upstream'];
  }
  if (validateDialoguePlan(dialogue).length > 0) issues.push('dialogue_contract');
  if (dialogue.productId !== context.productId || dialogue.sourceEvidenceVersion !== context.sourceEvidenceVersion
    || !sameOrderedStrings(dialogue.canonicalAssetIds, context.canonicalAssetIds)) issues.push('source');
  if (dialogue.language !== 'vi-VN' || dialogue.voiceIdentityId !== voiceIdentityId) issues.push('voice');
  if (dialogue.scenes.length !== 4 || dialogue.scenes.some((scene, offset) =>
    scene.sceneId !== globalPlan.scenes[offset]?.sceneId || scene.index !== globalPlan.scenes[offset]?.index)) issues.push('scene_binding');
  if (comparableJson(dialogue.inputBinding) !== comparableJson(buildDialogueInputBinding(globalPlan, keyPointPlan, creativeDirection))) {
    issues.push('input_binding');
  }
  return issues;
}

function generationSchema(request: FinalizeDialogueRequest): Readonly<Record<string, unknown>> {
  return {
    type: 'object',
    properties: {
      scenes: {
        type: 'array', minItems: 4, maxItems: 4,
        items: {
          type: 'object',
          properties: {
            sceneId: { type: 'string' },
            index: { type: 'integer' },
            dialogue: { type: 'string' },
            addressedKeyPointIndexes: { type: 'array', items: { type: 'integer', enum: [1, 2] }, minItems: 2, maxItems: 2 }
          },
          required: ['sceneId', 'index', 'dialogue', 'addressedKeyPointIndexes'],
          additionalProperties: false
        }
      }
    },
    required: ['scenes'],
    additionalProperties: false
  };
}

function semanticSchema(): Readonly<Record<string, unknown>> {
  return {
    type: 'object',
    properties: {
      scenes: {
        type: 'array', minItems: 4, maxItems: 4,
        items: {
          type: 'object',
          properties: Object.fromEntries(semanticSceneKeys.map(key => [key, { type: 'boolean' }])),
          required: [...semanticSceneKeys],
          additionalProperties: false
        }
      },
      sameReviewerPersonaAcrossScenes: { type: 'boolean' }
    },
    required: ['scenes', 'sameReviewerPersonaAcrossScenes'],
    additionalProperties: false
  };
}

function isDialogueDecision(value: unknown, globalPlan: Global4ScenePlan): value is DialogueDecision {
  if (!hasExactKeys(value, decisionKeys)) return false;
  const scenes = (value as Record<string, unknown>).scenes;
  if (!Array.isArray(scenes) || scenes.length !== 4) return false;
  return scenes.every((scene, offset) => {
    const expected = globalPlan.scenes[offset];
    if (!expected || !hasExactKeys(scene, decisionSceneKeys)) return false;
    const candidate = scene as Record<string, unknown>;
    const coverage = candidate.addressedKeyPointIndexes;
    return candidate.sceneId === expected.sceneId
      && candidate.index === expected.index
      && nonBlank(candidate.dialogue)
      && Array.isArray(coverage)
      && coverage.length === 2
      && coverage[0] === 1
      && coverage[1] === 2;
  });
}

function compileDialogue(
  request: FinalizeDialogueRequest,
  voiceIdentityId: string,
  inputBinding: DialogueInputBinding,
  decision: DialogueDecision
): DialoguePlan {
  return {
    schemaVersion: SCHEMA_VERSION,
    dialogueVersion: DIALOGUE_V1,
    productId: request.context.productId,
    sourceEvidenceVersion: request.context.sourceEvidenceVersion,
    canonicalAssetIds: request.context.canonicalAssetIds,
    language: 'vi-VN',
    voiceIdentityId,
    inputBinding,
    scenes: decision.scenes.map(scene => ({
      sceneId: scene.sceneId,
      index: scene.index,
      dialogue: scene.dialogue,
      addressedKeyPointIndexes: [1, 2] as const,
      spokenUnitCount: countVietnameseSpokenUnits(scene.dialogue)
    }))
  };
}

function isSemanticVerdict(value: unknown): value is SemanticVerdict {
  if (!hasExactKeys(value, semanticKeys)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.sameReviewerPersonaAcrossScenes !== 'boolean' || !Array.isArray(record.scenes) || record.scenes.length !== 4) return false;
  return record.scenes.every(scene => hasExactKeys(scene, semanticSceneKeys)
    && semanticSceneKeys.every(key => typeof (scene as Record<string, unknown>)[key] === 'boolean'));
}

function acceptsSemanticVerdict(verdict: SemanticVerdict): boolean {
  return verdict.sameReviewerPersonaAcrossScenes && verdict.scenes.every(scene =>
    scene.coversKeyPoint1
    && scene.coversKeyPoint2
    && !scene.introducesUnsupportedProductFact
    && scene.naturalSouthernConversationalVietnamese
    && !scene.containsStageDirectionOrNonSpeechText);
}
