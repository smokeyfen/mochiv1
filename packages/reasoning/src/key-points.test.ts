import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SCHEMA_VERSION,
  validateKeyPointPlan,
  type Global4ScenePlan,
  type R2CommittedProductContext
} from '@mochi/contracts';
import {
  KeyPointPlanError,
  buildKeyPointPlanInputText,
  buildPlanningTruthCatalog,
  planKeyPoints
} from './index.ts';

const context: R2CommittedProductContext = {
  schemaVersion: SCHEMA_VERSION,
  productId: 'product-1',
  sourceEvidenceVersion: 'evidence-v1',
  canonicalAssetIds: ['asset-1'],
  productTruth: {
    schemaVersion: SCHEMA_VERSION,
    productId: 'product-1',
    sourceEvidenceVersion: 'evidence-v1',
    canonicalAssetIds: ['asset-1'],
    name: '  Mochi™ Original  ',
    category: 'snack',
    identityDescription: 'Mochi snack',
    facts: [
      { factId: 'geometry:0', kind: 'GEOMETRY', text: 'Round pieces', evidenceAssetIds: ['asset-1'] },
      { factId: 'color:0', kind: 'COLOR', text: 'White coating', evidenceAssetIds: ['asset-1'] },
      { factId: 'packaging:0', kind: 'PACKAGING', text: 'Individually wrapped', evidenceAssetIds: ['asset-1'] }
    ],
    allowedClaims: [],
    prohibitedInferences: [],
    unresolvedUncertainties: [],
    unresolvedContradictions: [],
    exclusions: []
  },
  referenceAssessment: {
    schemaVersion: SCHEMA_VERSION,
    productId: 'product-1',
    sourceEvidenceVersion: 'evidence-v1',
    canonicalAssetIds: ['asset-1'],
    assetAssessments: [{
      assetId: 'asset-1', targetVisibility: 'CLEAR', identityConfidence: 'HIGH', geometryCoverage: 'STRONG',
      labelReadability: 'CLEAR', occlusion: 'NONE', backgroundInterference: 'LOW', multiProductAmbiguity: 'NONE'
    }],
    readiness: 'READY',
    limitationCodes: []
  }
};

const globalPlan = (): Global4ScenePlan => ({
  schemaVersion: SCHEMA_VERSION,
  productId: context.productId,
  sourceEvidenceVersion: context.sourceEvidenceVersion,
  canonicalAssetIds: context.canonicalAssetIds,
  continuity: {
    schemaVersion: SCHEMA_VERSION,
    productId: context.productId,
    sourceEvidenceVersion: context.sourceEvidenceVersion,
    canonicalAssetIds: context.canonicalAssetIds,
    immutable: {
      handIdentity: { skinTone: 'warm', nailStyle: 'short', jewelry: 'none', dominantHand: 'RIGHT' },
      environment: { location: 'desk', surface: 'wood', background: 'plain', lighting: 'soft' },
      cameraFamily: 'SMARTPHONE_POV',
      voiceIdentity: { voiceGender: 'FEMALE', voiceRegion: 'SOUTH', voiceStyle: 'review' }
    }
  },
  referenceLimitations: [],
  referenceReadiness: 'READY',
  scenes: [
    ['identity', 'PICK_UP', 'BECOME_HELD'],
    ['geometry:0', 'HOLD', 'REMAIN_HELD'],
    ['color:0', 'ROTATE_SLOW', 'CHANGE_ORIENTATION'],
    ['identity', 'PLACE_DOWN', 'BECOME_PLACED']
  ].map(([primaryTruthRefId, primaryAction, desiredStateEffect], offset) => ({
    sceneId: `${context.productId}:scene:${offset + 1}`,
    index: (offset + 1) as 1 | 2 | 3 | 4,
    role: ['HOOK', 'FEATURE', 'PROOF', 'CTA'][offset] as 'HOOK' | 'FEATURE' | 'PROOF' | 'CTA',
    durationSeconds: 8 as const,
    aspectRatio: '9:16' as const,
    primaryTruthRefId,
    physicalObjective: 'show product',
    primaryAction: primaryAction as Global4ScenePlan['scenes'][number]['primaryAction'],
    desiredStateEffect: desiredStateEffect as Global4ScenePlan['scenes'][number]['desiredStateEffect'],
    dialogueDraft: 'locked R4 draft',
    referenceAssetIds: ['asset-1'],
    ...(offset < 3 ? { transitionToNext: 'MATCH_CUT' as const } : {})
  }))
});

const validDecision = { secondaryTruthRefIds: ['identity', 'geometry:0', 'geometry:0'] };

function provider(result: unknown, calls: { value: number; request?: unknown }, failure = false) {
  return {
    id: 'mock-intelligence',
    async analyzeStructured<T>(request: { parse: (value: unknown) => T }) {
      calls.value += 1;
      calls.request = request;
      if (failure) throw new Error('provider unavailable');
      return { data: request.parse(result) };
    }
  };
}

function request(result: unknown = validDecision, failure = false) {
  const calls = { value: 0, request: undefined as unknown };
  const plan = globalPlan();
  return { calls, plan, value: { context, globalPlan: plan, intelligence: provider(result, calls, failure) } };
}

test('R4.1 creates the exact four-scene, eight-key-point provider-neutral plan in one empty-media call', async () => {
  const fixture = request();
  const output = await planKeyPoints(fixture.value);
  assert.equal(fixture.calls.value, 1);
  assert.deepEqual((fixture.calls.request as { media: unknown[] }).media, []);
  assert.equal(output.scenes.length, 4);
  assert.equal(output.scenes.reduce((count, scene) => count + scene.keyPoints.length, 0), 8);
  assert.deepEqual(output.scenes.map(scene => scene.sceneId), fixture.plan.scenes.map(scene => scene.sceneId));
  assert.deepEqual(validateKeyPointPlan(output, context, fixture.plan, buildPlanningTruthCatalog(context)), []);
  assert.ok(validateKeyPointPlan({ ...output, unexpected: true }, context, fixture.plan, buildPlanningTruthCatalog(context)).length > 0);
});

test('R4.1 preserves Product Name byte-for-byte and exposes only role and physical objective context', async () => {
  const fixture = request();
  const output = await planKeyPoints(fixture.value);
  const inputText = buildKeyPointPlanInputText(fixture.value);
  assert.equal(output.scenes[0]?.keyPoints[0]?.text, context.productTruth.name);
  assert.equal(output.scenes[0]?.keyPoints[0]?.kind, 'PRODUCT_NAME');
  assert.ok(inputText.includes('"role":"HOOK"'));
  assert.ok(inputText.includes('"physicalObjective":"show product"'));
  assert.equal(inputText.includes(context.productTruth.name), false);
});

test('R4.1 rejects a model Product Name override, leaving no override output to survive', async () => {
  const fixture = request({ ...validDecision, productName: 'rewritten name' });
  await assert.rejects(planKeyPoints(fixture.value), (error: unknown) =>
    error instanceof KeyPointPlanError && error.code === 'INVALID_MODEL_OUTPUT');
  assert.equal(fixture.calls.value, 1);
});

test('R4.1 rejects an unknown truth ID', async () => {
  const fixture = request({ secondaryTruthRefIds: ['identity', 'geometry:0', 'unknown'] });
  await assert.rejects(planKeyPoints(fixture.value), (error: unknown) =>
    error instanceof KeyPointPlanError && error.code === 'INVALID_MODEL_OUTPUT');
});

test('R4.1 rejects a same-scene duplicate truth', async () => {
  const fixture = request({ secondaryTruthRefIds: ['geometry:0', 'geometry:0', 'geometry:0'] });
  await assert.rejects(planKeyPoints(fixture.value), (error: unknown) =>
    error instanceof KeyPointPlanError && error.code === 'INVALID_MODEL_OUTPUT');
});

test('R4.1 rejects Scene 4 new truth introduction', async () => {
  const fixture = request({ secondaryTruthRefIds: ['identity', 'geometry:0', 'packaging:0'] });
  await assert.rejects(planKeyPoints(fixture.value), (error: unknown) =>
    error instanceof KeyPointPlanError && error.code === 'INVALID_MODEL_OUTPUT');
});

test('R4.1 allows Scene 4 to reuse a non-primary truth actually established by Scene 2', async () => {
  const fixture = request({ secondaryTruthRefIds: ['packaging:0', 'geometry:0', 'packaging:0'] });
  const output = await planKeyPoints(fixture.value);
  assert.equal(output.scenes[1]?.keyPoints[1]?.truthRefId, 'packaging:0');
  assert.equal(output.scenes[3]?.keyPoints[1]?.truthRefId, 'packaging:0');
  assert.deepEqual(validateKeyPointPlan(output, context, fixture.plan, buildPlanningTruthCatalog(context)), []);
});

test('R4.1 rejects wrong upstream source or scene binding before provider', async () => {
  for (const mutate of [
    (plan: Global4ScenePlan): Global4ScenePlan => ({ ...plan, productId: 'wrong-product' }),
    (plan: Global4ScenePlan): Global4ScenePlan => ({
      ...plan,
      scenes: plan.scenes.map((scene, offset) => offset === 0 ? { ...scene, sceneId: 'wrong-scene' } : scene)
    })
  ]) {
    const fixture = request();
    fixture.value.globalPlan = mutate(fixture.plan);
    await assert.rejects(planKeyPoints(fixture.value), (error: unknown) =>
      error instanceof KeyPointPlanError && error.code === 'INVALID_INPUT');
    assert.equal(fixture.calls.value, 0);
  }
});

test('R4.1 rejects malformed provider output', async () => {
  const fixture = request({ secondaryTruthRefIds: ['identity', 'geometry:0'] });
  await assert.rejects(planKeyPoints(fixture.value), (error: unknown) =>
    error instanceof KeyPointPlanError && error.code === 'INVALID_MODEL_OUTPUT');
  assert.equal(fixture.calls.value, 1);
});

test('R4.1 maps provider failure to its dedicated boundary', async () => {
  const fixture = request(validDecision, true);
  await assert.rejects(planKeyPoints(fixture.value), (error: unknown) =>
    error instanceof KeyPointPlanError && error.code === 'PROVIDER_FAILURE');
  assert.equal(fixture.calls.value, 1);
});

test('R4.1 makes at most one provider call and invalid upstream makes none', async () => {
  const valid = request();
  await planKeyPoints(valid.value);
  assert.equal(valid.calls.value, 1);
  const invalid = request();
  invalid.value.globalPlan = { ...invalid.plan, scenes: invalid.plan.scenes.slice(0, 3) };
  await assert.rejects(planKeyPoints(invalid.value), (error: unknown) =>
    error instanceof KeyPointPlanError && error.code === 'INVALID_INPUT');
  assert.equal(invalid.calls.value, 0);
});

test('R4.1 fails closed when the shared planning catalog has insufficient truth', async () => {
  const fixture = request();
  fixture.value.context = {
    ...context,
    productTruth: { ...context.productTruth, facts: [] }
  };
  await assert.rejects(planKeyPoints(fixture.value), (error: unknown) =>
    error instanceof KeyPointPlanError && error.code === 'INSUFFICIENT_PLANNABLE_TRUTH');
  assert.equal(fixture.calls.value, 0);
});
