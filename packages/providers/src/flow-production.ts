import {
  compileSceneAnchorsV1,
  validateProductionSnapshotV1,
  validateSceneAnchorAgainstSnapshot,
  validateSceneAnchorV1,
  type EffectsV1,
  GENERATED_SCENE_CANDIDATE_V1,
  type GeneratedSceneCandidateV1,
  type ProductionSnapshotV1,
  type SceneAnchorV1
} from '@mochi/contracts';
import {
  FLOW_SCENE_PROMPT_V1,
  compileFlowScenePromptV1,
  type FlowScenePromptBudgetStatus,
  type FlowScenePromptV1
} from './flow-scene-prompt.ts';

export const FLOW_PRODUCTION_REQUEST_V1 = 'FLOW_PRODUCTION_REQUEST_V1' as const;
export const FLOW_OMNI_FLASH_1_1_V1 = 'FLOW_OMNI_FLASH_1_1' as const;

export type FlowProductionRequestVersion = typeof FLOW_PRODUCTION_REQUEST_V1;
export type FlowProductionModelTarget = typeof FLOW_OMNI_FLASH_1_1_V1;

/** Provider-only resolved attachment. Its opaque value must never enter Core. */
export interface FlowReferenceBindingV1 {
  readonly sceneId: string;
  readonly logicalAssetId: string;
  readonly flowReferenceId: string;
}

export interface FlowNativeVoiceBindingV1 {
  readonly logicalVoiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1' | 'VN_MALE_SOUTH_REVIEW_V1';
  readonly flowBaseIdentity: 'Leda' | 'Achird';
  readonly flowSelection: 'SAVED_CUSTOM_IDENTITY' | 'CURRENT_DEFAULT_CUSTOMIZE_CHARACTER';
  readonly flowSavedCustomIdentityName?: 'Leda Custom';
}

export interface FlowProductionRequestV1 {
  readonly requestVersion: FlowProductionRequestVersion;
  readonly sceneId: string;
  readonly promptVersion: typeof FLOW_SCENE_PROMPT_V1;
  readonly prompt: string;
  readonly durationSeconds: 8;
  readonly aspectRatio: '9:16';
  readonly modelTarget: FlowProductionModelTarget;
  readonly referenceBindings: readonly FlowReferenceBindingV1[];
  readonly nativeVoiceBinding: FlowNativeVoiceBindingV1;
  readonly dialogue: string;
  readonly effects: EffectsV1;
  readonly promptUnicodeCharacterCount: number;
  readonly promptBudgetStatus: FlowScenePromptBudgetStatus;
}

export interface FlowGeneratedCandidateResultV1 {
  readonly sceneId: string;
  readonly candidateAssetId: string;
  /** A driver may retain a provider operation correlation only at this edge. */
  readonly providerOperationCorrelation: string;
  readonly videoArtifactReference: string;
  readonly dialogue: string;
  readonly nativeVoiceBinding: FlowNativeVoiceBindingV1;
  /** QC owns any later approval decision. */
  readonly generationStatus: 'GENERATED' | 'QC_PENDING';
}

/** The only production-generation capability. No concrete network or browser driver is supplied here. */
export interface FlowProductionDriverV1 {
  generateScene(request: FlowProductionRequestV1): Promise<FlowGeneratedCandidateResultV1>;
}

export class FlowProductionError extends Error {
  readonly code:
    | 'INVALID_SCENE_ANCHOR' | 'UNSUPPORTED_VOICE_IDENTITY' | 'REFERENCE_BINDING_INVALID'
    | 'PROMPT_BUDGET_EXCEEDED' | 'INVALID_GENERATED_CANDIDATE' | 'INVALID_SNAPSHOT';

  constructor(code: FlowProductionError['code']) {
    super(`FLOW_PRODUCTION_ERROR:${code}`);
    this.name = 'FlowProductionError';
    this.code = code;
  }
}

const nonBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const sameOrdered = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export function resolveFlowNativeVoiceBindingV1(voiceIdentityId: string): FlowNativeVoiceBindingV1 {
  if (voiceIdentityId === 'VN_FEMALE_SOUTH_REVIEW_V1') {
    return {
      logicalVoiceIdentityId: voiceIdentityId,
      flowBaseIdentity: 'Leda',
      flowSelection: 'SAVED_CUSTOM_IDENTITY',
      flowSavedCustomIdentityName: 'Leda Custom'
    };
  }
  if (voiceIdentityId === 'VN_MALE_SOUTH_REVIEW_V1') {
    return {
      logicalVoiceIdentityId: voiceIdentityId,
      flowBaseIdentity: 'Achird',
      flowSelection: 'CURRENT_DEFAULT_CUSTOMIZE_CHARACTER'
    };
  }
  throw new FlowProductionError('UNSUPPORTED_VOICE_IDENTITY');
}

/** Resolves exact ordered logical anchor references into provider-only attachment bindings. */
export function resolveFlowReferenceBindingsV1(anchor: SceneAnchorV1, bindings: readonly FlowReferenceBindingV1[]): readonly FlowReferenceBindingV1[] {
  if (validateSceneAnchorV1(anchor).length > 0) throw new FlowProductionError('INVALID_SCENE_ANCHOR');
  if (!Array.isArray(bindings) || bindings.length !== anchor.referenceAssetIds.length) throw new FlowProductionError('REFERENCE_BINDING_INVALID');
  const logicalIds: string[] = [];
  for (const binding of bindings) {
    if (!binding || binding.sceneId !== anchor.sceneId || !nonBlank(binding.logicalAssetId) || !nonBlank(binding.flowReferenceId)) {
      throw new FlowProductionError('REFERENCE_BINDING_INVALID');
    }
    logicalIds.push(binding.logicalAssetId);
  }
  if (new Set(logicalIds).size !== logicalIds.length || !sameOrdered(logicalIds, anchor.referenceAssetIds)) {
    throw new FlowProductionError('REFERENCE_BINDING_INVALID');
  }
  return bindings.map(binding => ({ ...binding }));
}

function promptFor(anchor: SceneAnchorV1): FlowScenePromptV1 {
  try {
    const prompt = compileFlowScenePromptV1(anchor);
    if (prompt.unicodeCharacterCount > 3200) throw new FlowProductionError('PROMPT_BUDGET_EXCEEDED');
    return prompt;
  } catch (error: unknown) {
    if (error instanceof FlowProductionError) throw error;
    throw new FlowProductionError('PROMPT_BUDGET_EXCEEDED');
  }
}

/** Pure compilation only: this function cannot call a driver or any intelligence/voice provider. */
export function compileFlowProductionRequestV1(anchor: SceneAnchorV1, bindings: readonly FlowReferenceBindingV1[]): FlowProductionRequestV1 {
  if (validateSceneAnchorV1(anchor).length > 0) throw new FlowProductionError('INVALID_SCENE_ANCHOR');
  const prompt = promptFor(anchor);
  return {
    requestVersion: FLOW_PRODUCTION_REQUEST_V1,
    sceneId: anchor.sceneId,
    promptVersion: prompt.promptVersion,
    prompt: prompt.prompt,
    durationSeconds: anchor.durationSeconds,
    aspectRatio: anchor.aspectRatio,
    modelTarget: FLOW_OMNI_FLASH_1_1_V1,
    referenceBindings: resolveFlowReferenceBindingsV1(anchor, bindings),
    nativeVoiceBinding: resolveFlowNativeVoiceBindingV1(anchor.voiceIdentityId),
    dialogue: anchor.dialogue,
    effects: { sfx: 'NONE', vfx: 'NONE' },
    promptUnicodeCharacterCount: prompt.unicodeCharacterCount,
    promptBudgetStatus: prompt.budgetStatus
  };
}

/** Explicit invocation only; generated output remains a candidate awaiting QC and cannot be APPROVED here. */
export async function executeFlowProductionRequestV1(driver: FlowProductionDriverV1, request: FlowProductionRequestV1): Promise<FlowGeneratedCandidateResultV1> {
  if (!driver || typeof driver.generateScene !== 'function') throw new FlowProductionError('INVALID_GENERATED_CANDIDATE');
  const result = await driver.generateScene(request);
  if (!result || result.sceneId !== request.sceneId || !nonBlank(result.candidateAssetId)
    || !nonBlank(result.providerOperationCorrelation) || !nonBlank(result.videoArtifactReference)
    || result.dialogue !== request.dialogue || JSON.stringify(result.nativeVoiceBinding) !== JSON.stringify(request.nativeVoiceBinding)
    || !['GENERATED', 'QC_PENDING'].includes(result.generationStatus)) throw new FlowProductionError('INVALID_GENERATED_CANDIDATE');
  return { ...result, generationStatus: 'QC_PENDING' };
}

/** Drops Flow-only execution metadata before the candidate enters provider-neutral QC. */
export function mapFlowGeneratedCandidateV1(result: FlowGeneratedCandidateResultV1, request: FlowProductionRequestV1): GeneratedSceneCandidateV1 {
  if (!result || result.sceneId !== request.sceneId || result.dialogue !== request.dialogue
    || JSON.stringify(result.nativeVoiceBinding) !== JSON.stringify(request.nativeVoiceBinding)
    || result.nativeVoiceBinding.logicalVoiceIdentityId !== request.nativeVoiceBinding.logicalVoiceIdentityId
    || !nonBlank(result.candidateAssetId) || !['GENERATED', 'QC_PENDING'].includes(result.generationStatus)) {
    throw new FlowProductionError('INVALID_GENERATED_CANDIDATE');
  }
  return { candidateVersion: GENERATED_SCENE_CANDIDATE_V1, sceneId: result.sceneId, candidateAssetId: result.candidateAssetId,
    dialogue: result.dialogue, voiceIdentityId: result.nativeVoiceBinding.logicalVoiceIdentityId, lifecycleStatus: 'QC_PENDING' };
}

export type SingleSceneCanaryPreparationV1 =
  | { readonly status: 'SINGLE_SCENE_CANARY_READY_FOR_USER_AUTHORIZATION'; readonly request: FlowProductionRequestV1 }
  | { readonly status: 'SINGLE_SCENE_CANARY_BLOCKED_BY_PRE_F1_LIVE' };

/** Validates P0 -> SceneAnchor -> prompt -> provider request without invoking any driver. */
export function prepareSingleSceneCanaryV1(
  preF1Status: 'PASS' | 'BLOCKED_BY_ENVIRONMENT', snapshot: ProductionSnapshotV1,
  sceneIndex: 1 | 2 | 3 | 4, bindings: readonly FlowReferenceBindingV1[]
): SingleSceneCanaryPreparationV1 {
  if (preF1Status !== 'PASS') return { status: 'SINGLE_SCENE_CANARY_BLOCKED_BY_PRE_F1_LIVE' };
  if (validateProductionSnapshotV1(snapshot).length > 0) throw new FlowProductionError('INVALID_SNAPSHOT');
  const anchor = compileSceneAnchorsV1(snapshot)[sceneIndex - 1];
  if (!anchor || validateSceneAnchorAgainstSnapshot(anchor, snapshot).length > 0) throw new FlowProductionError('INVALID_SNAPSHOT');
  return { status: 'SINGLE_SCENE_CANARY_READY_FOR_USER_AUTHORIZATION', request: compileFlowProductionRequestV1(anchor, bindings) };
}
