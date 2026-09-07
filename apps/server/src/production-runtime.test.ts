import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  SCHEMA_VERSION,
  validateProductionSnapshotV1,
  type CreativeDirectionInput,
  type ProductInput
} from '@mochi/contracts';
import { createUntestedActionCapabilityMap, type ActionCapabilityMap } from '@mochi/core';
import { type IntelligenceProvider, type StructuredIntelligenceRequest } from '@mochi/providers';
import { compileProductionContract } from '@mochi/reasoning';
import { createProductionSnapshotStore, ProductionSnapshotError, type ProductionSnapshotStore } from './production-snapshot.ts';
import {
  PRE_F1_RUNTIME_STAGES,
  ProductionRuntimeError,
  createProductionRuntime,
  type ProductionRuntimeRequest
} from './production-runtime.ts';

const product: ProductInput = {
  schemaVersion: SCHEMA_VERSION, productId: 'pre-f1-mochi', name: 'Mochi Original', details: 'Round snack reference.', category: 'snack',
  assets: [{ schemaVersion: SCHEMA_VERSION, assetId: 'reference-1', role: 'PRODUCT_REFERENCE', source: 'UPLOAD', mimeType: 'image/jpeg' }]
};
const creative: CreativeDirectionInput = {
  audience: 'người thích ăn vặt', shootingContext: 'bàn gỗ', reviewerPersona: 'người review thân thiện', tone: 'gần gũi',
  voiceStyle: 'review', voiceGender: 'FEMALE', voiceRegion: 'SOUTH'
};
const safeMap = (): ActionCapabilityMap => {
  const map = createUntestedActionCapabilityMap();
  for (const action of Object.keys(map) as (keyof ActionCapabilityMap)[]) map[action] = 'SAFE';
  return map;
};
const request = (capabilityMap = safeMap()): ProductionRuntimeRequest => ({
  projectId: 'pre-f1-project', product, creativeDirection: creative,
  media: [{ assetId: 'reference-1', mimeType: 'image/jpeg', dataBase64: 'AQ==' }],
  sourceEvidenceVersion: 'product-evidence-v1', capabilityMap
});

type MockOptions = { readonly failOnCall?: number; readonly blockedReference?: boolean };
function createMockIntelligence(options: MockOptions = {}) {
  const requests: StructuredIntelligenceRequest<unknown>[] = [];
  const provider: IntelligenceProvider = {
    id: 'mock-intelligence',
    async analyzeStructured<T>(input: StructuredIntelligenceRequest<T>) {
      const call = requests.length;
      requests.push(input as StructuredIntelligenceRequest<unknown>);
      if (call === options.failOnCall) throw new Error('untrusted provider detail');
      const data = [
        {
          schemaVersion: SCHEMA_VERSION, productId: product.productId, canonicalAssetIds: ['reference-1'],
          identityDescription: 'Mochi snack', geometryNotes: ['Round shape'], colorNotes: ['White coating'],
          packagingNotes: ['Simple package'], labelNotes: ['Mochi label'], claims: [], prohibitedInferences: [], uncertainties: [], contradictions: []
        },
        {
          schemaVersion: SCHEMA_VERSION, productId: product.productId, sourceEvidenceVersion: 'product-evidence-v1', canonicalAssetIds: ['reference-1'],
          retainedFactIds: ['identity', 'geometry:0', 'color:0', 'packaging:0', 'label:0'], exclusions: []
        },
        {
          schemaVersion: SCHEMA_VERSION, productId: product.productId, sourceEvidenceVersion: 'product-evidence-v1', canonicalAssetIds: ['reference-1'],
          assetAssessments: [{ assetId: 'reference-1', targetVisibility: 'CLEAR', identityConfidence: options.blockedReference ? 'LOW' : 'HIGH', geometryCoverage: 'STRONG', labelReadability: 'CLEAR', occlusion: 'NONE', backgroundInterference: 'LOW', multiProductAmbiguity: 'NONE' }]
        },
        { skinTone: 'ấm', nailStyle: 'ngắn', jewelry: 'không', dominantHand: 'RIGHT', surface: 'gỗ', background: 'trơn', lighting: 'mềm' },
        {
          productId: product.productId, sourceEvidenceVersion: 'product-evidence-v1', canonicalAssetIds: ['reference-1'],
          scenes: [
            ['HOOK', 'identity', 'PICK_UP', 'BECOME_HELD'], ['FEATURE', 'geometry:0', 'HOLD', 'REMAIN_HELD'],
            ['PROOF', 'color:0', 'ROTATE_SLOW', 'CHANGE_ORIENTATION'], ['CTA', 'identity', 'PLACE_DOWN', 'BECOME_PLACED']
          ].map(([role, primaryTruthRefId, primaryAction, desiredStateEffect], offset) => ({
            index: offset + 1, role, primaryTruthRefId, physicalObjective: `mục tiêu ${offset + 1}`,
            primaryAction, desiredStateEffect, dialogueDraft: 'R4 draft', referenceAssetIds: ['reference-1'],
            ...(offset < 3 ? { transitionToNext: 'MATCH_CUT' } : {})
          }))
        },
        { secondaryTruthRefIds: ['identity', 'geometry:0', 'geometry:0'] },
        { scenes: Array.from({ length: 4 }, () => ({ approachBehavior: 'Đưa tay tự nhiên.', gripAndContactBehavior: 'Giữ chắc.', actionExecutionBehavior: 'Thực hiện chậm.', postActionSettleBehavior: 'Dừng nhẹ.', cameraBehavior: 'Rung tay nhẹ.' })) },
        { scenes: Array.from({ length: 4 }, (_, offset) => ({ sceneId: `${product.productId}:scene:${offset + 1}`, index: offset + 1, dialogue: `Mochi Original cảnh ${offset + 1} nha.`, addressedKeyPointIndexes: [1, 2] })) },
        { scenes: Array.from({ length: 4 }, () => ({ coversKeyPoint1: true, coversKeyPoint2: true, introducesUnsupportedProductFact: false, naturalSouthernConversationalVietnamese: true, containsStageDirectionOrNonSpeechText: false })), sameReviewerPersonaAcrossScenes: true }
      ][call];
      return { data: input.parse(data) };
    }
  };
  return { provider, requests };
}

async function withRuntime(run: (value: { runtime: ReturnType<typeof createProductionRuntime>; requests: StructuredIntelligenceRequest<unknown>[]; root: string }) => Promise<void>, options: MockOptions = {}) {
  const root = await mkdtemp(join(tmpdir(), 'mochi-pre-f1-'));
  const mock = createMockIntelligence(options);
  try {
    await run({ runtime: createProductionRuntime({ intelligence: mock.provider, snapshotStore: createProductionSnapshotStore({ storageRoot: root }) }), requests: mock.requests, root });
  } finally { await rm(root, { recursive: true, force: true }); }
}
const runtimeError = (stage: string) => (error: unknown) => error instanceof ProductionRuntimeError && error.stage === stage && error.message === `PRE_F1_RUNTIME_ERROR:${stage}`;

test('PRE-F1 mocked integration completes only with an explicitly supplied test SAFE fixture', async () => withRuntime(async ({ runtime, requests }) => {
  const result = await runtime.run(request());
  assert.equal(requests.length, 9);
  assert.deepEqual(result.trace.map(entry => entry.stage), PRE_F1_RUNTIME_STAGES);
  assert.equal(new Set(result.trace.map(entry => entry.stage)).size, PRE_F1_RUNTIME_STAGES.length);
  assert.ok(result.trace.every(entry => entry.status === 'COMPLETED'));
  assert.deepEqual(validateProductionSnapshotV1(result.snapshot), []);
  assert.equal(result.snapshot.snapshotVersion, 'PRODUCTION_SNAPSHOT_V1');
  assert.doesNotMatch(JSON.stringify(result.snapshot), /dataBase64|base64|providerMediaId|gemini|saydi|session|credentials|storageRoot/i);
}));

test('PRE-F1 returns the exact P0 reloaded snapshot and exact R8 production contract', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-pre-f1-exact-'));
  try {
    const backing = createProductionSnapshotStore({ storageRoot: root });
    let received: Parameters<ProductionSnapshotStore['create']>[0] | undefined;
    const store: ProductionSnapshotStore = {
      async create(value) { received = value; return backing.create(value); },
      save: value => backing.save(value), load: snapshotId => backing.load(snapshotId)
    };
    const mock = createMockIntelligence();
    const result = await createProductionRuntime({ intelligence: mock.provider, snapshotStore: store }).run(request());
    assert.deepEqual(await backing.load(result.snapshot.snapshotId), result.snapshot);
    assert.ok(received);
    assert.deepEqual(result.snapshot.productionContract, compileProductionContract(received.productionRequest));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('R1 through R4.1 failures stop immediately at their safe boundary', async () => {
  const cases: readonly [number, string, number][] = [[0, 'R1_PRODUCT_EVIDENCE', 1], [1, 'R2_A_PRODUCT_TRUTH', 2], [2, 'R2_B_REFERENCE_ASSESSMENT', 3], [3, 'R3_CONTINUITY', 4], [4, 'R4_GLOBAL_PLAN', 5], [5, 'R4_1_KEY_POINTS', 6]];
  for (const [failOnCall, stage, expectedCalls] of cases) await withRuntime(async ({ runtime, requests }) => {
    await assert.rejects(runtime.run(request()), runtimeError(stage));
    assert.equal(requests.length, expectedCalls);
  }, { failOnCall });
});

test('R2 atomic commit failure stops before R3', async () => withRuntime(async ({ runtime, requests }) => {
  await assert.rejects(runtime.run(request()), runtimeError('R2_COMMIT'));
  assert.equal(requests.length, 3);
}, { blockedReference: true }));

test('R6 non-READY stops before R7-A, R7-B, R8, and P0 without mutating capability input', async () => withRuntime(async ({ runtime, requests }) => {
  const map = createUntestedActionCapabilityMap(); const before = structuredClone(map);
  await assert.rejects(runtime.run(request(map)), runtimeError('R6_READY_GATE'));
  assert.equal(requests.length, 6);
  assert.deepEqual(map, before);
}));

test('R7-A and R7-B failures stop downstream', async () => {
  for (const [failOnCall, stage, expectedCalls] of [[6, 'R7_A_HUMAN_REALISM', 7], [7, 'R7_B_DIALOGUE', 8]] as const) await withRuntime(async ({ runtime, requests }) => {
    await assert.rejects(runtime.run(request()), runtimeError(stage));
    assert.equal(requests.length, expectedCalls);
  }, { failOnCall });
});

test('R8 failure prevents any P0 persistence', async () => {
  let reads = 0; const stable = safeMap();
  const capabilityMap = new Proxy(stable, { get(target, property, receiver) {
    if (typeof property === 'string' && property in target) return ++reads > 19 ? 'UNTESTED' : Reflect.get(target, property, receiver);
    return Reflect.get(target, property, receiver);
  } }) as ActionCapabilityMap;
  let creates = 0;
  const store: ProductionSnapshotStore = {
    async create() { creates += 1; throw new Error('must not persist'); },
    async save() { throw new Error('unused'); }, async load() { throw new Error('unused'); }
  };
  const mock = createMockIntelligence();
  const runtime = createProductionRuntime({ intelligence: mock.provider, snapshotStore: store });
  await assert.rejects(runtime.run(request(capabilityMap)), runtimeError('R8_PRODUCTION_CONTRACT'));
  assert.equal(creates, 0);
});

test('P0 storage failure is normalized and fail-closed', async () => {
  const mock = createMockIntelligence();
  const store: ProductionSnapshotStore = {
    async create() { throw new ProductionSnapshotError('STORAGE_FAILURE'); },
    async save() { throw new Error('unused'); }, async load() { throw new Error('unused'); }
  };
  await assert.rejects(createProductionRuntime({ intelligence: mock.provider, snapshotStore: store }).run(request()), runtimeError('P0_CREATE_PERSIST'));
});

test('identical complete mocked runs are deterministic and have stable snapshot IDs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-pre-f1-stable-'));
  try {
    const one = createMockIntelligence(); const two = createMockIntelligence(); const store = createProductionSnapshotStore({ storageRoot: root });
    const first = await createProductionRuntime({ intelligence: one.provider, snapshotStore: store }).run(request());
    const second = await createProductionRuntime({ intelligence: two.provider, snapshotStore: store }).run(request());
    assert.equal(first.snapshot.snapshotId, second.snapshot.snapshotId);
    assert.deepEqual(first.snapshot, second.snapshot);
    assert.equal(one.requests.length, 9); assert.equal(two.requests.length, 9);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('only R1 and R2-B receive runtime media; no Flow or Saydi boundary is reachable', async () => withRuntime(async ({ runtime, requests }) => {
  await runtime.run(request());
  assert.equal(requests.filter(item => item.media.length > 0).length, 2);
  assert.deepEqual([requests[0], requests[2]].flatMap(item => item!.media.map(media => media.assetId)), ['reference-1', 'reference-1']);
  assert.equal(requests.filter((_, index) => index !== 0 && index !== 2).every(item => item.media.length === 0), true);
}));
