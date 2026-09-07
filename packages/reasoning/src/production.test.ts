import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DIALOGUE_V1,
  HUMAN_REALISM_VERSION,
  KEY_POINTS_V1,
  PRODUCTION_CONTRACT_V1,
  SCHEMA_VERSION,
  type CreativeDirectionInput,
  type DialoguePlan,
  type Global4ScenePlan,
  type HumanRealism4ScenePlan,
  type KeyPointPlan,
  type R2CommittedProductContext
} from '@mochi/contracts';
import { countVietnameseSpokenUnits, createUntestedActionCapabilityMap } from '@mochi/core';
import {
  HUMAN_REALISM_GLOBAL_CONSTRAINTS,
  ProductionCompilerError,
  buildDialogueInputBinding,
  compileProductionContract,
  compileProductionPrompt,
  evaluateSceneRisk,
  resolveSceneStates,
  validateProductionContractAgainstUpstream
} from './index.ts';

const context: R2CommittedProductContext = {
  schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
  productTruth: {
    schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
    name: 'Mochi Original', category: 'snack', identityDescription: 'Bánh mochi',
    facts: [
      { factId: 'geometry:0', kind: 'GEOMETRY', text: 'Viên bánh tròn', evidenceAssetIds: ['asset-1'] },
      { factId: 'color:0', kind: 'COLOR', text: 'Lớp áo màu trắng', evidenceAssetIds: ['asset-1'] }
    ], allowedClaims: [], prohibitedInferences: [], unresolvedUncertainties: [], unresolvedContradictions: [], exclusions: []
  },
  referenceAssessment: {
    schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
    assetAssessments: [{ assetId: 'asset-1', targetVisibility: 'CLEAR', identityConfidence: 'HIGH', geometryCoverage: 'STRONG', labelReadability: 'CLEAR', occlusion: 'NONE', backgroundInterference: 'LOW', multiProductAmbiguity: 'NONE' }], readiness: 'READY', limitationCodes: []
  }
};
const creative: CreativeDirectionInput = { audience: 'người thích ăn vặt', shootingContext: 'bàn', reviewerPersona: 'người review thân thiện', tone: 'gần gũi', voiceStyle: 'review', voiceGender: 'FEMALE', voiceRegion: 'SOUTH' };
const roles = ['HOOK', 'FEATURE', 'PROOF', 'CTA'] as const;
const dialogueText = ['Ủa, Mochi Original nhìn nhỏ xinh ha.', 'Viên bánh tròn cầm gọn tay nè.', 'Xoay lại thấy lớp áo màu trắng rõ luôn.', 'Mình thấy hợp để thử ăn vặt đó.'] as const;
const behavior = { approachBehavior: 'Đưa tay vào khung hình tự nhiên.', gripAndContactBehavior: 'Giữ ngón tay tiếp xúc chắc chắn.', actionExecutionBehavior: 'Thực hiện chuyển động chậm có kiểm soát.', postActionSettleBehavior: 'Dừng lại nhẹ sau hành động.', cameraBehavior: 'Giữ rung tay nhẹ tự nhiên.' };

function globalPlan(): Global4ScenePlan {
  return {
    schemaVersion: SCHEMA_VERSION, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds,
    continuity: { schemaVersion: SCHEMA_VERSION, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds, immutable: { handIdentity: { skinTone: 'ấm', nailStyle: 'ngắn', jewelry: 'không', dominantHand: 'RIGHT' }, environment: { location: 'bàn', surface: 'gỗ', background: 'trơn', lighting: 'mềm' }, cameraFamily: 'SMARTPHONE_POV', voiceIdentity: { voiceGender: 'FEMALE', voiceRegion: 'SOUTH', voiceStyle: 'review' } } },
    referenceLimitations: [], referenceReadiness: 'READY',
    scenes: [['identity', 'PICK_UP', 'BECOME_HELD'], ['geometry:0', 'HOLD', 'REMAIN_HELD'], ['color:0', 'ROTATE_SLOW', 'CHANGE_ORIENTATION'], ['identity', 'PLACE_DOWN', 'BECOME_PLACED']].map(([primaryTruthRefId, primaryAction, desiredStateEffect], offset) => ({
      sceneId: `${context.productId}:scene:${offset + 1}`, index: (offset + 1) as 1 | 2 | 3 | 4, role: roles[offset]!, durationSeconds: 8 as const, aspectRatio: '9:16' as const,
      primaryTruthRefId, physicalObjective: `mục tiêu cảnh ${offset + 1}`, primaryAction: primaryAction as Global4ScenePlan['scenes'][number]['primaryAction'], desiredStateEffect: desiredStateEffect as Global4ScenePlan['scenes'][number]['desiredStateEffect'], dialogueDraft: 'retired-r4-draft-must-not-appear', referenceAssetIds: ['asset-1'], ...(offset < 3 ? { transitionToNext: 'MATCH_CUT' as const } : {})
    }))
  };
}
function keyPoints(plan: Global4ScenePlan): KeyPointPlan {
  const points = [
    [{ index: 1 as const, kind: 'PRODUCT_NAME' as const, truthRefId: null, text: 'Mochi Original' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Bánh mochi' }],
    [{ index: 1 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'geometry:0', text: 'Viên bánh tròn' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Bánh mochi' }],
    [{ index: 1 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'color:0', text: 'Lớp áo màu trắng' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'geometry:0', text: 'Viên bánh tròn' }],
    [{ index: 1 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Bánh mochi' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'geometry:0', text: 'Viên bánh tròn' }]
  ] as const;
  return { schemaVersion: SCHEMA_VERSION, keyPointsVersion: KEY_POINTS_V1, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds, scenes: plan.scenes.map((scene, offset) => ({ sceneId: scene.sceneId, index: scene.index, keyPoints: points[offset]! })) };
}
function safeMap() { const map = createUntestedActionCapabilityMap(); for (const action of Object.keys(map) as (keyof typeof map)[]) map[action] = 'SAFE'; return map; }
function fixture() {
  const plan = globalPlan(); const pointPlan = keyPoints(plan); const statePlan = resolveSceneStates(plan); const capabilityMap = safeMap();
  const humanRealismPlan: HumanRealism4ScenePlan = { schemaVersion: SCHEMA_VERSION, realismVersion: HUMAN_REALISM_VERSION, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds, continuity: plan.continuity, referenceReadiness: 'READY', referenceLimitations: [], globalConstraints: HUMAN_REALISM_GLOBAL_CONSTRAINTS, scenes: statePlan.scenes.map(scene => ({ sceneId: scene.sceneId, index: scene.index, primaryAction: scene.primaryAction, startState: scene.startState, endState: scene.endState, behavior })) };
  const dialoguePlan: DialoguePlan = { schemaVersion: SCHEMA_VERSION, dialogueVersion: DIALOGUE_V1, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds, language: 'vi-VN', voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', inputBinding: buildDialogueInputBinding(plan, pointPlan, creative), scenes: plan.scenes.map((scene, offset) => ({ sceneId: scene.sceneId, index: scene.index, dialogue: dialogueText[offset]!, addressedKeyPointIndexes: [1, 2], spokenUnitCount: countVietnameseSpokenUnits(dialogueText[offset]!) })) };
  return { context, creativeDirection: creative, globalPlan: plan, keyPointPlan: pointPlan, statePlan, riskAssessment: evaluateSceneRisk(statePlan, capabilityMap), capabilityMap, humanRealismPlan, dialoguePlan };
}
const invalidInput = (request: ReturnType<typeof fixture>) => assert.throws(() => compileProductionContract(request), (error: unknown) => error instanceof ProductionCompilerError && error.code === 'INVALID_INPUT');

test('R8 compiles exactly four ordered provider-neutral contracts from no provider dependency', () => {
  const request = fixture(); const output = compileProductionContract(request);
  assert.equal(output.productionContractVersion, PRODUCTION_CONTRACT_V1);
  assert.deepEqual([output.productId, output.sourceEvidenceVersion, output.canonicalAssetIds], [context.productId, context.sourceEvidenceVersion, context.canonicalAssetIds]);
  assert.deepEqual(output.scenes.map(scene => [scene.sceneId, scene.index, scene.role, scene.durationSeconds, scene.aspectRatio]), request.globalPlan.scenes.map(scene => [scene.sceneId, scene.index, scene.role, 8, '9:16']));
  assert.deepEqual(validateProductionContractAgainstUpstream(output, request), []);
});

test('R8 preserves dialogue, spoken units, references, states, realism, key points, and logical voice exactly', () => {
  const request = fixture(); const output = compileProductionContract(request);
  for (let index = 0; index < 4; index += 1) {
    const scene = output.scenes[index]!;
    assert.equal(scene.dialogue, request.dialoguePlan.scenes[index]!.dialogue);
    assert.equal(scene.spokenUnitCount, request.dialoguePlan.scenes[index]!.spokenUnitCount);
    assert.deepEqual(scene.referenceAssetIds, request.globalPlan.scenes[index]!.referenceAssetIds);
    assert.deepEqual(scene.startState, request.statePlan.scenes[index]!.startState);
    assert.deepEqual(scene.endState, request.statePlan.scenes[index]!.endState);
    assert.deepEqual(scene.humanRealismBehavior, request.humanRealismPlan.scenes[index]!.behavior);
    assert.deepEqual(scene.keyPoints, request.keyPointPlan.scenes[index]!.keyPoints);
    assert.equal(scene.voiceIdentityId, request.dialoguePlan.voiceIdentityId);
  }
});

test('R8 prompt compilation is byte-repeatable and embeds the dialogue unchanged', () => {
  const request = fixture(); const first = compileProductionContract(request); const second = compileProductionContract(request);
  assert.deepEqual(first, second);
  for (let index = 0; index < 4; index += 1) {
    const scene = first.scenes[index]!;
    assert.equal(scene.productionPrompt, compileProductionPrompt(request.context, request.globalPlan.continuity, HUMAN_REALISM_GLOBAL_CONSTRAINTS, first.inputBinding.scenes[index]!));
    assert.ok(scene.productionPrompt.includes(scene.dialogue));
  }
});

test('R8 rejects stale R5, R6, non-ready R6, R7-A, and R7-B before output', () => {
  const staleState = fixture(); staleState.statePlan = { ...staleState.statePlan, scenes: staleState.statePlan.scenes.map((scene, index) => index === 0 ? { ...scene, endState: { ...scene.endState, heldBy: 'NONE' } } : scene) }; invalidInput(staleState);
  const staleRisk = fixture(); staleRisk.riskAssessment = { ...staleRisk.riskAssessment, scenes: staleRisk.riskAssessment.scenes.slice(1) }; invalidInput(staleRisk);
  const nonReady = fixture(); nonReady.capabilityMap.PICK_UP = 'UNTESTED'; nonReady.riskAssessment = evaluateSceneRisk(nonReady.statePlan, nonReady.capabilityMap); invalidInput(nonReady);
  const staleHuman = fixture(); staleHuman.humanRealismPlan = { ...staleHuman.humanRealismPlan, scenes: staleHuman.humanRealismPlan.scenes.map((scene, index) => index === 0 ? { ...scene, endState: { ...scene.endState, heldBy: 'NONE' } } : scene) }; invalidInput(staleHuman);
  const staleDialogue = fixture(); staleDialogue.dialoguePlan = { ...staleDialogue.dialoguePlan, inputBinding: { ...staleDialogue.dialoguePlan.inputBinding, scenes: staleDialogue.dialoguePlan.inputBinding.scenes.map((scene, index) => index === 0 ? { ...scene, physicalObjective: 'khác' } : scene) as DialoguePlan['inputBinding']['scenes'] } }; invalidInput(staleDialogue);
});

test('R8 binding makes every production-relevant upstream change invalidate an old artifact', () => {
  const request = fixture(); const output = compileProductionContract(request);
  const changed = { ...request, globalPlan: { ...request.globalPlan, scenes: request.globalPlan.scenes.map((scene, index) => index === 1 ? { ...scene, physicalObjective: 'mục tiêu mới' } : scene) } };
  assert.ok(validateProductionContractAgainstUpstream(output, changed).length > 0);
});

test('R8 excludes retired R4 drafts and rejects malformed, reordered, voice-contradictory, and provider-specific contracts', () => {
  const request = fixture(); const output = compileProductionContract(request); const encoded = JSON.stringify(output);
  assert.equal(encoded.includes('retired-r4-draft-must-not-appear'), false);
  assert.equal(/\b(?:flow|gemini|saydi|leda\s+custom|achird)\b/i.test(encoded), false);
  assert.ok(validateProductionContractAgainstUpstream({ ...output, voiceIdentityId: 'other' }, request).length > 0);
  assert.ok(validateProductionContractAgainstUpstream({ ...output, scenes: [output.scenes[1]!, output.scenes[0]!, output.scenes[2]!, output.scenes[3]!] }, request).length > 0);
  assert.ok(validateProductionContractAgainstUpstream({ ...output, scenes: output.scenes.map((scene, index) => index === 0 ? { ...scene, extra: true } : scene) as typeof output.scenes }, request).length > 0);
  assert.ok(validateProductionContractAgainstUpstream({ ...output, scenes: output.scenes.map((scene, index) => index === 0 ? { ...scene, productionPrompt: 'Gemini' } : scene) as typeof output.scenes }, request).length > 0);
});
