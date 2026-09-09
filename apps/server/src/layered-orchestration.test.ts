import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SCHEMA_VERSION, type CreativeDirectionInput, type ProductInput } from '@mochi/contracts';
import { createUntestedActionCapabilityMap, simpleActionFastTrackPolicyV1 } from '@mochi/core';
import type { IntelligenceProvider, StructuredIntelligenceRequest } from '@mochi/providers';
import { validateProductFoundationV1, validateSceneBlueprintV1 } from '@mochi/reasoning';
import {
  createLayerArtifactStore,
  LayerArtifactError,
  validateSceneBlueprintBinding,
  validateProductFoundationBinding
} from './layer-artifact-store.ts';
import { canonicalJson } from './production-snapshot.ts';
import {
  ProductionRuntimeError,
  runProductFoundation,
  runSceneBlueprint
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

function createLayerIntelligence(options: { failHumanOnce?: boolean } = {}): MockLayerProvider {
  const requests: StructuredIntelligenceRequest<unknown>[] = [];
  let humanFailuresRemaining = options.failHumanOnce ? 1 : 0;
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
