import {
  SCENE_ANCHOR_V1,
  type SceneAnchorV1,
  validateSceneAnchorV1
} from '@mochi/contracts';

export const FLOW_SCENE_PROMPT_V1 = 'FLOW_SCENE_PROMPT_V1' as const;
export type FlowScenePromptVersion = typeof FLOW_SCENE_PROMPT_V1;
export type FlowScenePromptBudgetStatus = 'TARGET' | 'COMPACTED_TARGET' | 'HEADROOM';

export interface FlowScenePromptV1 {
  promptVersion: FlowScenePromptVersion;
  sceneId: string;
  prompt: string;
  unicodeCharacterCount: number;
  budgetStatus: FlowScenePromptBudgetStatus;
}

export class FlowScenePromptError extends Error {
  readonly code: 'INVALID_SCENE_ANCHOR' | 'PROMPT_BUDGET_EXCEEDED';
  constructor(code: 'INVALID_SCENE_ANCHOR' | 'PROMPT_BUDGET_EXCEEDED') {
    super(`FLOW_SCENE_PROMPT_ERROR:${code}`);
    this.name = 'FlowScenePromptError';
    this.code = code;
  }
}

/** Counts Unicode code points, not UTF-16 code units. */
export const countUnicodeCodePoints = (value: string): number => Array.from(value).length;

const stateText = (state: SceneAnchorV1['startState']): string =>
  `${state.heldBy}; ${state.placement}; ${state.orientation}; ${state.interactionState}`;

const beatText: Record<SceneAnchorV1['visualRhythm']['presentationBeats'][number], string> = {
  ACTION_SETTLE: 'controlled settle',
  HERO_PRESENT: 'clean hero presentation',
  DETAIL_EMPHASIS: 'detail emphasis',
  FRAMING_REVEAL: 'immediate framing reveal',
  STABLE_PRESENTATION: 'stable readable presentation'
};
const cameraText: Record<SceneAnchorV1['visualRhythm']['cameraBehavior'], string> = {
  NONE: 'locked stable framing',
  SUBTLE_PUSH_IN: 'subtle push-in',
  SUBTLE_PARALLAX: 'subtle parallax',
  SUBTLE_HANDHELD_DRIFT: 'subtle handheld drift'
};

function fullPrompt(anchor: SceneAnchorV1): string {
  const hard = anchor.hardContinuity;
  return [
    `Create one 8-second 9:16 vertical SMARTPHONE_POV scene. No reviewer face.`,
    'The supplied product reference image(s) are authoritative for product identity, geometry, material, packaging and visible details.',
    `Scene ${anchor.index} ${anchor.role}. Physical objective: ${anchor.physicalObjective}.`,
    `Execute exactly one canonical primary physical action: ${anchor.primaryAction}.`,
    `State progression: START [${stateText(anchor.startState)}] -> END [${stateText(anchor.endState)}].`,
    `Hard continuity: preserve the supplied product references; same ${hard.handIdentity.dominantHand} hand, skin ${hard.handIdentity.skinTone}, nails ${hard.handIdentity.nailStyle}, jewelry ${hard.handIdentity.jewelry}; environment ${hard.environment.location}, ${hard.environment.surface}, ${hard.environment.background}, ${hard.environment.lighting} lighting.`,
    `Presentation: ${anchor.visualRhythm.presentationIntent}, ${anchor.visualRhythm.energy.toLowerCase()} energy, action ${anchor.visualRhythm.primaryActionTiming.toLowerCase()}; beats ${anchor.visualRhythm.presentationBeats.map(beat => beatText[beat]).join(', ')}; camera ${cameraText[anchor.visualRhythm.cameraBehavior]}.`,
    `Say this exact dialogue without alteration: ${anchor.dialogue}`,
    'One visible hand only; preserve established hand identity and continuous product contact. No second contact event, new prop interaction, cap opening, dispensing, additional product-state transition, uncontracted cut/reset, teleportation, impossible grip, or hand/product penetration.'
  ].join('\n');
}

/**
 * Deterministic semantic compaction: it removes optional prose only. Protected
 * product/reference identity, action, state, continuity, POV/no-face rules and
 * exact dialogue remain whole; no string truncation is ever used.
 */
function compactPrompt(anchor: SceneAnchorV1): string {
  const hard = anchor.hardContinuity;
  return [
    '8s, 9:16, SMARTPHONE_POV; no face. Supplied product reference image(s) are authoritative for identity, geometry, material, packaging and visible details.',
    `Action: exactly ${anchor.primaryAction}. State: ${stateText(anchor.startState)} -> ${stateText(anchor.endState)}.`,
    `Continuity: preserve supplied product references; ${hard.handIdentity.dominantHand} hand, ${hard.handIdentity.skinTone} skin, ${hard.handIdentity.nailStyle} nails, ${hard.handIdentity.jewelry} jewelry; ${hard.environment.location}/${hard.environment.surface}/${hard.environment.background}/${hard.environment.lighting}.`,
    `Presentation: ${anchor.visualRhythm.presentationIntent}; ${anchor.visualRhythm.presentationBeats.map(beat => beatText[beat]).join(', ')}; ${cameraText[anchor.visualRhythm.cameraBehavior]}.`,
    `Exact dialogue: ${anchor.dialogue}`,
    'One hand; continuous contact. No second contact, prop, cap opening, dispensing, added state change, cut/reset, teleportation, impossible grip, or penetration.'
  ].join('\n');
}

/** Pure provider-edge compiler. It performs no I/O, credential access, or provider call. */
export function compileFlowScenePromptV1(anchor: SceneAnchorV1): FlowScenePromptV1 {
  if (validateSceneAnchorV1(anchor).length > 0 || anchor.sceneAnchorVersion !== SCENE_ANCHOR_V1) {
    throw new FlowScenePromptError('INVALID_SCENE_ANCHOR');
  }
  const initial = fullPrompt(anchor);
  const initialCount = countUnicodeCodePoints(initial);
  if (initialCount <= 2800) return { promptVersion: FLOW_SCENE_PROMPT_V1, sceneId: anchor.sceneId, prompt: initial, unicodeCharacterCount: initialCount, budgetStatus: 'TARGET' };

  const compacted = compactPrompt(anchor);
  const compactedCount = countUnicodeCodePoints(compacted);
  if (compactedCount > 3200) throw new FlowScenePromptError('PROMPT_BUDGET_EXCEEDED');
  return {
    promptVersion: FLOW_SCENE_PROMPT_V1,
    sceneId: anchor.sceneId,
    prompt: compacted,
    unicodeCharacterCount: compactedCount,
    budgetStatus: compactedCount <= 2800 ? 'COMPACTED_TARGET' : 'HEADROOM'
  };
}
