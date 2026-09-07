import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KEY_POINTS_V1,
  SCHEMA_VERSION,
  type CreativeDirectionInput,
  type Global4ScenePlan,
  type KeyPointPlan,
  type R2CommittedProductContext
} from '@mochi/contracts';
import { countVietnameseSpokenUnits } from '@mochi/core';
import { DialogueFinalizationError, finalizeDialogue } from './index.ts';

const context: R2CommittedProductContext = {
  schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
  productTruth: {
    schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
    name: 'Mochi Original', category: 'snack', identityDescription: 'Bánh mochi',
    facts: [
      { factId: 'geometry:0', kind: 'GEOMETRY', text: 'Viên bánh tròn', evidenceAssetIds: ['asset-1'] },
      { factId: 'color:0', kind: 'COLOR', text: 'Lớp áo màu trắng', evidenceAssetIds: ['asset-1'] }
    ],
    allowedClaims: [], prohibitedInferences: [], unresolvedUncertainties: [], unresolvedContradictions: [], exclusions: []
  },
  referenceAssessment: {
    schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
    assetAssessments: [{ assetId: 'asset-1', targetVisibility: 'CLEAR', identityConfidence: 'HIGH', geometryCoverage: 'STRONG', labelReadability: 'CLEAR', occlusion: 'NONE', backgroundInterference: 'LOW', multiProductAmbiguity: 'NONE' }],
    readiness: 'READY', limitationCodes: []
  }
};

const creative = (voiceGender: 'FEMALE' | 'MALE' = 'FEMALE'): CreativeDirectionInput => ({
  audience: 'người thích ăn vặt', shootingContext: 'bàn', reviewerPersona: 'người review thân thiện', tone: 'gần gũi', voiceStyle: 'review', voiceGender, voiceRegion: 'SOUTH'
});

const globalPlan = (): Global4ScenePlan => ({
  schemaVersion: SCHEMA_VERSION, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds,
  continuity: {
    schemaVersion: SCHEMA_VERSION, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds,
    immutable: {
      handIdentity: { skinTone: 'ấm', nailStyle: 'ngắn', jewelry: 'không', dominantHand: 'RIGHT' },
      environment: { location: 'bàn', surface: 'gỗ', background: 'trơn', lighting: 'mềm' }, cameraFamily: 'SMARTPHONE_POV',
      voiceIdentity: { voiceGender: 'FEMALE', voiceRegion: 'SOUTH', voiceStyle: 'review' }
    }
  },
  referenceLimitations: [], referenceReadiness: 'READY',
  scenes: [
    ['identity', 'PICK_UP', 'BECOME_HELD'], ['geometry:0', 'HOLD', 'REMAIN_HELD'], ['color:0', 'ROTATE_SLOW', 'CHANGE_ORIENTATION'], ['identity', 'PLACE_DOWN', 'BECOME_PLACED']
  ].map(([primaryTruthRefId, primaryAction, desiredStateEffect], offset) => ({
    sceneId: `${context.productId}:scene:${offset + 1}`, index: (offset + 1) as 1 | 2 | 3 | 4,
    role: ['HOOK', 'FEATURE', 'PROOF', 'CTA'][offset] as 'HOOK' | 'FEATURE' | 'PROOF' | 'CTA', durationSeconds: 8 as const, aspectRatio: '9:16' as const,
    primaryTruthRefId, physicalObjective: `mục tiêu ${offset + 1}`, primaryAction: primaryAction as Global4ScenePlan['scenes'][number]['primaryAction'], desiredStateEffect: desiredStateEffect as Global4ScenePlan['scenes'][number]['desiredStateEffect'],
    dialogueDraft: 'retired R4 dialogue draft must never travel', referenceAssetIds: ['asset-1'], ...(offset < 3 ? { transitionToNext: 'MATCH_CUT' as const } : {})
  }))
});

const keyPointPlan = (plan: Global4ScenePlan): KeyPointPlan => ({
  schemaVersion: SCHEMA_VERSION, keyPointsVersion: KEY_POINTS_V1, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds,
  scenes: plan.scenes.map((scene, offset) => ({
    sceneId: scene.sceneId, index: scene.index,
    keyPoints: offset === 0
      ? [{ index: 1 as const, kind: 'PRODUCT_NAME' as const, truthRefId: null, text: context.productTruth.name }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Bánh mochi' }]
      : offset === 1
        ? [{ index: 1 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'geometry:0', text: 'Viên bánh tròn' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Bánh mochi' }]
        : offset === 2
          ? [{ index: 1 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'color:0', text: 'Lớp áo màu trắng' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'geometry:0', text: 'Viên bánh tròn' }]
          : [{ index: 1 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Bánh mochi' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'geometry:0', text: 'Viên bánh tròn' }]
  }))
});

const generation = (plan: Global4ScenePlan) => ({ scenes: plan.scenes.map((scene, offset) => ({
  sceneId: scene.sceneId, index: scene.index, dialogue: [
    'Ủa, Mochi Original nhìn nhỏ xinh ha.', 'Viên bánh tròn cầm gọn tay nè.', 'Xoay lại thấy lớp áo màu trắng rõ luôn.', 'Mình thấy hợp để thử ăn vặt đó.'
  ][offset]!, addressedKeyPointIndexes: [1, 2]
})) });
const semanticPass = () => ({ scenes: Array.from({ length: 4 }, () => ({ coversKeyPoint1: true, coversKeyPoint2: true, introducesUnsupportedProductFact: false, naturalSouthernConversationalVietnamese: true, containsStageDirectionOrNonSpeechText: false })), sameReviewerPersonaAcrossScenes: true });

type MockCall = { instruction: string; inputText?: string; media: readonly unknown[]; outputSchema: unknown };
function mock(results: readonly unknown[], calls: MockCall[], failureAt?: number) {
  return {
    id: 'mock-intelligence',
    async analyzeStructured<T>(request: { instruction: string; inputText?: string; media: readonly unknown[]; outputSchema: unknown; parse: (value: unknown) => T }) {
      calls.push({ instruction: request.instruction, inputText: request.inputText, media: request.media, outputSchema: request.outputSchema });
      if (failureAt === calls.length) throw new Error('unavailable');
      return { data: request.parse(results[calls.length - 1]) };
    }
  };
}

function fixture(options: { generation?: unknown; semantic?: unknown; failureAt?: number; creativeDirection?: CreativeDirectionInput; global?: Global4ScenePlan; keyPoints?: KeyPointPlan; context?: R2CommittedProductContext } = {}) {
  const plan = options.global ?? globalPlan();
  const calls: MockCall[] = [];
  return {
    calls, plan,
    request: {
      context: options.context ?? context, globalPlan: plan, keyPointPlan: options.keyPoints ?? keyPointPlan(plan), creativeDirection: options.creativeDirection ?? creative(),
      intelligence: mock([options.generation ?? generation(plan), options.semantic ?? semanticPass()], calls, options.failureAt)
    }
  };
}

test('R7-B creates four bound DIALOGUE_V1 scenes in exactly two empty-media calls', async () => {
  const value = fixture();
  const output = await finalizeDialogue(value.request);
  assert.equal(value.calls.length, 2);
  assert.deepEqual(value.calls.map(call => call.media), [[], []]);
  assert.equal(output.dialogueVersion, 'DIALOGUE_V1');
  assert.equal(output.language, 'vi-VN');
  assert.equal(output.voiceIdentityId, 'VN_FEMALE_SOUTH_REVIEW_V1');
  assert.deepEqual(output.canonicalAssetIds, context.canonicalAssetIds);
  assert.deepEqual(output.scenes.map(scene => [scene.sceneId, scene.index, scene.addressedKeyPointIndexes]), value.plan.scenes.map(scene => [scene.sceneId, scene.index, [1, 2]]));
});

test('R7-B resolves only canonical South-review female and male identities before intelligence', async () => {
  for (const [gender, identity] of [['FEMALE', 'VN_FEMALE_SOUTH_REVIEW_V1'], ['MALE', 'VN_MALE_SOUTH_REVIEW_V1']] as const) {
    const value = fixture({ creativeDirection: creative(gender) });
    assert.equal((await finalizeDialogue(value.request)).voiceIdentityId, identity);
  }
  for (const invalid of [
    { ...creative(), voiceRegion: 'NORTH' as const },
    { ...creative(), voiceStyle: 'warm' }
  ]) {
    const value = fixture({ creativeDirection: invalid });
    await assert.rejects(finalizeDialogue(value.request), (error: unknown) => error instanceof DialogueFinalizationError && error.code === 'INVALID_INPUT');
    assert.equal(value.calls.length, 0);
  }
});

test('R7-B validates global/key-point source and binding before intelligence', async () => {
  for (const mutate of [
    () => fixture({ global: { ...globalPlan(), productId: 'wrong-product' } }),
    () => { const plan = globalPlan(); return fixture({ keyPoints: { ...keyPointPlan(plan), sourceEvidenceVersion: 'wrong-version' }, global: plan }); },
    () => { const plan = globalPlan(); return fixture({ keyPoints: { ...keyPointPlan(plan), scenes: keyPointPlan(plan).scenes.slice(0, 3) }, global: plan }); }
  ]) {
    const value = mutate();
    await assert.rejects(finalizeDialogue(value.request), (error: unknown) => error instanceof DialogueFinalizationError && error.code === 'INVALID_INPUT');
    assert.equal(value.calls.length, 0);
  }
});

test('R7-B generation receives only the bounded key-point scene context', async () => {
  const value = fixture();
  await finalizeDialogue(value.request);
  const input = value.calls[0]!.inputText!;
  for (const scene of value.plan.scenes) {
    assert.ok(input.includes(scene.role));
    assert.ok(input.includes(scene.physicalObjective));
    assert.ok(input.includes(scene.primaryAction));
  }
  assert.ok(input.includes('Mochi Original'));
  assert.ok(input.includes('Bánh mochi'));
  assert.equal(input.includes('retired R4 dialogue draft'), false);
  assert.equal(input.includes('truthCatalog'), false);
  assert.equal(input.includes('identityDescription'), false);
});

test('R7-B rejects every malformed or unauthorized generation decision without semantic retry', async () => {
  const plan = globalPlan();
  const valid = generation(plan);
  const variants: readonly unknown[] = [
    { scenes: valid.scenes.slice(0, 3) },
    { scenes: valid.scenes.map((scene, offset) => offset === 0 ? { ...scene, sceneId: 'wrong' } : scene) },
    { scenes: valid.scenes.map((scene, offset) => offset === 0 ? { ...scene, dialogue: '  ' } : scene) },
    { scenes: valid.scenes.map((scene, offset) => offset === 0 ? { ...scene, addressedKeyPointIndexes: [2, 1] } : scene) },
    { scenes: valid.scenes.map((scene, offset) => offset === 0 ? { ...scene, spokenUnitCount: 999 } : scene) }
  ];
  for (const invalid of variants) {
    const value = fixture({ global: plan, generation: invalid });
    await assert.rejects(finalizeDialogue(value.request), (error: unknown) => error instanceof DialogueFinalizationError && error.code === 'INVALID_MODEL_OUTPUT');
    assert.equal(value.calls.length, 1);
  }
});

test('R7-B compiles spoken units deterministically rather than accepting a model value', async () => {
  const value = fixture();
  const output = await finalizeDialogue(value.request);
  for (const scene of output.scenes) assert.equal(scene.spokenUnitCount, countVietnameseSpokenUnits(scene.dialogue));
});

test('R7-B semantic gate sees only dialogue/key-points/role/style and cannot rewrite dialogue', async () => {
  const value = fixture();
  const output = await finalizeDialogue(value.request);
  const input = value.calls[1]!.inputText!;
  assert.equal(input.includes('productId'), false);
  assert.equal(input.includes('canonicalAssetIds'), false);
  assert.equal(input.includes('physicalObjective'), false);
  assert.equal(input.includes('retired R4 dialogue draft'), false);
  assert.ok(input.includes(output.scenes[0]!.dialogue));
  const rewrite = { ...semanticPass(), scenes: semanticPass().scenes.map((scene, offset) => offset === 0 ? { ...scene, dialogue: 'viết lại' } : scene) };
  const rejecting = fixture({ semantic: rewrite });
  await assert.rejects(finalizeDialogue(rejecting.request), (error: unknown) => error instanceof DialogueFinalizationError && error.code === 'INVALID_MODEL_OUTPUT');
  assert.equal(rejecting.calls.length, 2);
});

test('R7-B fails closed for each semantic rejection verdict after exactly two calls', async () => {
  const base = semanticPass();
  const variants: readonly unknown[] = [
    { ...base, scenes: base.scenes.map((scene, offset) => offset === 0 ? { ...scene, coversKeyPoint1: false } : scene) },
    { ...base, scenes: base.scenes.map((scene, offset) => offset === 1 ? { ...scene, coversKeyPoint2: false } : scene) },
    { ...base, scenes: base.scenes.map((scene, offset) => offset === 2 ? { ...scene, introducesUnsupportedProductFact: true } : scene) },
    { ...base, scenes: base.scenes.map((scene, offset) => offset === 3 ? { ...scene, naturalSouthernConversationalVietnamese: false } : scene) },
    { ...base, scenes: base.scenes.map((scene, offset) => offset === 0 ? { ...scene, containsStageDirectionOrNonSpeechText: true } : scene) },
    { ...base, sameReviewerPersonaAcrossScenes: false }
  ];
  for (const semantic of variants) {
    const value = fixture({ semantic });
    await assert.rejects(finalizeDialogue(value.request), (error: unknown) => error instanceof DialogueFinalizationError && error.code === 'DIALOGUE_REJECTED');
    assert.equal(value.calls.length, 2);
  }
});

test('R7-B maps generation and semantic provider failures to the dedicated error boundary', async () => {
  for (const failureAt of [1, 2]) {
    const value = fixture({ failureAt });
    await assert.rejects(finalizeDialogue(value.request), (error: unknown) => error instanceof DialogueFinalizationError && error.code === 'PROVIDER_FAILURE');
    assert.equal(value.calls.length, failureAt);
  }
});
