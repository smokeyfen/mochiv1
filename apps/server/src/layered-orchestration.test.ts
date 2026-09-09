import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  SCHEMA_VERSION,
  compileSceneAnchorsV1,
  validateProductionSnapshotV1,
  validateSceneAnchorAgainstSnapshot,
  type CreativeDirectionInput,
  type ProductInput
} from '@mochi/contracts';
import { countVietnameseSpokenUnits, createUntestedActionCapabilityMap, simpleActionFastTrackPolicyV1 } from '@mochi/core';
import {
  FlowProductionError,
  compileFlowProductionRequestV1,
  type IntelligenceProvider,
  type StructuredIntelligenceRequest
} from '@mochi/providers';
import { compileProductionContract, validateFinalizedScriptV1, validateProductFoundationV1, validateSceneBlueprintV1 } from '@mochi/reasoning';
import {
  createLayerArtifactStore,
  LayerArtifactError,
  validateProductionReadyV1,
  validateSceneBlueprintBinding,
  validateProductFoundationBinding
} from './layer-artifact-store.ts';
import { canonicalJson, createProductionSnapshotStore, type ProductionSnapshotStore } from './production-snapshot.ts';
import {
  ProductionCompileError,
  ProductionRuntimeError,
  runProductFoundation,
  runProductionCompile,
  runSceneBlueprint,
  runScriptFinalization,
  ScriptFinalizationError,
  type ProductionCompileRuntimeDependencies
} from './production-runtime.ts';

const product: ProductInput = {
  schemaVersion: SCHEMA_VERSION,
  productId: 'layered-mochi',
  name: 'Mochi Original',
  details: 'Round snack reference.',
  category: 'snack',
  assets: [{
    schemaVersion: SCHEMA_VERSION,
    assetId: 'reference-1',
    role: 'PRODUCT_REFERENCE',
    source: 'UPLOAD',
    mimeType: 'image/jpeg'
  }]
};
const media = [{ assetId: 'reference-1', mimeType: 'image/jpeg', dataBase64: 'AQ==' }] as const;
const creativeDirection: CreativeDirectionInput = {
  audience: 'người thích ăn vặt',
  shootingContext: 'bàn gỗ',
  reviewerPersona: 'người review thân thiện',
  tone: 'gần gũi',
  voiceStyle: 'review',
  voiceGender: 'FEMALE',
  voiceRegion: 'SOUTH'
};

interface MockLayerProvider {
  readonly intelligence: IntelligenceProvider;
  readonly requests: StructuredIntelligenceRequest<unknown>[];
}

function createLayerIntelligence(options: {
  failHumanOnce?: boolean;
  failKeyPointsOnce?: boolean;
  failDialogueGenerationOnce?: boolean;
  rejectDialogueSemanticOnce?: boolean;
} = {}): MockLayerProvider {
  const requests: StructuredIntelligenceRequest<unknown>[] = [];
  let humanFailuresRemaining = options.failHumanOnce ? 1 : 0;
  let keyPointFailuresRemaining = options.failKeyPointsOnce ? 1 : 0;
  let dialogueGenerationFailuresRemaining = options.failDialogueGenerationOnce ? 1 : 0;
  let dialogueSemanticRejectionsRemaining = options.rejectDialogueSemanticOnce ? 1 : 0;
  const intelligence: IntelligenceProvider = {
    id: 'layer-mock',
    async analyzeStructured<T>(request: StructuredIntelligenceRequest<T>) {
      requests.push(request as StructuredIntelligenceRequest<unknown>);
      let data: unknown;
      if (request.instruction.startsWith('PRODUCT EVIDENCE RULES:')) {
        data = {
          schemaVersion: SCHEMA_VERSION,
          productId: product.productId,
          canonicalAssetIds: ['reference-1'],
          identityDescription: 'Mochi snack',
          geometryNotes: ['Round shape'],
          colorNotes: ['White coating'],
          packagingNotes: ['Simple package'],
          labelNotes: ['Mochi label'],
          claims: [],
          prohibitedInferences: [],
          uncertainties: [],
          contradictions: []
        };
      } else if (request.instruction.startsWith('PRODUCT TRUTH RULES:')) {
        data = { identityDisposition: 'RETAIN', exclusions: [] };
      } else if (request.instruction.startsWith('REFERENCE ASSESSMENT RULES:')) {
        data = {
          schemaVersion: SCHEMA_VERSION,
          productId: product.productId,
          sourceEvidenceVersion: 'layer-evidence-v1',
          canonicalAssetIds: ['reference-1'],
          assetAssessments: [{
            assetId: 'reference-1',
            targetVisibility: 'CLEAR',
            identityConfidence: 'HIGH',
            geometryCoverage: 'STRONG',
            labelReadability: 'CLEAR',
            occlusion: 'NONE',
            backgroundInterference: 'LOW',
            multiProductAmbiguity: 'NONE'
          }]
        };
      } else if (request.instruction.startsWith('CONTINUITY RULES:')) {
        data = {
          skinTone: 'ấm', nailStyle: 'ngắn', jewelry: 'không', dominantHand: 'RIGHT',
          surface: 'gỗ', background: 'trơn', lighting: 'mềm'
        };
      } else if (request.instruction.startsWith('GLOBAL PLANNER RULES:')) {
        data = {
          hook: { primaryTruthRefId: 'identity', dialogueDraft: 'draft 1', referenceAssetIds: ['reference-1'], transitionToNext: 'MATCH_CUT' },
          feature: { primaryTruthRefId: 'geometry:0', dialogueDraft: 'draft 2', referenceAssetIds: ['reference-1'], transitionToNext: 'MATCH_CUT' },
          proof: { primaryTruthRefId: 'color:0', dialogueDraft: 'draft 3', referenceAssetIds: ['reference-1'], transitionToNext: 'MATCH_CUT' },
          cta: { reuseTruthFromScene: 1, dialogueDraft: 'draft 4', referenceAssetIds: ['reference-1'] }
        };
      } else if (request.instruction.startsWith('HUMAN REALISM RULES:')) {
        if (humanFailuresRemaining > 0) {
          humanFailuresRemaining -= 1;
          throw new Error('forced L2 failure');
        }
        data = {
          scenes: Array.from({ length: 4 }, () => ({
            approachBehavior: 'Đưa tay tự nhiên.',
            gripAndContactBehavior: 'Giữ chắc.',
            actionExecutionBehavior: 'Thực hiện chậm.',
            postActionSettleBehavior: 'Dừng nhẹ.',
            cameraBehavior: 'Rung tay nhẹ.'
          }))
        };
      } else if (request.instruction.startsWith('KEY POINTS RULES:')) {
        if (keyPointFailuresRemaining > 0) {
          keyPointFailuresRemaining -= 1;
          throw new Error('forced L3 key-point failure');
        }
        data = { secondaryTruthRefIds: ['identity', 'geometry:0', 'geometry:0'] };
      } else if (request.instruction.startsWith('DIALOGUE FINALIZATION RULES:')) {
        if (dialogueGenerationFailuresRemaining > 0) {
          dialogueGenerationFailuresRemaining -= 1;
          throw new Error('forced L3 dialogue failure');
        }
        data = {
          scenes: Array.from({ length: 4 }, (_, offset) => ({
            sceneId: `${product.productId}:scene:${offset + 1}`,
            index: offset + 1,
            dialogue: [
              'Ủa, Mochi Original nhìn nhỏ xinh ha.',
              'Viên bánh tròn cầm gọn tay nè.',
              'Xoay lại thấy lớp áo màu trắng rõ luôn.',
              'Mình thấy hợp để thử ăn vặt đó.'
            ][offset],
            addressedKeyPointIndexes: [1, 2]
          }))
        };
      } else if (request.instruction.startsWith('DIALOGUE SEMANTIC VALIDATION RULES:')) {
        const reject = dialogueSemanticRejectionsRemaining > 0;
        dialogueSemanticRejectionsRemaining -= reject ? 1 : 0;
        data = {
          scenes: Array.from({ length: 4 }, (_, offset) => ({
            coversKeyPoint1: !reject || offset !== 0,
            coversKeyPoint2: true,
            introducesUnsupportedProductFact: false,
            naturalSouthernConversationalVietnamese: true,
            containsStageDirectionOrNonSpeechText: false
          })),
          sameReviewerPersonaAcrossScenes: true
        };
      } else {
        throw new Error(`unexpected intelligence stage: ${request.instruction.slice(0, 40)}`);
      }
      return { data: request.parse(data) };
    }
  };
  return { intelligence, requests };
}

async function artifactCount(root: string, directory: string): Promise<number> {
  try { return (await readdir(join(root, directory))).filter(name => name.endsWith('.json')).length; }
  catch (error: unknown) {
    if ((error as { code?: unknown })?.code === 'ENOENT') return 0;
    throw error;
  }
}

test('A/B/C: clean L1 persists one exact valid authority and stale product/reference bindings fail closed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l1-'));
  try {
    const store = createLayerArtifactStore({ storageRoot: root });
    const mock = createLayerIntelligence();
    const result = await runProductFoundation({ intelligence: mock.intelligence, layerArtifactStore: store }, {
      projectId: 'layer-project', product, media, sourceEvidenceVersion: 'layer-evidence-v1'
    });
    assert.equal(result.foundation.foundationVersion, 'PRODUCT_FOUNDATION_V1');
    assert.match(result.foundation.foundationId, /^pf_[0-9a-f]{64}$/);
    assert.deepEqual(validateProductFoundationV1(result.foundation), []);
    assert.equal(await artifactCount(root, 'product-foundations'), 1);
    assert.equal(mock.requests.length, 3);
    assert.deepEqual(mock.requests.map(request => request.instruction.split(':', 1)[0]), [
      'PRODUCT EVIDENCE RULES', 'PRODUCT TRUTH RULES', 'REFERENCE ASSESSMENT RULES'
    ]);

    const loaded = await store.loadProductFoundation(result.foundation.foundationId);
    assert.deepEqual(loaded, result.foundation);
    const bytes = await readFile(join(root, 'product-foundations', `${result.foundation.foundationId}.json`), 'utf8');
    assert.equal(bytes, canonicalJson(result.foundation));
    assert.doesNotMatch(bytes, /dataBase64|AQ==|credential|providerMetadata|modelResponse|prompt/i);
    assert.deepEqual(validateProductFoundationBinding(loaded, product, media), []);
    assert.deepEqual(validateProductFoundationBinding(loaded, { ...product, name: 'Changed name' }, media), ['stale_product_reference_binding']);
    assert.deepEqual(validateProductFoundationBinding(loaded, product, [{ ...media[0], dataBase64: 'Ag==' }]), ['stale_product_reference_binding']);
    const idempotent = await store.createProductFoundation({
      projectId: loaded.projectId,
      productReferenceBinding: loaded.productReferenceBinding,
      productEvidence: loaded.productEvidence,
      committedContext: loaded.committedContext
    });
    assert.equal(idempotent.foundationId, loaded.foundationId);
    assert.equal(await artifactCount(root, 'product-foundations'), 1);

    const path = join(root, 'product-foundations', `${loaded.foundationId}.json`);
    const tampered = JSON.parse(bytes) as Record<string, unknown>;
    tampered.projectId = 'tampered-project';
    await writeFile(path, canonicalJson(tampered), 'utf8');
    await assert.rejects(store.loadProductFoundation(loaded.foundationId),
      (error: unknown) => error instanceof LayerArtifactError && error.code === 'CORRUPT_ARTIFACT');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('D/E: clean L2 loads L1, invokes only R3/R4/R7-A, and persists the current READY action spine', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l2-'));
  try {
    const store = createLayerArtifactStore({ storageRoot: root });
    const l1 = createLayerIntelligence();
    const foundation = (await runProductFoundation({ intelligence: l1.intelligence, layerArtifactStore: store }, {
      projectId: 'layer-project', product, media, sourceEvidenceVersion: 'layer-evidence-v1'
    })).foundation;
    const l2 = createLayerIntelligence();
    const result = await runSceneBlueprint({ intelligence: l2.intelligence, layerArtifactStore: store }, {
      foundationId: foundation.foundationId,
      creativeDirection,
      capabilityMap: createUntestedActionCapabilityMap(),
      productionEligibilityPolicy: simpleActionFastTrackPolicyV1
    });
    assert.equal(l1.requests.length, 3);
    assert.equal(l2.requests.length, 3);
    assert.deepEqual(l2.requests.map(request => request.instruction.split(':', 1)[0]), [
      'CONTINUITY RULES', 'GLOBAL PLANNER RULES', 'HUMAN REALISM RULES'
    ]);
    assert.equal(l2.requests.some(request => /PRODUCT EVIDENCE|PRODUCT TRUTH|REFERENCE ASSESSMENT/.test(request.instruction)), false);
    assert.deepEqual(validateSceneBlueprintV1(result.blueprint, foundation), []);
    assert.deepEqual(validateSceneBlueprintBinding(
      result.blueprint, foundation, creativeDirection, createUntestedActionCapabilityMap(), simpleActionFastTrackPolicyV1
    ), []);
    assert.deepEqual(validateSceneBlueprintBinding(
      result.blueprint, foundation, { ...creativeDirection, audience: 'changed audience' },
      createUntestedActionCapabilityMap(), simpleActionFastTrackPolicyV1
    ), ['stale_creative_direction']);
    assert.deepEqual(result.blueprint.globalPlan.scenes.map(scene => scene.primaryAction), ['PICK_UP', 'HOLD', 'ROTATE_SLOW', 'HOLD']);
    assert.ok(result.blueprint.riskAssessment.scenes.every(scene => scene.status === 'READY'
      && scene.actionCapability === 'UNTESTED' && scene.productionEligibility === 'FAST_TRACK_AUTHORIZED'));
    assert.equal(result.blueprint.humanRealismPlan.scenes.length, 4);
    assert.equal(await artifactCount(root, 'scene-blueprints'), 1);
    assert.deepEqual(await store.loadSceneBlueprint(result.blueprint.blueprintId), result.blueprint);

    const variants: readonly [string, (value: any) => void][] = [
      ['foundation_lineage', value => { value.foundationId = `pf_${'0'.repeat(64)}`; }],
      ['continuity', value => { value.continuity.immutable.environment.location = 'changed'; }],
      ['global_plan', value => { value.globalPlan.scenes[0].desiredStateEffect = 'REMAIN_HELD'; }],
      ['state_plan', value => { value.statePlan.scenes[0].endState.heldBy = 'NONE'; }],
      ['risk_assessment', value => { value.riskAssessment.scenes[0].status = 'CONDITIONAL'; }],
      ['human_realism', value => { value.humanRealismPlan.scenes[0].behavior.cameraBehavior = ' '; }]
    ];
    for (const [issue, mutate] of variants) {
      const changed = structuredClone(result.blueprint) as any;
      mutate(changed);
      assert.ok(validateSceneBlueprintV1(changed, foundation).includes(issue), issue);
    }
    const blueprintPath = join(root, 'scene-blueprints', `${result.blueprint.blueprintId}.json`);
    const blueprintBytes = await readFile(blueprintPath, 'utf8');
    assert.equal(blueprintBytes, canonicalJson(result.blueprint));
    assert.doesNotMatch(blueprintBytes, /dataBase64|credential|providerMetadata|modelResponse|prompt/i);
    const tamperedBlueprint = JSON.parse(blueprintBytes) as any;
    tamperedBlueprint.riskAssessment.scenes[0].status = 'CONDITIONAL';
    await writeFile(blueprintPath, canonicalJson(tamperedBlueprint), 'utf8');
    await assert.rejects(store.loadSceneBlueprint(result.blueprint.blueprintId),
      (error: unknown) => error instanceof LayerArtifactError && error.code === 'CORRUPT_ARTIFACT');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('F/G: failed L2 commits nothing and retry reuses the unchanged L1 artifact without L1 calls', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-retry-'));
  try {
    const store = createLayerArtifactStore({ storageRoot: root });
    const l1 = createLayerIntelligence();
    const foundation = (await runProductFoundation({ intelligence: l1.intelligence, layerArtifactStore: store }, {
      projectId: 'layer-project', product, media, sourceEvidenceVersion: 'layer-evidence-v1'
    })).foundation;
    const foundationId = foundation.foundationId;
    const l2 = createLayerIntelligence({ failHumanOnce: true });
    const request = {
      foundationId,
      creativeDirection,
      capabilityMap: createUntestedActionCapabilityMap(),
      productionEligibilityPolicy: simpleActionFastTrackPolicyV1
    } as const;
    await assert.rejects(runSceneBlueprint({ intelligence: l2.intelligence, layerArtifactStore: store }, request),
      (error: unknown) => error instanceof ProductionRuntimeError && error.stage === 'R7_A_HUMAN_REALISM');
    assert.equal(await artifactCount(root, 'scene-blueprints'), 0);
    assert.equal(await artifactCount(root, 'product-foundations'), 1);
    assert.equal((await store.loadProductFoundation(foundationId)).foundationId, foundationId);
    assert.equal(l1.requests.length, 3);

    const retried = await runSceneBlueprint({ intelligence: l2.intelligence, layerArtifactStore: store }, request);
    assert.equal(retried.foundation.foundationId, foundationId);
    assert.equal(await artifactCount(root, 'product-foundations'), 1);
    assert.equal(await artifactCount(root, 'scene-blueprints'), 1);
    assert.equal(l1.requests.length, 3);
    assert.equal(l2.requests.filter(item => /PRODUCT EVIDENCE|PRODUCT TRUTH|REFERENCE ASSESSMENT/.test(item.instruction)).length, 0);
    assert.deepEqual(validateSceneBlueprintV1(retried.blueprint, retried.foundation), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

async function createL3Inputs(root: string) {
  const store = createLayerArtifactStore({ storageRoot: root });
  const l1 = createLayerIntelligence();
  const foundation = (await runProductFoundation({ intelligence: l1.intelligence, layerArtifactStore: store }, {
    projectId: 'layer-project', product, media, sourceEvidenceVersion: 'layer-evidence-v1'
  })).foundation;
  const l2 = createLayerIntelligence();
  const blueprint = (await runSceneBlueprint({ intelligence: l2.intelligence, layerArtifactStore: store }, {
    foundationId: foundation.foundationId,
    creativeDirection,
    capabilityMap: createUntestedActionCapabilityMap(),
    productionEligibilityPolicy: simpleActionFastTrackPolicyV1
  })).blueprint;
  return { store, l1, l2, foundation, blueprint };
}

async function createL4Inputs(root: string) {
  const lower = await createL3Inputs(root);
  const l3 = createLayerIntelligence();
  const script = (await runScriptFinalization(
    { intelligence: l3.intelligence, layerArtifactStore: lower.store },
    { blueprintId: lower.blueprint.blueprintId }
  )).script;
  return { ...lower, l3, script };
}

async function artifactBytes(root: string, directory: string, id: string): Promise<string> {
  return readFile(join(root, directory, `${id}.json`), 'utf8');
}

const l4Error = (phase: string, detail?: Record<string, string>) => (error: unknown) => error instanceof ProductionCompileError
  && JSON.stringify(error.diagnostic) === JSON.stringify({ layer: 'L4', phase, ...detail })
  && !/path|prompt|credential|provider|response|stack|manual-/i.test(JSON.stringify(error.diagnostic));

test('L3 A/B/C/I/J: clean script finalization persists one provider-neutral authority in exactly three calls', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l3-'));
  try {
    const { store, l1, l2, foundation, blueprint } = await createL3Inputs(root);
    const l3 = createLayerIntelligence();
    const result = await runScriptFinalization({ intelligence: l3.intelligence, layerArtifactStore: store }, { blueprintId: blueprint.blueprintId });
    assert.equal(result.script.scriptVersion, 'FINALIZED_SCRIPT_V1');
    assert.match(result.script.scriptId, /^fs_[0-9a-f]{64}$/);
    assert.equal(result.script.blueprintId, blueprint.blueprintId);
    assert.deepEqual(validateFinalizedScriptV1(result.script, blueprint, foundation), []);
    assert.equal(await artifactCount(root, 'finalized-scripts'), 1);
    assert.equal(l3.requests.length, 3);
    assert.deepEqual(l3.requests.map(request => request.instruction.split(':', 1)[0]), [
      'KEY POINTS RULES', 'DIALOGUE FINALIZATION RULES', 'DIALOGUE SEMANTIC VALIDATION RULES'
    ]);
    assert.equal(l3.requests.some(request => /PRODUCT EVIDENCE|PRODUCT TRUTH|REFERENCE ASSESSMENT|CONTINUITY|GLOBAL PLANNER|HUMAN REALISM/.test(request.instruction)), false);
    assert.equal(l1.requests.length, 3);
    assert.equal(l2.requests.length, 3);
    assert.deepEqual(await store.loadFinalizedScript(result.script.scriptId), result.script);
    const scriptPath = join(root, 'finalized-scripts', `${result.script.scriptId}.json`);
    const bytes = await readFile(scriptPath, 'utf8');
    assert.equal(bytes, canonicalJson(result.script));
    assert.doesNotMatch(bytes, /dataBase64|base64|credential|provider|prompt|modelResponse|rawResponse/i);

    const tamperedContent = JSON.parse(bytes) as any;
    tamperedContent.dialoguePlan.scenes[0].dialogue = 'tampered';
    await writeFile(scriptPath, canonicalJson(tamperedContent), 'utf8');
    await assert.rejects(store.loadFinalizedScript(result.script.scriptId),
      (error: unknown) => error instanceof LayerArtifactError && error.code === 'CORRUPT_ARTIFACT');
    await writeFile(scriptPath, bytes, 'utf8');
    const tamperedId = JSON.parse(bytes) as any;
    tamperedId.scriptId = `fs_${'0'.repeat(64)}`;
    await writeFile(scriptPath, canonicalJson(tamperedId), 'utf8');
    await assert.rejects(store.loadFinalizedScript(result.script.scriptId),
      (error: unknown) => error instanceof LayerArtifactError && error.code === 'CORRUPT_ARTIFACT');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('L3 D/E/F/G: failures do not commit and retry from one blueprint runs only L3', async () => {
  for (const [option, expectedStage, expectedCalls] of [
    [{ failKeyPointsOnce: true }, 'R4_1_KEY_POINTS', 1],
    [{ failDialogueGenerationOnce: true }, 'R7_B_DIALOGUE', 2],
    [{ rejectDialogueSemanticOnce: true }, 'R7_B_DIALOGUE', 3]
  ] as const) {
    const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l3-failure-'));
    try {
      const { store, l1, l2, foundation, blueprint } = await createL3Inputs(root);
      const l3 = createLayerIntelligence(option);
      await assert.rejects(runScriptFinalization({ intelligence: l3.intelligence, layerArtifactStore: store }, { blueprintId: blueprint.blueprintId }),
        (error: unknown) => error instanceof ScriptFinalizationError
          && error.diagnostic.layer === 'L3' && error.diagnostic.phase === 'ENGINE'
          && error.diagnostic.engineStage === expectedStage);
      assert.equal(l3.requests.length, expectedCalls);
      assert.equal(await artifactCount(root, 'finalized-scripts'), 0);
      assert.equal((await store.loadProductFoundation(foundation.foundationId)).foundationId, foundation.foundationId);
      assert.equal((await store.loadSceneBlueprint(blueprint.blueprintId)).blueprintId, blueprint.blueprintId);
      assert.equal(l1.requests.length, 3);
      assert.equal(l2.requests.length, 3);

      const retry = await runScriptFinalization({ intelligence: l3.intelligence, layerArtifactStore: store }, { blueprintId: blueprint.blueprintId });
      assert.equal(retry.foundation.foundationId, foundation.foundationId);
      assert.equal(retry.blueprint.blueprintId, blueprint.blueprintId);
      assert.equal(await artifactCount(root, 'finalized-scripts'), 1);
      assert.equal(l1.requests.length, 3);
      assert.equal(l2.requests.length, 3);
      assert.equal(l3.requests.some(request => /PRODUCT EVIDENCE|PRODUCT TRUTH|REFERENCE ASSESSMENT|CONTINUITY|GLOBAL PLANNER|HUMAN REALISM/.test(request.instruction)), false);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test('L3 H: stale or tampered L2 lineage fails closed before L3 intelligence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l3-lineage-'));
  try {
    const { blueprint } = await createL3Inputs(root);
    const blueprintPath = join(root, 'scene-blueprints', `${blueprint.blueprintId}.json`);
    const tampered = JSON.parse(await readFile(blueprintPath, 'utf8')) as any;
    tampered.foundationId = `pf_${'0'.repeat(64)}`;
    await writeFile(blueprintPath, canonicalJson(tampered), 'utf8');
    const l3 = createLayerIntelligence();
    await assert.rejects(runScriptFinalization({ intelligence: l3.intelligence, layerArtifactStore: createLayerArtifactStore({ storageRoot: root }) }, { blueprintId: blueprint.blueprintId }),
      (error: unknown) => error instanceof ScriptFinalizationError
        && JSON.stringify(error.diagnostic) === JSON.stringify({ layer: 'L3', phase: 'LOAD' }));
    assert.equal(l3.requests.length, 0);
    assert.equal(await artifactCount(root, 'finalized-scripts'), 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('L4 A-H/O: scriptId alone deterministically commits exact P0, four anchors, four Flow compiles, and one safe ready authority', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l4-'));
  try {
    const { store, l1, l2, l3, foundation, blueprint, script } = await createL4Inputs(root);
    const lowerBytes = await Promise.all([
      artifactBytes(root, 'product-foundations', foundation.foundationId),
      artifactBytes(root, 'scene-blueprints', blueprint.blueprintId),
      artifactBytes(root, 'finalized-scripts', script.scriptId)
    ]);
    const backingSnapshotStore = createProductionSnapshotStore({ storageRoot: join(root, 'snapshots') });
    let received: Parameters<ProductionSnapshotStore['create']>[0] | undefined;
    let flowCompileCalls = 0;
    const snapshotStore: ProductionSnapshotStore = {
      async create(value) { received = value; return backingSnapshotStore.create(value); },
      save: value => backingSnapshotStore.save(value),
      load: id => backingSnapshotStore.load(id)
    };
    type L4HasIntelligence = 'intelligence' extends keyof ProductionCompileRuntimeDependencies ? true : false;
    const structurallyHasNoIntelligence: L4HasIntelligence = false;
    const dependencies: ProductionCompileRuntimeDependencies = {
      layerArtifactStore: store,
      productionSnapshotStore: snapshotStore,
      compilers: {
        flowRequest(anchor, bindings) {
          flowCompileCalls += 1;
          return compileFlowProductionRequestV1(anchor, bindings);
        }
      }
    };
    assert.equal(structurallyHasNoIntelligence, false);
    assert.equal('intelligence' in dependencies, false);

    const result = await runProductionCompile(dependencies, { scriptId: script.scriptId });
    assert.ok(received);
    assert.deepEqual(received.productionRequest, {
      context: foundation.committedContext,
      creativeDirection: blueprint.creativeDirection,
      globalPlan: blueprint.globalPlan,
      keyPointPlan: script.keyPointPlan,
      statePlan: blueprint.statePlan,
      riskAssessment: blueprint.riskAssessment,
      capabilityMap: blueprint.eligibilityBinding.capabilityMap,
      productionEligibilityPolicy: blueprint.eligibilityBinding.productionEligibilityPolicy,
      humanRealismPlan: blueprint.humanRealismPlan,
      dialoguePlan: script.dialoguePlan
    });
    assert.deepEqual(result.snapshot.productionContract, compileProductionContract(received.productionRequest));
    assert.deepEqual(await backingSnapshotStore.load(result.snapshot.snapshotId), result.snapshot);
    assert.deepEqual(validateProductionSnapshotV1(result.snapshot), []);
    assert.equal(result.anchors.length, 4);
    assert.deepEqual(result.anchors.map(anchor => anchor.index), [1, 2, 3, 4]);
    assert.deepEqual(result.anchors.map(anchor => anchor.role), ['HOOK', 'FEATURE', 'PROOF', 'CTA']);
    assert.deepEqual(result.anchors.map(anchor => anchor.primaryAction), ['PICK_UP', 'HOLD', 'ROTATE_SLOW', 'HOLD']);
    assert.ok(result.anchors.every(anchor => validateSceneAnchorAgainstSnapshot(anchor, result.snapshot).length === 0));
    assert.equal(flowCompileCalls, 4);
    assert.equal(result.flowRequests.length, 4);

    const dialogues = script.dialoguePlan.scenes.map(scene => scene.dialogue);
    const voice = script.dialoguePlan.voiceIdentityId;
    const references = blueprint.globalPlan.scenes.map(scene => scene.referenceAssetIds);
    assert.deepEqual(result.snapshot.productionContract.scenes.map(scene => scene.dialogue), dialogues);
    assert.deepEqual(result.anchors.map(anchor => anchor.dialogue), dialogues);
    assert.deepEqual(result.flowRequests.map(request => request.dialogue), dialogues);
    assert.ok(result.snapshot.productionContract.scenes.every(scene => scene.voiceIdentityId === voice));
    assert.ok(result.anchors.every(anchor => anchor.voiceIdentityId === voice));
    assert.ok(result.flowRequests.every(request => request.nativeVoiceBinding.logicalVoiceIdentityId === voice));
    assert.deepEqual(result.snapshot.productionContract.scenes.map(scene => scene.referenceAssetIds), references);
    assert.deepEqual(result.anchors.map(anchor => anchor.referenceAssetIds), references);
    assert.deepEqual(result.flowRequests.map(request => request.referenceBindings.map(binding => binding.logicalAssetId)), references);
    assert.ok(result.flowRequests.every(request => request.durationSeconds === 8 && request.aspectRatio === '9:16'
      && request.effects.sfx === 'NONE' && request.effects.vfx === 'NONE'
      && request.promptUnicodeCharacterCount > 0 && request.promptUnicodeCharacterCount <= 3200));

    assert.equal(result.ready.status, 'READY_FOR_FLOW');
    assert.equal(result.ready.scriptId, script.scriptId);
    assert.equal(result.ready.snapshotId, result.snapshot.snapshotId);
    assert.equal(result.ready.compileProof.sceneCount, 4);
    assert.deepEqual(validateProductionReadyV1(result.ready), []);
    assert.deepEqual(await store.loadProductionReady(result.ready.readyId), result.ready);
    assert.equal(await artifactCount(root, 'production-ready'), 1);
    const readyBytes = await artifactBytes(root, 'production-ready', result.ready.readyId);
    assert.equal(readyBytes, canonicalJson(result.ready));
    assert.doesNotMatch(readyBytes, /dataBase64|credentials|providerMetadata|providerOperation|flowReferenceId|manual-|rawResponse|"prompt":/i);
    assert.deepEqual(await Promise.all([
      artifactBytes(root, 'product-foundations', foundation.foundationId),
      artifactBytes(root, 'scene-blueprints', blueprint.blueprintId),
      artifactBytes(root, 'finalized-scripts', script.scriptId)
    ]), lowerBytes);
    assert.deepEqual([l1.requests.length, l2.requests.length, l3.requests.length], [3, 3, 3]);
    assert.doesNotMatch(runProductionCompile.toString(), /executeFlowProductionRequestV1|generateScene/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('L4 I: invalid, missing, corrupt, or stale upstream lineage fails before R8/P0 and commits no ready authority', async () => {
  const invalidRoot = await mkdtemp(join(tmpdir(), 'mochi-layer-l4-invalid-'));
  try {
    const store = createLayerArtifactStore({ storageRoot: invalidRoot });
    let creates = 0;
    const snapshotStore: ProductionSnapshotStore = {
      async create() { creates += 1; throw new Error('unreachable'); },
      async save() { throw new Error('unreachable'); },
      async load() { throw new Error('unreachable'); }
    };
    await assert.rejects(runProductionCompile({ layerArtifactStore: store, productionSnapshotStore: snapshotStore }, { scriptId: 'bad' }), l4Error('INPUT'));
    await assert.rejects(runProductionCompile({ layerArtifactStore: store, productionSnapshotStore: snapshotStore }, { scriptId: `fs_${'0'.repeat(64)}` }), l4Error('LOAD'));
    assert.equal(creates, 0);
    assert.equal(await artifactCount(invalidRoot, 'production-ready'), 0);
  } finally { await rm(invalidRoot, { recursive: true, force: true }); }

  for (const target of ['script', 'foundation'] as const) {
    const root = await mkdtemp(join(tmpdir(), `mochi-layer-l4-corrupt-${target}-`));
    try {
      const { store, foundation, script } = await createL4Inputs(root);
      const directory = target === 'script' ? 'finalized-scripts' : 'product-foundations';
      const id = target === 'script' ? script.scriptId : foundation.foundationId;
      const value = JSON.parse(await artifactBytes(root, directory, id)) as any;
      if (target === 'script') value.dialoguePlan.scenes[0].dialogue = 'tampered';
      else value.projectId = 'tampered-project';
      await writeFile(join(root, directory, `${id}.json`), canonicalJson(value), 'utf8');
      let creates = 0;
      const snapshotStore: ProductionSnapshotStore = {
        async create() { creates += 1; throw new Error('unreachable'); },
        async save() { throw new Error('unreachable'); },
        async load() { throw new Error('unreachable'); }
      };
      await assert.rejects(runProductionCompile({ layerArtifactStore: store, productionSnapshotStore: snapshotStore }, { scriptId: script.scriptId }), l4Error('LOAD'));
      assert.equal(creates, 0);
      assert.equal(await artifactCount(root, 'production-ready'), 0);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test('L4 J: P0 create, load, or equality failure preserves L1/L2/L3 and commits no ready authority', async () => {
  for (const failure of ['create', 'load', 'equality'] as const) {
    const root = await mkdtemp(join(tmpdir(), `mochi-layer-l4-p0-${failure}-`));
    try {
      const { store, foundation, blueprint, script } = await createL4Inputs(root);
      const lowerBefore = await Promise.all([
        artifactBytes(root, 'product-foundations', foundation.foundationId),
        artifactBytes(root, 'scene-blueprints', blueprint.blueprintId),
        artifactBytes(root, 'finalized-scripts', script.scriptId)
      ]);
      const backing = createProductionSnapshotStore({ storageRoot: join(root, 'snapshots') });
      let created: Awaited<ReturnType<ProductionSnapshotStore['create']>> | undefined;
      const snapshotStore: ProductionSnapshotStore = {
        async create(value) {
          if (failure === 'create') throw new Error('private storage detail');
          created = await backing.create(value);
          return created;
        },
        save: value => backing.save(value),
        async load(id) {
          if (failure === 'load') throw new Error('private storage detail');
          const loaded = await backing.load(id);
          return failure === 'equality' ? { ...loaded, projectId: 'mismatch' } : loaded;
        }
      };
      await assert.rejects(
        runProductionCompile({ layerArtifactStore: store, productionSnapshotStore: snapshotStore }, { scriptId: script.scriptId }),
        l4Error(failure === 'equality' ? 'VALIDATE' : 'PERSIST')
      );
      assert.equal(await artifactCount(root, 'production-ready'), 0);
      assert.deepEqual(await Promise.all([
        artifactBytes(root, 'product-foundations', foundation.foundationId),
        artifactBytes(root, 'scene-blueprints', blueprint.blueprintId),
        artifactBytes(root, 'finalized-scripts', script.scriptId)
      ]), lowerBefore);
      if (failure !== 'create') assert.ok(created);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test('L4 K: a SceneAnchor compiler mutation fails validation and commits no ready authority', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l4-anchor-fail-'));
  try {
    const { store, script } = await createL4Inputs(root);
    const snapshotStore = createProductionSnapshotStore({ storageRoot: join(root, 'snapshots') });
    await assert.rejects(runProductionCompile({
      layerArtifactStore: store,
      productionSnapshotStore: snapshotStore,
      compilers: {
        sceneAnchors(snapshot) {
          const anchors = compileSceneAnchorsV1(snapshot);
          return [{ ...anchors[0], dialogue: 'tampered' }, anchors[1], anchors[2], anchors[3]];
        }
      }
    }, { scriptId: script.scriptId }), l4Error('COMPILE', { compileStage: 'SCENE_ANCHOR' }));
    assert.equal(await artifactCount(root, 'production-ready'), 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('L4 L: Flow request failure and the real prompt-budget gate commit no ready authority and cannot generate Flow', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l4-flow-fail-'));
  try {
    const { store, script } = await createL4Inputs(root);
    const snapshotStore = createProductionSnapshotStore({ storageRoot: join(root, 'snapshots') });
    let compileCalls = 0;
    await assert.rejects(runProductionCompile({
      layerArtifactStore: store,
      productionSnapshotStore: snapshotStore,
      compilers: {
        flowRequest() {
          compileCalls += 1;
          throw new FlowProductionError('REFERENCE_BINDING_INVALID');
        }
      }
    }, { scriptId: script.scriptId }), l4Error('COMPILE', { compileStage: 'FLOW_REQUEST' }));
    assert.equal(compileCalls, 1);
    assert.equal(await artifactCount(root, 'production-ready'), 0);

    const longDialogue = `Nói chính xác ${'ạ'.repeat(3300)}`;
    const longScript = await store.createFinalizedScript({
      blueprintId: script.blueprintId,
      keyPointPlan: script.keyPointPlan,
      dialoguePlan: {
        ...script.dialoguePlan,
        scenes: script.dialoguePlan.scenes.map((scene, offset) => offset === 0
          ? { ...scene, dialogue: longDialogue, spokenUnitCount: countVietnameseSpokenUnits(longDialogue) }
          : scene) as typeof script.dialoguePlan.scenes
      }
    });
    await assert.rejects(runProductionCompile({ layerArtifactStore: store, productionSnapshotStore: snapshotStore }, { scriptId: longScript.scriptId }),
      l4Error('COMPILE', { compileStage: 'FLOW_REQUEST' }));
    assert.equal(await artifactCount(root, 'production-ready'), 0);
    assert.doesNotMatch(runProductionCompile.toString(), /executeFlowProductionRequestV1|generateScene/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('L4 M: retry from the same script after downstream failure reruns no lower layer and commits one idempotent ready authority', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l4-retry-'));
  try {
    const { store, l1, l2, l3, foundation, blueprint, script } = await createL4Inputs(root);
    const lowerBefore = await Promise.all([
      artifactBytes(root, 'product-foundations', foundation.foundationId),
      artifactBytes(root, 'scene-blueprints', blueprint.blueprintId),
      artifactBytes(root, 'finalized-scripts', script.scriptId)
    ]);
    const snapshotStore = createProductionSnapshotStore({ storageRoot: join(root, 'snapshots') });
    let failOnce = true;
    const dependencies: ProductionCompileRuntimeDependencies = {
      layerArtifactStore: store,
      productionSnapshotStore: snapshotStore,
      compilers: {
        flowRequest(anchor, bindings) {
          if (failOnce) {
            failOnce = false;
            throw new FlowProductionError('PROMPT_BUDGET_EXCEEDED');
          }
          return compileFlowProductionRequestV1(anchor, bindings);
        }
      }
    };
    await assert.rejects(runProductionCompile(dependencies, { scriptId: script.scriptId }), l4Error('COMPILE', { compileStage: 'FLOW_REQUEST' }));
    assert.equal(await artifactCount(root, 'production-ready'), 0);
    const retry = await runProductionCompile(dependencies, { scriptId: script.scriptId });
    const duplicate = await runProductionCompile(dependencies, { scriptId: script.scriptId });
    assert.equal(retry.foundation.foundationId, foundation.foundationId);
    assert.equal(retry.blueprint.blueprintId, blueprint.blueprintId);
    assert.equal(retry.script.scriptId, script.scriptId);
    assert.equal(duplicate.ready.readyId, retry.ready.readyId);
    assert.equal(await artifactCount(root, 'production-ready'), 1);
    assert.deepEqual(await Promise.all([
      artifactBytes(root, 'product-foundations', foundation.foundationId),
      artifactBytes(root, 'scene-blueprints', blueprint.blueprintId),
      artifactBytes(root, 'finalized-scripts', script.scriptId)
    ]), lowerBefore);
    assert.deepEqual([l1.requests.length, l2.requests.length, l3.requests.length], [3, 3, 3]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('L4 optional policy mapping omits null and ready persistence failure leaves no L4 artifact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l4-optional-'));
  try {
    const store = createLayerArtifactStore({ storageRoot: root });
    const l1 = createLayerIntelligence();
    const foundation = (await runProductFoundation({ intelligence: l1.intelligence, layerArtifactStore: store }, {
      projectId: 'layer-project', product, media, sourceEvidenceVersion: 'layer-evidence-v1'
    })).foundation;
    const capabilityMap = createUntestedActionCapabilityMap();
    for (const action of Object.keys(capabilityMap) as (keyof typeof capabilityMap)[]) capabilityMap[action] = 'SAFE';
    const l2 = createLayerIntelligence();
    const blueprint = (await runSceneBlueprint({ intelligence: l2.intelligence, layerArtifactStore: store }, {
      foundationId: foundation.foundationId, creativeDirection, capabilityMap
    })).blueprint;
    assert.equal(blueprint.eligibilityBinding.productionEligibilityPolicy, null);
    const l3 = createLayerIntelligence();
    const script = (await runScriptFinalization(
      { intelligence: l3.intelligence, layerArtifactStore: store }, { blueprintId: blueprint.blueprintId }
    )).script;
    const backingSnapshotStore = createProductionSnapshotStore({ storageRoot: join(root, 'snapshots') });
    let received: Parameters<ProductionSnapshotStore['create']>[0] | undefined;
    const snapshotStore: ProductionSnapshotStore = {
      async create(value) { received = value; return backingSnapshotStore.create(value); },
      save: value => backingSnapshotStore.save(value),
      load: id => backingSnapshotStore.load(id)
    };
    const failingReadyStore = {
      ...store,
      async createProductionReady(): ReturnType<typeof store.createProductionReady> {
        throw new Error('private persistence detail');
      }
    };
    await assert.rejects(runProductionCompile({
      layerArtifactStore: failingReadyStore,
      productionSnapshotStore: snapshotStore
    }, { scriptId: script.scriptId }), l4Error('PERSIST'));
    assert.ok(received);
    assert.equal('productionEligibilityPolicy' in received.productionRequest, false);
    assert.equal(await artifactCount(root, 'production-ready'), 0);
    assert.deepEqual([l1.requests.length, l2.requests.length, l3.requests.length], [3, 3, 3]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('L4 N: tampered ready content or readyId fails closed on load', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mochi-layer-l4-ready-tamper-'));
  try {
    const { store, script } = await createL4Inputs(root);
    const result = await runProductionCompile({
      layerArtifactStore: store,
      productionSnapshotStore: createProductionSnapshotStore({ storageRoot: join(root, 'snapshots') })
    }, { scriptId: script.scriptId });
    const path = join(root, 'production-ready', `${result.ready.readyId}.json`);
    const bytes = await readFile(path, 'utf8');
    const changedProof = JSON.parse(bytes) as any;
    changedProof.compileProof.scenes[0].flowPromptSha256 = '0'.repeat(64);
    await writeFile(path, canonicalJson(changedProof), 'utf8');
    await assert.rejects(store.loadProductionReady(result.ready.readyId),
      (error: unknown) => error instanceof LayerArtifactError && error.code === 'CORRUPT_ARTIFACT');
    const changedId = JSON.parse(bytes) as any;
    changedId.readyId = `pr_${'0'.repeat(64)}`;
    await writeFile(path, canonicalJson(changedId), 'utf8');
    await assert.rejects(store.loadProductionReady(result.ready.readyId),
      (error: unknown) => error instanceof LayerArtifactError && error.code === 'CORRUPT_ARTIFACT');
  } finally { await rm(root, { recursive: true, force: true }); }
});
