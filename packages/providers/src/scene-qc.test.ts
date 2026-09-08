import assert from 'node:assert/strict';
import test from 'node:test';
import { GENERATED_SCENE_CANDIDATE_V1, SCENE_ANCHOR_V1, SCHEMA_VERSION, VISUAL_RHYTHM_V1, type SceneAnchorV1 } from '@mochi/contracts';
import { compileFlowProductionRequestV1, mapFlowGeneratedCandidateV1 } from './flow-production.ts';
import { SCENE_QC_OUTPUT_SCHEMA, SceneQcError, evaluateSceneQcV1, normalizeVietnameseSpeechForQc, type SceneQcInputV1 } from './scene-qc.ts';

function anchor(): SceneAnchorV1 { return { schemaVersion: SCHEMA_VERSION, sceneAnchorVersion: SCENE_ANCHOR_V1, snapshotId: `ps_${'a'.repeat(64)}`, projectId: 'project-1', productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'], sceneId: 'product-1:scene:1', index: 1, role: 'HOOK', durationSeconds: 8, aspectRatio: '9:16', physicalObjective: 'Reveal product.', primaryAction: 'PICK_UP', startState: { heldBy: 'NONE', placement: 'ON_SURFACE', orientation: 'FRONT_FACING', interactionState: 'BASELINE' }, endState: { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'FRONT_FACING', interactionState: 'BASELINE' }, referenceAssetIds: ['asset-1'], dialogue: 'Mochi Original nhìn nhỏ xinh ha.', voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', hardContinuity: { productIdentity: { productId: 'product-1', canonicalAssetIds: ['asset-1'] }, productGeometryMaterialIdentity: { canonicalReferenceAssetIds: ['asset-1'] }, handIdentity: { skinTone: 'ấm', nailStyle: 'ngắn', jewelry: 'không', dominantHand: 'RIGHT' }, environment: { location: 'bàn', surface: 'gỗ', background: 'trơn', lighting: 'mềm' }, cameraFamily: 'SMARTPHONE_POV', logicalVoiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', logicalVoiceIdentity: { voiceGender: 'FEMALE', voiceRegion: 'SOUTH', voiceStyle: 'review' } }, softContinuity: { cameraDistance: 'CLOSE', cameraAngle: 'FRONT', crop: 'TIGHT_PRODUCT_HAND', composition: 'IMMEDIATE_CENTER_REVEAL', productScreenPosition: 'CENTER', subtleHandheldBehavior: 'SUBTLE_PUSH_IN' }, visualRhythm: { rhythmVersion: VISUAL_RHYTHM_V1, presentationIntent: 'HOOK_IMMEDIATE_REVEAL', energy: 'HIGH', primaryActionTiming: 'EARLY', presentationBeats: ['FRAMING_REVEAL'], cameraBehavior: 'SUBTLE_PUSH_IN', exactlyOneCanonicalPrimaryAction: true, atMostOneStateChangingPhysicalAction: true, presentationOnly: true, noAdditionalProductStateTransition: true, noSecondHandProductContactEvent: true, noNewGripOrContactEvent: true, noNewPropInteraction: true, noCapOpening: true, noDispensing: true, noUncontractedCutOrReset: true }, effects: { sfx: 'NONE', vfx: 'NONE' } }; }
const passObservation = (transcript = 'Mochi Original nhìn nhỏ xinh ha.') => ({ sceneId: 'product-1:scene:1', candidateAssetId: 'candidate-1', frame: ['PRODUCT_FIDELITY', 'HAND_ANATOMY', 'VISIBLE_ARTIFACTS', 'REVIEWER_FACE_VISIBILITY'].map(gate => ({ gate, status: 'PASS' })), temporal: ['ACTION_COMPLETION', 'PHYSICS', 'CAMERA_REALISM', 'UNEXPECTED_CUTS', 'START_STATE_MATCH', 'END_STATE_MATCH'].map(gate => ({ gate, status: 'PASS' })), speechDetected: true, spokenTranscript: transcript, dialogueComplete: true, unexpectedSpeechDetected: false, presentationDynamics: { status: 'PASS', meaningfulVisualProgression: true, excessiveStaticHold: false, rhythmIntentObserved: true, notes: 'natural progression' } });
function input(observation = passObservation()): { value: SceneQcInputV1; calls: () => number } {
  const source = anchor(); const request = compileFlowProductionRequestV1(source, [{ sceneId: source.sceneId, logicalAssetId: 'asset-1', flowReferenceId: 'flow-ref-1' }]); let count = 0;
  return { value: { candidate: { candidateVersion: GENERATED_SCENE_CANDIDATE_V1, sceneId: source.sceneId, candidateAssetId: 'candidate-1', dialogue: source.dialogue, voiceIdentityId: source.voiceIdentityId, lifecycleStatus: 'QC_PENDING' }, anchor: source, productionRequest: request, video: { sceneId: source.sceneId, candidateAssetId: 'candidate-1', mimeType: 'video/mp4', dataBase64: 'AQ==' }, references: [{ sceneId: source.sceneId, assetId: 'asset-1', mimeType: 'image/jpeg', dataBase64: 'AQ==' }], intelligence: { id: 'mock', async analyzeStructured(request) { count += 1; return { data: request.parse(observation) }; } } }, calls: () => count };
}
const invalid = (code: SceneQcError['code']) => (error: unknown) => error instanceof SceneQcError && error.code === code;

test('Flow generated result maps to a provider-neutral QC candidate without Flow metadata', () => {
  const source = anchor(); const request = compileFlowProductionRequestV1(source, [{ sceneId: source.sceneId, logicalAssetId: 'asset-1', flowReferenceId: 'flow-ref-1' }]);
  const candidate = mapFlowGeneratedCandidateV1({ sceneId: source.sceneId, candidateAssetId: 'candidate-1', providerOperationCorrelation: 'operation-secret', videoArtifactReference: 'flow-video-secret', dialogue: source.dialogue, nativeVoiceBinding: request.nativeVoiceBinding, generationStatus: 'GENERATED' }, request);
  assert.deepEqual(candidate, { candidateVersion: GENERATED_SCENE_CANDIDATE_V1, sceneId: source.sceneId, candidateAssetId: 'candidate-1', dialogue: source.dialogue, voiceIdentityId: source.voiceIdentityId, lifecycleStatus: 'QC_PENDING' });
  assert.doesNotMatch(JSON.stringify(candidate), /operation|flow-reference|flow-video/i);
});

test('SCENE_QC_V1 schema declares exact closed properties, enums, and gate array sizes', () => {
  assert.equal(SCENE_QC_OUTPUT_SCHEMA.additionalProperties, false);
  assert.deepEqual(SCENE_QC_OUTPUT_SCHEMA.properties.frame.items.properties.status.enum, ['PASS', 'FAIL']);
  assert.equal(SCENE_QC_OUTPUT_SCHEMA.properties.frame.minItems, 4);
  assert.equal(SCENE_QC_OUTPUT_SCHEMA.properties.temporal.maxItems, 6);
  assert.equal(SCENE_QC_OUTPUT_SCHEMA.properties.presentationDynamics.additionalProperties, false);
});

test('one clean mocked Omni scene makes exactly one intelligence call and passes all critical Frame, Temporal, and Speech gates', async () => {
  const fixture = input(); const anchorBefore = structuredClone(fixture.value.anchor); const requestBefore = structuredClone(fixture.value.productionRequest);
  const report = await evaluateSceneQcV1(fixture.value);
  assert.equal(fixture.calls(), 1); assert.equal(report.result, 'SCENE_QC_PASS'); assert.equal(report.intelligenceCallCount, 1);
  assert.deepEqual(report.frameGates.map(x => x.gate), ['PRODUCT_FIDELITY', 'HAND_ANATOMY', 'VISIBLE_ARTIFACTS', 'REVIEWER_FACE_VISIBILITY']);
  assert.deepEqual(report.temporalGates.map(x => x.gate), ['ACTION_COMPLETION', 'PHYSICS', 'CAMERA_REALISM', 'UNEXPECTED_CUTS', 'START_STATE_MATCH', 'END_STATE_MATCH']);
  assert.deepEqual(report.speechGates.map(x => x.gate), ['SPEECH_DETECTED', 'DIALOGUE_COMPLETE', 'NO_UNEXPECTED_SPEECH', 'EXACT_DIALOGUE_LEXICAL_MATCH']);
  assert.doesNotMatch(JSON.stringify(report), /AQ==|operation|flow-ref|session/i); assert.deepEqual(fixture.value.anchor, anchorBefore); assert.deepEqual(fixture.value.productionRequest, requestBefore);
});

test('one failed critical gate fails without averaging while a presentation WARN alone does not', async () => {
  const fail = passObservation(); fail.frame[1]!.status = 'FAIL'; const one = input(fail); const failed = await evaluateSceneQcV1(one.value);
  assert.equal(failed.result, 'SCENE_QC_FAIL'); assert.deepEqual(failed.criticalFailureReasons, ['HAND_ANATOMY']); assert.equal(one.calls(), 1);
  const warn = passObservation(); warn.presentationDynamics.status = 'WARN'; warn.presentationDynamics.excessiveStaticHold = true; const two = input(warn);
  assert.equal((await evaluateSceneQcV1(two.value)).result, 'SCENE_QC_PASS');
});

test('speech comparison is deterministic: punctuation/case only passes; lexical changes, diacritics, unexpected or absent speech fail', async () => {
  assert.equal(normalizeVietnameseSpeechForQc('Mochi, ORIGINAL nhìn nhỏ xinh ha!'), normalizeVietnameseSpeechForQc(anchor().dialogue));
  for (const transcript of ['Mochi Original nhìn nhỏ xinh', 'Mochi Original nhìn nhỏ xinh ha thêm', 'Mochi Original trông dễ thương ha.', 'Mochi Original nhin nho xinh ha.']) {
    const fixture = input(passObservation(transcript)); assert.equal((await evaluateSceneQcV1(fixture.value)).result, 'SCENE_QC_FAIL');
  }
  const unexpected = passObservation(); unexpected.unexpectedSpeechDetected = true; assert.equal((await evaluateSceneQcV1(input(unexpected).value)).result, 'SCENE_QC_FAIL');
  const absent = passObservation(); absent.speechDetected = false; absent.dialogueComplete = false; assert.equal((await evaluateSceneQcV1(input(absent).value)).result, 'SCENE_QC_FAIL');
});

test('deterministic candidate, voice, video and reference binding failures make zero intelligence calls', async () => {
  const cases = [
    (x: SceneQcInputV1) => ({ ...x, candidate: { ...x.candidate, sceneId: 'wrong' } }),
    (x: SceneQcInputV1) => ({ ...x, candidate: { ...x.candidate, dialogue: 'wrong' } }),
    (x: SceneQcInputV1) => ({ ...x, candidate: { ...x.candidate, voiceIdentityId: 'VN_MALE_SOUTH_REVIEW_V1' } }),
    (x: SceneQcInputV1) => ({ ...x, video: { ...x.video, dataBase64: '' } }),
    (x: SceneQcInputV1) => ({ ...x, video: { ...x.video, mimeType: 'image/png' } }),
    (x: SceneQcInputV1) => ({ ...x, references: [] }),
    (x: SceneQcInputV1) => ({ ...x, references: [...x.references, x.references[0]!] }),
    (x: SceneQcInputV1) => ({ ...x, references: [{ ...x.references[0]!, sceneId: 'stale' }] })
  ];
  for (const mutate of cases) { const fixture = input(); await assert.rejects(evaluateSceneQcV1(mutate(fixture.value)), invalid('INVALID_INPUT')); assert.equal(fixture.calls(), 0); }
});

test('malformed model output and provider failure fail closed', async () => {
  const malformed = input({ ...passObservation(), frame: [] }); await assert.rejects(evaluateSceneQcV1(malformed.value), invalid('INVALID_MODEL_OUTPUT'));
  const fixture = input(); const broken = { ...fixture.value, intelligence: { id: 'broken', async analyzeStructured() { throw new Error('provider'); } } };
  await assert.rejects(evaluateSceneQcV1(broken), invalid('PROVIDER_FAILURE'));
});
