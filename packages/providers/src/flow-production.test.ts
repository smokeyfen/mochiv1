import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SCENE_ANCHOR_V1,
  SCHEMA_VERSION,
  VISUAL_RHYTHM_V1,
  PRODUCTION_CONTRACT_V1,
  PRODUCTION_SNAPSHOT_V1,
  type ProductionSnapshotV1,
  type SceneAnchorV1
} from '@mochi/contracts';
import {
  FLOW_OMNI_FLASH_1_1_V1,
  FLOW_PRODUCTION_REQUEST_V1,
  FlowProductionError,
  compileFlowProductionRequestV1,
  executeFlowProductionRequestV1,
  prepareSingleSceneCanaryV1,
  resolveFlowNativeVoiceBindingV1,
  resolveFlowReferenceBindingsV1,
  type FlowProductionDriverV1,
  type FlowReferenceBindingV1
} from './flow-production.ts';

function anchor(overrides: Partial<SceneAnchorV1> = {}): SceneAnchorV1 {
  const value: SceneAnchorV1 = {
    schemaVersion: SCHEMA_VERSION, sceneAnchorVersion: SCENE_ANCHOR_V1, snapshotId: `ps_${'a'.repeat(64)}`, projectId: 'project-1', productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
    sceneId: 'product-1:scene:1', index: 1, role: 'HOOK', durationSeconds: 8, aspectRatio: '9:16', physicalObjective: 'Reveal the factual product immediately.', primaryAction: 'PICK_UP',
    startState: { heldBy: 'NONE', placement: 'ON_SURFACE', orientation: 'FRONT_FACING', interactionState: 'BASELINE' }, endState: { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'FRONT_FACING', interactionState: 'BASELINE' }, referenceAssetIds: ['asset-1'], dialogue: 'Mochi Original nhìn nhỏ xinh ha. 😊', voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1',
    hardContinuity: { productIdentity: { productId: 'product-1', canonicalAssetIds: ['asset-1'] }, productGeometryMaterialIdentity: { canonicalReferenceAssetIds: ['asset-1'] }, handIdentity: { skinTone: 'ấm', nailStyle: 'ngắn', jewelry: 'không', dominantHand: 'RIGHT' }, environment: { location: 'bàn', surface: 'gỗ', background: 'trơn', lighting: 'mềm' }, cameraFamily: 'SMARTPHONE_POV', logicalVoiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', logicalVoiceIdentity: { voiceGender: 'FEMALE', voiceRegion: 'SOUTH', voiceStyle: 'review' } },
    softContinuity: { cameraDistance: 'CLOSE', cameraAngle: 'FRONT', crop: 'TIGHT_PRODUCT_HAND', composition: 'IMMEDIATE_CENTER_REVEAL', productScreenPosition: 'CENTER', subtleHandheldBehavior: 'SUBTLE_PUSH_IN' },
    visualRhythm: { rhythmVersion: VISUAL_RHYTHM_V1, presentationIntent: 'HOOK_IMMEDIATE_REVEAL', energy: 'HIGH', primaryActionTiming: 'EARLY', presentationBeats: ['FRAMING_REVEAL', 'HERO_PRESENT'], cameraBehavior: 'SUBTLE_PUSH_IN', exactlyOneCanonicalPrimaryAction: true, atMostOneStateChangingPhysicalAction: true, presentationOnly: true, noAdditionalProductStateTransition: true, noSecondHandProductContactEvent: true, noNewGripOrContactEvent: true, noNewPropInteraction: true, noCapOpening: true, noDispensing: true, noUncontractedCutOrReset: true },
    effects: { sfx: 'NONE', vfx: 'NONE' }
  };
  return { ...value, ...overrides };
}

const bindings = (source = anchor()): readonly FlowReferenceBindingV1[] => [{ sceneId: source.sceneId, logicalAssetId: 'asset-1', flowReferenceId: 'flow-reference-opaque-1' }];
const errorCode = (code: FlowProductionError['code']) => (error: unknown) => error instanceof FlowProductionError && error.code === code;

function snapshot(): ProductionSnapshotV1 {
  const scene = (offset: number) => ({
    sceneId: `product-1:scene:${offset + 1}`, index: (offset + 1) as 1 | 2 | 3 | 4, role: (['HOOK', 'FEATURE', 'PROOF', 'CTA'] as const)[offset]!, physicalObjective: `objective ${offset + 1}`, primaryAction: (['PICK_UP', 'HOLD', 'ROTATE_SLOW', 'PLACE_DOWN'] as const)[offset]!, desiredStateEffect: (['BECOME_HELD', 'REMAIN_HELD', 'CHANGE_ORIENTATION', 'BECOME_PLACED'] as const)[offset]!, startState: { heldBy: offset === 0 ? 'NONE' as const : 'RIGHT_HAND' as const, placement: offset === 0 ? 'ON_SURFACE' as const : 'IN_HAND' as const, orientation: 'FRONT_FACING' as const, interactionState: 'BASELINE' as const }, endState: { heldBy: offset === 3 ? 'NONE' as const : 'RIGHT_HAND' as const, placement: offset === 3 ? 'ON_SURFACE' as const : 'IN_HAND' as const, orientation: 'FRONT_FACING' as const, interactionState: 'BASELINE' as const }, referenceAssetIds: ['asset-1'], keyPoints: [{ index: 1 as const, kind: 'PRODUCT_NAME' as const, truthRefId: null, text: 'Mochi Original' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Mochi snack' }] as const, humanRealismBehavior: { approachBehavior: 'natural', gripAndContactBehavior: 'continuous', actionExecutionBehavior: 'controlled', postActionSettleBehavior: 'settle', cameraBehavior: 'subtle' }, dialogue: `Mochi Original cảnh ${offset + 1} nha.`, spokenUnitCount: 4, voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1' as const, durationSeconds: 8 as const, aspectRatio: '9:16' as const, productionPrompt: 'existing R8 prompt'
  });
  const scenes = [scene(0), scene(1), scene(2), scene(3)] as const;
  const bindings = scenes.map(({ durationSeconds: _durationSeconds, aspectRatio: _aspectRatio, productionPrompt: _productionPrompt, ...binding }) => binding) as unknown as typeof scenes;
  return { schemaVersion: SCHEMA_VERSION, snapshotVersion: PRODUCTION_SNAPSHOT_V1, snapshotId: `ps_${'a'.repeat(64)}`, projectId: 'project-1', productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'], productionContract: { schemaVersion: SCHEMA_VERSION, productionContractVersion: PRODUCTION_CONTRACT_V1, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'], continuity: { schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'], immutable: { handIdentity: { skinTone: 'ấm', nailStyle: 'ngắn', jewelry: 'không', dominantHand: 'RIGHT' }, environment: { location: 'bàn', surface: 'gỗ', background: 'trơn', lighting: 'mềm' }, cameraFamily: 'SMARTPHONE_POV', voiceIdentity: { voiceGender: 'FEMALE', voiceRegion: 'SOUTH', voiceStyle: 'review' } } }, voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', humanRealismGlobalConstraints: { cameraFamily: 'SMARTPHONE_POV', reviewerFaceVisibility: 'FORBIDDEN', preserveHandIdentity: true, preserveDominantHand: true, noUncontractedSecondHand: true, onePrimaryPhysicalAction: true, noUncontractedCutOrReset: true, noProductTeleportation: true, noHandProductPenetration: true, noImpossibleGrip: true, maintainContactContinuity: true, noRoboticMotion: true, subtleHandheldCameraOnly: true, actionCompletionPriority: true, exactCanonicalStates: true }, inputBinding: { scenes: bindings }, scenes } };
}

test('V1 Flow native voice bindings are exact and unsupported or North identities fail closed', () => {
  assert.deepEqual(resolveFlowNativeVoiceBindingV1('VN_FEMALE_SOUTH_REVIEW_V1'), { logicalVoiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', flowBaseIdentity: 'Leda', flowSelection: 'SAVED_CUSTOM_IDENTITY', flowSavedCustomIdentityName: 'Leda Custom' });
  assert.deepEqual(resolveFlowNativeVoiceBindingV1('VN_MALE_SOUTH_REVIEW_V1'), { logicalVoiceIdentityId: 'VN_MALE_SOUTH_REVIEW_V1', flowBaseIdentity: 'Achird', flowSelection: 'CURRENT_DEFAULT_CUSTOMIZE_CHARACTER' });
  assert.throws(() => resolveFlowNativeVoiceBindingV1('VN_FEMALE_NORTH_REVIEW_V1'), errorCode('UNSUPPORTED_VOICE_IDENTITY'));
  assert.throws(() => resolveFlowNativeVoiceBindingV1('unsupported'), errorCode('UNSUPPORTED_VOICE_IDENTITY'));
});

test('reference bindings resolve exact ordered logical references exactly once and reject missing, extra, stale, or wrong-scene values', () => {
  const source = anchor(); const before = structuredClone(source);
  assert.deepEqual(resolveFlowReferenceBindingsV1(source, bindings(source)), bindings(source));
  assert.throws(() => resolveFlowReferenceBindingsV1(source, []), errorCode('REFERENCE_BINDING_INVALID'));
  assert.throws(() => resolveFlowReferenceBindingsV1(source, [...bindings(source), { sceneId: source.sceneId, logicalAssetId: 'asset-2', flowReferenceId: 'flow-2' }]), errorCode('REFERENCE_BINDING_INVALID'));
  assert.throws(() => resolveFlowReferenceBindingsV1(source, [{ ...bindings(source)[0]!, sceneId: 'product-1:scene:2' }]), errorCode('REFERENCE_BINDING_INVALID'));
  assert.throws(() => resolveFlowReferenceBindingsV1(source, [{ ...bindings(source)[0]!, logicalAssetId: 'asset-stale' }]), errorCode('REFERENCE_BINDING_INVALID'));
  assert.deepEqual(source, before);
});

test('FlowProductionRequestV1 retains exact production values, excludes opaque logical IDs from prompt instructions, and preserves upstream anchor', () => {
  const source = anchor(); const before = structuredClone(source);
  const request = compileFlowProductionRequestV1(source, bindings(source));
  assert.equal(request.requestVersion, FLOW_PRODUCTION_REQUEST_V1);
  assert.equal(request.sceneId, source.sceneId);
  assert.equal(request.durationSeconds, 8);
  assert.equal(request.aspectRatio, '9:16');
  assert.equal(request.modelTarget, FLOW_OMNI_FLASH_1_1_V1);
  assert.equal(request.dialogue, source.dialogue);
  assert.equal(request.nativeVoiceBinding.logicalVoiceIdentityId, source.voiceIdentityId);
  assert.deepEqual(request.effects, { sfx: 'NONE', vfx: 'NONE' });
  assert.ok(request.promptUnicodeCharacterCount <= 3200);
  assert.equal(request.promptUnicodeCharacterCount, Array.from(request.prompt).length);
  assert.match(request.prompt, /supplied product reference image\(s\) are authoritative/i);
  assert.doesNotMatch(request.prompt, /product-1|asset-1|ps_[0-9a-f]{64}|VN_FEMALE_SOUTH_REVIEW_V1/i);
  assert.deepEqual(source, before);
});

test('over-budget dialogue cannot become generation-ready', () => {
  const source = anchor({ dialogue: `Nói chính xác ${'ạ'.repeat(3300)}` });
  assert.throws(() => compileFlowProductionRequestV1(source, bindings(source)), errorCode('PROMPT_BUDGET_EXCEEDED'));
});

test('driver is injected and only an explicit execution invokes it once; result is never APPROVED', async () => {
  const source = anchor(); const request = compileFlowProductionRequestV1(source, bindings(source));
  let calls = 0;
  const driver: FlowProductionDriverV1 = {
    async generateScene(input) {
      calls += 1; assert.deepEqual(input, request);
      return { sceneId: input.sceneId, candidateAssetId: 'candidate-1', providerOperationCorrelation: 'operation-1', videoArtifactReference: 'video-1', dialogue: input.dialogue, nativeVoiceBinding: input.nativeVoiceBinding, generationStatus: 'GENERATED' };
    }
  };
  assert.equal(calls, 0);
  const result = await executeFlowProductionRequestV1(driver, request);
  assert.equal(calls, 1);
  assert.equal(result.generationStatus, 'QC_PENDING');
  assert.doesNotMatch(JSON.stringify(result), /APPROVED/);
});

test('canary preparation is PRE-F1 gated, leaves P0 unchanged, and invokes zero driver generations', () => {
  const source = snapshot(); const before = structuredClone(source);
  const result = prepareSingleSceneCanaryV1('BLOCKED_BY_ENVIRONMENT', {} as never, 1, []);
  assert.deepEqual(result, { status: 'SINGLE_SCENE_CANARY_BLOCKED_BY_PRE_F1_LIVE' });
  const ready = prepareSingleSceneCanaryV1('PASS', source, 1, [{ sceneId: 'product-1:scene:1', logicalAssetId: 'asset-1', flowReferenceId: 'flow-reference-opaque-1' }]);
  assert.equal(ready.status, 'SINGLE_SCENE_CANARY_READY_FOR_USER_AUTHORIZATION');
  assert.deepEqual(source, before);
});

test('provider request compiler has no Gemini or Saydi call and Core contracts contain no Flow reference bindings', async () => {
  const [providerSource, contractSource] = await Promise.all([
    import('node:fs/promises').then(fs => fs.readFile(new URL('./flow-production.ts', import.meta.url), 'utf8')),
    import('node:fs/promises').then(fs => fs.readFile(new URL('../../contracts/src/index.ts', import.meta.url), 'utf8'))
  ]);
  assert.doesNotMatch(providerSource, /fetch\(|playwright|analyzeStructured|synthesize/i);
  assert.doesNotMatch(contractSource, /flowReferenceId|FlowProductionRequestV1|providerOperationCorrelation/i);
});
