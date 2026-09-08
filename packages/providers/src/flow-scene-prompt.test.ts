import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SCENE_ANCHOR_V1,
  SCHEMA_VERSION,
  VISUAL_RHYTHM_V1,
  type SceneAnchorV1
} from '@mochi/contracts';
import {
  FLOW_SCENE_PROMPT_V1,
  FlowScenePromptError,
  compileFlowScenePromptV1,
  countUnicodeCodePoints
} from './flow-scene-prompt.ts';

function anchor(overrides: Partial<SceneAnchorV1> = {}): SceneAnchorV1 {
  const value: SceneAnchorV1 = {
    schemaVersion: SCHEMA_VERSION, sceneAnchorVersion: SCENE_ANCHOR_V1, snapshotId: `ps_${'a'.repeat(64)}`, projectId: 'project-1', productId: 'Mochi Original', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
    sceneId: 'product-1:scene:1', index: 1, role: 'HOOK', durationSeconds: 8, aspectRatio: '9:16', physicalObjective: 'Reveal the factual product immediately while completing the canonical pickup.', primaryAction: 'PICK_UP',
    startState: { heldBy: 'NONE', placement: 'ON_SURFACE', orientation: 'FRONT_FACING', interactionState: 'BASELINE' }, endState: { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'FRONT_FACING', interactionState: 'BASELINE' }, referenceAssetIds: ['asset-1'], dialogue: 'Mochi Original nhìn nhỏ xinh ha. 😊', voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1',
    hardContinuity: { productIdentity: { productId: 'Mochi Original', canonicalAssetIds: ['asset-1'] }, productGeometryMaterialIdentity: { canonicalReferenceAssetIds: ['asset-1'] }, handIdentity: { skinTone: 'ấm', nailStyle: 'ngắn', jewelry: 'không', dominantHand: 'RIGHT' }, environment: { location: 'bàn', surface: 'gỗ', background: 'trơn', lighting: 'mềm' }, cameraFamily: 'SMARTPHONE_POV', logicalVoiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', logicalVoiceIdentity: { voiceGender: 'FEMALE', voiceRegion: 'SOUTH', voiceStyle: 'review' } },
    softContinuity: { cameraDistance: 'CLOSE', cameraAngle: 'FRONT', crop: 'TIGHT_PRODUCT_HAND', composition: 'IMMEDIATE_CENTER_REVEAL', productScreenPosition: 'CENTER', subtleHandheldBehavior: 'SUBTLE_PUSH_IN' },
    visualRhythm: { rhythmVersion: VISUAL_RHYTHM_V1, presentationIntent: 'HOOK_IMMEDIATE_REVEAL', energy: 'HIGH', primaryActionTiming: 'EARLY', presentationBeats: ['FRAMING_REVEAL', 'HERO_PRESENT'], cameraBehavior: 'SUBTLE_PUSH_IN', exactlyOneCanonicalPrimaryAction: true, atMostOneStateChangingPhysicalAction: true, presentationOnly: true, noAdditionalProductStateTransition: true, noSecondHandProductContactEvent: true, noNewGripOrContactEvent: true, noNewPropInteraction: true, noCapOpening: true, noDispensing: true, noUncontractedCutOrReset: true },
    effects: { sfx: 'NONE', vfx: 'NONE' }
  };
  return { ...value, ...overrides };
}

function fourSceneFixtureAnchors(): readonly SceneAnchorV1[] {
  const definitions = [
    { role: 'HOOK' as const, action: 'PICK_UP' as const, dialogue: 'Mochi Original mở đầu nha.', intent: 'HOOK_IMMEDIATE_REVEAL' as const, energy: 'HIGH' as const, timing: 'EARLY' as const, beats: ['FRAMING_REVEAL', 'HERO_PRESENT'] as const, camera: 'SUBTLE_PUSH_IN' as const, composition: 'IMMEDIATE_CENTER_REVEAL' as const, position: 'CENTER' as const, angle: 'FRONT' as const, distance: 'CLOSE' as const, crop: 'TIGHT_PRODUCT_HAND' as const, start: { heldBy: 'NONE', placement: 'ON_SURFACE', orientation: 'FRONT_FACING', interactionState: 'BASELINE' } as const, end: { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'FRONT_FACING', interactionState: 'BASELINE' } as const },
    { role: 'FEATURE' as const, action: 'HOLD' as const, dialogue: 'Cầm gọn tay nè.', intent: 'FEATURE_CONTROLLED_DETAIL' as const, energy: 'MODERATE' as const, timing: 'CONTROLLED' as const, beats: ['FRAMING_REVEAL', 'DETAIL_EMPHASIS'] as const, camera: 'SUBTLE_PARALLAX' as const, composition: 'DETAIL_LED' as const, position: 'CENTER_RIGHT' as const, angle: 'THREE_QUARTER' as const, distance: 'CLOSE' as const, crop: 'TIGHT_PRODUCT_HAND' as const, start: { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'ROTATED', interactionState: 'BASELINE' } as const, end: { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'ROTATED', interactionState: 'BASELINE' } as const },
    { role: 'PROOF' as const, action: 'ROTATE_SLOW' as const, dialogue: 'Xoay nhẹ để xem rõ nha.', intent: 'PROOF_STABLE_INSPECTION' as const, energy: 'LOW' as const, timing: 'STEADY' as const, beats: ['DETAIL_EMPHASIS', 'STABLE_PRESENTATION'] as const, camera: 'NONE' as const, composition: 'STABLE_INSPECTION' as const, position: 'CENTER' as const, angle: 'THREE_QUARTER' as const, distance: 'MEDIUM' as const, crop: 'PRODUCT_HAND_CONTEXT' as const, start: { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'FRONT_FACING', interactionState: 'BASELINE' } as const, end: { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'ROTATED', interactionState: 'BASELINE' } as const },
    { role: 'CTA' as const, action: 'PLACE_DOWN' as const, dialogue: 'Mochi Original rất gọn.', intent: 'CTA_CLEAN_HERO' as const, energy: 'MODERATE' as const, timing: 'CONTROLLED' as const, beats: ['HERO_PRESENT', 'ACTION_SETTLE'] as const, camera: 'SUBTLE_HANDHELD_DRIFT' as const, composition: 'CLEAN_HERO' as const, position: 'CENTER' as const, angle: 'FRONT' as const, distance: 'MEDIUM' as const, crop: 'PRODUCT_HAND_CONTEXT' as const, start: { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'ROTATED', interactionState: 'BASELINE' } as const, end: { heldBy: 'NONE', placement: 'ON_SURFACE', orientation: 'ROTATED', interactionState: 'BASELINE' } as const }
  ];
  return definitions.map((definition, index) => anchor({
    productId: 'product-1', sceneId: `product-1:scene:${index + 1}`, index: (index + 1) as 1 | 2 | 3 | 4,
    role: definition.role, primaryAction: definition.action, physicalObjective: `objective ${index + 1}`,
    dialogue: definition.dialogue, startState: definition.start, endState: definition.end,
    hardContinuity: { ...anchor().hardContinuity, productIdentity: { productId: 'product-1', canonicalAssetIds: ['asset-1'] } },
    softContinuity: { cameraDistance: definition.distance, cameraAngle: definition.angle, crop: definition.crop, composition: definition.composition, productScreenPosition: definition.position, subtleHandheldBehavior: definition.camera },
    visualRhythm: { ...anchor().visualRhythm, presentationIntent: definition.intent, energy: definition.energy, primaryActionTiming: definition.timing, presentationBeats: definition.beats, cameraBehavior: definition.camera }
  }));
}

test('Flow scene prompt compiler is pure, concise, exact about dialogue, and counts Unicode code points', () => {
  const source = anchor(); const before = structuredClone(source);
  const result = compileFlowScenePromptV1(source);
  assert.equal(result.promptVersion, FLOW_SCENE_PROMPT_V1);
  assert.equal(result.sceneId, source.sceneId);
  assert.equal(result.unicodeCharacterCount, countUnicodeCodePoints(result.prompt));
  assert.ok(result.unicodeCharacterCount <= 2800);
  assert.equal(result.budgetStatus, 'TARGET');
  assert.ok(result.prompt.includes(source.dialogue));
  assert.ok(result.prompt.includes('exactly one canonical primary physical action: PICK_UP'));
  assert.doesNotMatch(result.prompt, /\{"|productionContract|sceneAnchorVersion|snapshotId/i);
  assert.deepEqual(source, before);
  assert.equal(countUnicodeCodePoints('Việt 😊'), 6);
});

test('ordinary four-scene fixture reports exact Unicode counts within the target budget', () => {
  const compiled = fourSceneFixtureAnchors().map(compileFlowScenePromptV1);
  assert.deepEqual(compiled.map(item => item.unicodeCharacterCount), [1089, 1077, 1094, 1080]);
  assert.deepEqual(compiled.map(item => item.budgetStatus), ['TARGET', 'TARGET', 'TARGET', 'TARGET']);
  assert.ok(compiled.every(item => item.unicodeCharacterCount === countUnicodeCodePoints(item.prompt)));
});

test('deterministic compaction preserves dialogue, action and state meaning without truncation', () => {
  const verbose = anchor({ physicalObjective: `Optional verbose prose ${'x'.repeat(3000)}` });
  const result = compileFlowScenePromptV1(verbose);
  assert.equal(result.budgetStatus, 'COMPACTED_TARGET');
  assert.ok(result.prompt.includes(verbose.dialogue));
  assert.ok(result.prompt.includes(`Action: exactly ${verbose.primaryAction}.`));
  assert.ok(result.prompt.includes('NONE; ON_SURFACE; FRONT_FACING; BASELINE -> RIGHT_HAND; IN_HAND; FRONT_FACING; BASELINE'));
  assert.equal(result.prompt.includes(verbose.physicalObjective), false);
  assert.equal(result.unicodeCharacterCount, countUnicodeCodePoints(result.prompt));
});

test('headroom is explicit and over-budget prompt fails closed after compaction', () => {
  const headroom = anchor({ dialogue: `Nói chính xác ${'ạ'.repeat(2500)}` });
  const result = compileFlowScenePromptV1(headroom);
  assert.equal(result.budgetStatus, 'HEADROOM');
  assert.ok(result.unicodeCharacterCount > 2800 && result.unicodeCharacterCount <= 3200);
  assert.ok(result.prompt.includes(headroom.dialogue));
  const overBudget = anchor({ dialogue: `Nói chính xác ${'ạ'.repeat(3300)}` });
  assert.throws(() => compileFlowScenePromptV1(overBudget), (error: unknown) => error instanceof FlowScenePromptError && error.code === 'PROMPT_BUDGET_EXCEEDED');
});

test('provider-edge source contains no HTTP, browser, Gemini, Flow generation, or credential access', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('./flow-scene-prompt.ts', import.meta.url), 'utf8'));
  assert.doesNotMatch(source, /fetch\(|playwright|Gemini|generate\(/i);
});
