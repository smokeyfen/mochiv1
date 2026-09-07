import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  DIALOGUE_V1,
  HUMAN_REALISM_VERSION,
  KEY_POINTS_V1,
  SCHEMA_VERSION,
  type CreativeDirectionInput,
  type DialoguePlan,
  type Global4ScenePlan,
  type HumanRealism4ScenePlan,
  type KeyPointPlan,
  type R2CommittedProductContext,
  validateProductionSnapshotV1
} from '@mochi/contracts';
import { countVietnameseSpokenUnits, createUntestedActionCapabilityMap } from '@mochi/core';
import {
  HUMAN_REALISM_GLOBAL_CONSTRAINTS,
  buildDialogueInputBinding,
  compileProductionContract,
  evaluateSceneRisk,
  resolveSceneStates,
  type CompileProductionContractRequest
} from '@mochi/reasoning';
import {
  ProductionSnapshotError,
  canonicalJson,
  computeProductionSnapshotId,
  createProductionSnapshotStore,
  productionSnapshotContent
} from './production-snapshot.ts';

const context: R2CommittedProductContext = {
  schemaVersion: SCHEMA_VERSION, productId: 'snapshot-product', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
  productTruth: {
    schemaVersion: SCHEMA_VERSION, productId: 'snapshot-product', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
    name: 'Mochi Original', category: 'snack', identityDescription: 'Bánh mochi',
    facts: [{ factId: 'geometry:0', kind: 'GEOMETRY', text: 'Viên bánh tròn', evidenceAssetIds: ['asset-1'] }, { factId: 'color:0', kind: 'COLOR', text: 'Lớp áo màu trắng', evidenceAssetIds: ['asset-1'] }],
    allowedClaims: [], prohibitedInferences: [], unresolvedUncertainties: [], unresolvedContradictions: [], exclusions: []
  },
  referenceAssessment: {
    schemaVersion: SCHEMA_VERSION, productId: 'snapshot-product', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
    assetAssessments: [{ assetId: 'asset-1', targetVisibility: 'CLEAR', identityConfidence: 'HIGH', geometryCoverage: 'STRONG', labelReadability: 'CLEAR', occlusion: 'NONE', backgroundInterference: 'LOW', multiProductAmbiguity: 'NONE' }], readiness: 'READY', limitationCodes: []
  }
};
const creative: CreativeDirectionInput = { audience: 'người thích ăn vặt', shootingContext: 'bàn', reviewerPersona: 'người review thân thiện', tone: 'gần gũi', voiceStyle: 'review', voiceGender: 'FEMALE', voiceRegion: 'SOUTH' };
const roles = ['HOOK', 'FEATURE', 'PROOF', 'CTA'] as const;
const dialogueText = ['Ủa, Mochi Original nhìn nhỏ xinh ha.', 'Viên bánh tròn cầm gọn tay nè.', 'Xoay lại thấy lớp áo màu trắng rõ luôn.', 'Mình thấy hợp để thử ăn vặt đó.'] as const;
const behavior = { approachBehavior: 'Đưa tay vào khung hình tự nhiên.', gripAndContactBehavior: 'Giữ ngón tay tiếp xúc chắc chắn.', actionExecutionBehavior: 'Thực hiện chuyển động chậm có kiểm soát.', postActionSettleBehavior: 'Dừng lại nhẹ sau hành động.', cameraBehavior: 'Giữ rung tay nhẹ tự nhiên.' };

function fixture(): CompileProductionContractRequest {
  const globalPlan: Global4ScenePlan = {
    schemaVersion: SCHEMA_VERSION, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds,
    continuity: { schemaVersion: SCHEMA_VERSION, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds, immutable: { handIdentity: { skinTone: 'ấm', nailStyle: 'ngắn', jewelry: 'không', dominantHand: 'RIGHT' }, environment: { location: 'bàn', surface: 'gỗ', background: 'trơn', lighting: 'mềm' }, cameraFamily: 'SMARTPHONE_POV', voiceIdentity: { voiceGender: 'FEMALE', voiceRegion: 'SOUTH', voiceStyle: 'review' } } },
    referenceLimitations: [], referenceReadiness: 'READY',
    scenes: ([['identity', 'PICK_UP', 'BECOME_HELD'], ['geometry:0', 'HOLD', 'REMAIN_HELD'], ['color:0', 'ROTATE_SLOW', 'CHANGE_ORIENTATION'], ['identity', 'PLACE_DOWN', 'BECOME_PLACED']] as const).map(([primaryTruthRefId, primaryAction, desiredStateEffect], offset) => ({
      sceneId: `${context.productId}:scene:${offset + 1}`, index: (offset + 1) as 1 | 2 | 3 | 4, role: roles[offset]!, durationSeconds: 8 as const, aspectRatio: '9:16' as const,
      primaryTruthRefId, physicalObjective: `mục tiêu cảnh ${offset + 1}`, primaryAction: primaryAction as Global4ScenePlan['scenes'][number]['primaryAction'], desiredStateEffect: desiredStateEffect as Global4ScenePlan['scenes'][number]['desiredStateEffect'], dialogueDraft: 'retired-r4-draft-must-not-appear', referenceAssetIds: ['asset-1'], ...(offset < 3 ? { transitionToNext: 'MATCH_CUT' as const } : {})
    }))
  };
  const points = [
    [{ index: 1 as const, kind: 'PRODUCT_NAME' as const, truthRefId: null, text: 'Mochi Original' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Bánh mochi' }],
    [{ index: 1 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'geometry:0', text: 'Viên bánh tròn' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Bánh mochi' }],
    [{ index: 1 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'color:0', text: 'Lớp áo màu trắng' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'geometry:0', text: 'Viên bánh tròn' }],
    [{ index: 1 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Bánh mochi' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'geometry:0', text: 'Viên bánh tròn' }]
  ] as const;
  const keyPointPlan: KeyPointPlan = { schemaVersion: SCHEMA_VERSION, keyPointsVersion: KEY_POINTS_V1, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds, scenes: globalPlan.scenes.map((scene, index) => ({ sceneId: scene.sceneId, index: scene.index, keyPoints: points[index]! })) };
  const statePlan = resolveSceneStates(globalPlan);
  const capabilityMap = createUntestedActionCapabilityMap();
  for (const action of Object.keys(capabilityMap) as (keyof typeof capabilityMap)[]) capabilityMap[action] = 'SAFE';
  const humanRealismPlan: HumanRealism4ScenePlan = { schemaVersion: SCHEMA_VERSION, realismVersion: HUMAN_REALISM_VERSION, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds, continuity: globalPlan.continuity, referenceReadiness: 'READY', referenceLimitations: [], globalConstraints: HUMAN_REALISM_GLOBAL_CONSTRAINTS, scenes: statePlan.scenes.map(scene => ({ sceneId: scene.sceneId, index: scene.index, primaryAction: scene.primaryAction, startState: scene.startState, endState: scene.endState, behavior })) };
  const dialoguePlan: DialoguePlan = { schemaVersion: SCHEMA_VERSION, dialogueVersion: DIALOGUE_V1, productId: context.productId, sourceEvidenceVersion: context.sourceEvidenceVersion, canonicalAssetIds: context.canonicalAssetIds, language: 'vi-VN', voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', inputBinding: buildDialogueInputBinding(globalPlan, keyPointPlan, creative), scenes: globalPlan.scenes.map((scene, index) => ({ sceneId: scene.sceneId, index: scene.index, dialogue: dialogueText[index]!, addressedKeyPointIndexes: [1, 2], spokenUnitCount: countVietnameseSpokenUnits(dialogueText[index]!) })) };
  return { context, creativeDirection: creative, globalPlan, keyPointPlan, statePlan, riskAssessment: evaluateSceneRisk(statePlan, capabilityMap), capabilityMap, humanRealismPlan, dialoguePlan };
}

async function temporaryStore() {
  const root = await mkdtemp(join(tmpdir(), 'mochi-p0-'));
  return { root, store: createProductionSnapshotStore({ storageRoot: root }) };
}
async function withStore(run: (root: string, store: ReturnType<typeof createProductionSnapshotStore>) => Promise<void>) {
  const { root, store } = await temporaryStore();
  try { await run(root, store); } finally { await rm(root, { recursive: true, force: true }); }
}
const snapshotError = (code: ProductionSnapshotError['code']) => (error: unknown) => error instanceof ProductionSnapshotError && error.code === code;

test('P0 creates a strict snapshot with the exact deterministic R8 output and no provider calls', async () => withStore(async (_root, store) => {
  const request = fixture(); const snapshot = await store.create({ projectId: 'project-1', productionRequest: request });
  assert.deepEqual(snapshot.productionContract, compileProductionContract(request));
  assert.deepEqual(validateProductionSnapshotV1(snapshot), []);
  assert.equal(snapshot.snapshotId, computeProductionSnapshotId(productionSnapshotContent(snapshot)));
  assert.doesNotMatch(JSON.stringify(snapshot), /dataBase64|base64|providerMediaId|sessionId|savedVoiceName|saydi|credentials|endpoint/i);
  const source = await readFile(new URL('./production-snapshot.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /IntelligenceProvider|@mochi\/providers|Gemini|Saydi/);
}));

test('identical content has a stable ID and byte-identical canonical persisted JSON', async () => withStore(async (root, store) => {
  const first = await store.create({ projectId: 'project-1', productionRequest: fixture() });
  const second = await store.create({ projectId: 'project-1', productionRequest: fixture() });
  assert.equal(first.snapshotId, second.snapshotId);
  assert.equal(await readFile(join(root, `${first.snapshotId}.json`), 'utf8'), canonicalJson(first));
}));

test('production-relevant content and project IDs affect content-addressed IDs', async () => withStore(async (_root, store) => {
  const first = await store.create({ projectId: 'project-1', productionRequest: fixture() });
  const original = fixture();
  const changedDialoguePlan: DialoguePlan = {
    ...original.dialoguePlan,
    inputBinding: buildDialogueInputBinding(original.globalPlan, original.keyPointPlan, original.creativeDirection),
    scenes: original.dialoguePlan.scenes.map((scene, index) => index === 0 ? { ...scene, dialogue: 'Mochi Original thay đổi.', spokenUnitCount: countVietnameseSpokenUnits('Mochi Original thay đổi.') } : scene)
  };
  const changed: CompileProductionContractRequest = { ...original, dialoguePlan: changedDialoguePlan };
  const differentProduction = await store.create({ projectId: 'project-1', productionRequest: changed });
  const differentProject = await store.create({ projectId: 'project-2', productionRequest: fixture() });
  assert.notEqual(first.snapshotId, differentProduction.snapshotId);
  assert.notEqual(first.snapshotId, differentProject.snapshotId);
}));

test('save/load round-trip is exact and same valid content is idempotent', async () => withStore(async (_root, store) => {
  const snapshot = await store.create({ projectId: 'project-1', productionRequest: fixture() });
  assert.deepEqual(await store.save(snapshot), snapshot);
  assert.deepEqual(await store.load(snapshot.snapshotId), snapshot);
}));

test('a same-ID corrupt or different file is never overwritten', async () => withStore(async (root, store) => {
  const snapshot = await store.create({ projectId: 'project-1', productionRequest: fixture() });
  const filename = join(root, `${snapshot.snapshotId}.json`);
  await writeFile(filename, '{"broken":true}', 'utf8');
  await assert.rejects(store.save(snapshot), snapshotError('SNAPSHOT_CONFLICT'));
  assert.equal(await readFile(filename, 'utf8'), '{"broken":true}');
}));

test('modified dialogue, key-point text, or production prompt never loads as valid', async () => withStore(async (root, store) => {
  const snapshot = await store.create({ projectId: 'project-1', productionRequest: fixture() });
  for (const change of [
    (value: typeof snapshot) => ({ ...value, productionContract: { ...value.productionContract, scenes: value.productionContract.scenes.map((scene, index) => index === 0 ? { ...scene, dialogue: 'tampered' } : scene) as unknown as typeof value.productionContract.scenes } }),
    (value: typeof snapshot) => ({ ...value, productionContract: { ...value.productionContract, scenes: value.productionContract.scenes.map((scene, index) => index === 0 ? { ...scene, keyPoints: [{ ...scene.keyPoints[0]!, text: 'tampered' }, scene.keyPoints[1]!] } : scene) as unknown as typeof value.productionContract.scenes } }),
    (value: typeof snapshot) => ({ ...value, productionContract: { ...value.productionContract, scenes: value.productionContract.scenes.map((scene, index) => index === 0 ? { ...scene, productionPrompt: 'tampered' } : scene) as unknown as typeof value.productionContract.scenes } })
  ]) {
    await writeFile(join(root, `${snapshot.snapshotId}.json`), canonicalJson(change(snapshot)), 'utf8');
    await assert.rejects(store.load(snapshot.snapshotId), snapshotError('CORRUPT_SNAPSHOT'));
  }
}));

test('invalid identifiers fail before filesystem path use and missing IDs are NOT_FOUND', async () => withStore(async (_root, store) => {
  await assert.rejects(store.load('../../etc/passwd'), snapshotError('INVALID_INPUT'));
  await assert.rejects(store.load(`ps_${'0'.repeat(64)}`), snapshotError('NOT_FOUND'));
}));

test('malformed JSON and undeclared snapshot fields fail closed', async () => withStore(async (root, store) => {
  const snapshot = await store.create({ projectId: 'project-1', productionRequest: fixture() }); const file = join(root, `${snapshot.snapshotId}.json`);
  await writeFile(file, '{', 'utf8'); await assert.rejects(store.load(snapshot.snapshotId), snapshotError('CORRUPT_SNAPSHOT'));
  await writeFile(file, canonicalJson({ ...snapshot, undeclared: true }), 'utf8'); await assert.rejects(store.load(snapshot.snapshotId), snapshotError('CORRUPT_SNAPSHOT'));
}));

test('source binding and malformed embedded R8 contracts are rejected by the strict contract', () => {
  const contract = compileProductionContract(fixture());
  const base = { schemaVersion: SCHEMA_VERSION, snapshotVersion: 'PRODUCTION_SNAPSHOT_V1' as const, snapshotId: `ps_${'a'.repeat(64)}`, projectId: 'project-1', productId: contract.productId, sourceEvidenceVersion: contract.sourceEvidenceVersion, canonicalAssetIds: contract.canonicalAssetIds, productionContract: contract };
  assert.ok(validateProductionSnapshotV1({ ...base, productId: 'wrong' }).includes('source_binding'));
  assert.ok(validateProductionSnapshotV1({ ...base, sourceEvidenceVersion: 'wrong' }).includes('source_binding'));
  assert.ok(validateProductionSnapshotV1({ ...base, canonicalAssetIds: ['wrong'] }).includes('source_binding'));
  assert.ok(validateProductionSnapshotV1({ ...base, productionContract: { ...contract, scenes: [] } }).includes('production_contract'));
});

test('storage roots are injected and no temporary partial file is a valid snapshot', async () => {
  await assert.rejects(Promise.resolve().then(() => createProductionSnapshotStore({ storageRoot: '   ' })), snapshotError('INVALID_INPUT'));
  await withStore(async (root, store) => {
    await assert.rejects(store.save({} as never), snapshotError('INVALID_INPUT'));
    assert.deepEqual(await readdir(root), []);
  });
});
