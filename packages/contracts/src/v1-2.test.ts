import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACTION_IDS_V1_2,
  FINALIZED_SCRIPT_V1_2,
  FOUR_SCENE_EXECUTION_SET_V2,
  HUMAN_REALISM_V2,
  MAX_SCENE_REPLAN_ATTEMPTS_V1_2,
  PRODUCT_FOUNDATION_V1_2,
  PRODUCTION_COMPILED_V1_2,
  PRODUCTION_ELIGIBILITY_POLICY_V1_2,
  PRODUCTION_READY_V1_2,
  SCENE_BLUEPRINT_V1_2,
  SCENE_EXECUTION_CONTRACT_V2,
  SFX_PLAN_V2,
  STATE_ENGINE_V2,
  TWO_BEAT_ACTION_SEQUENCE_V1_2,
  auditFourSceneExecutionSetV2,
  validateActionBeatV1_2,
  validateActionCapabilityMapV1_2,
  validateAffordanceBindingV1_2,
  validateCameraFocusV2,
  validateCommercialScoreV1_2,
  validateFactualAuthorityReferenceV1_2,
  validateFourSceneExecutionSetV2,
  validateFunctionalPhysicalStateV2,
  validateProductionEligibilityPolicyV1_2,
  validateReferenceBindingV1_2,
  validateSceneExecutionContractV2
} from './index.ts';

const roles = ['HOOK', 'FEATURE', 'PROOF', 'CTA'] as const;
const productName = 'Mochi Serum';

function state(sequence: number) {
  return {
    physical: {
      productVariantId: 'variant-reviewed',
      productPlacement: sequence === 0 ? 'ON_TABLE' : 'IN_HAND',
      productOrientation: sequence < 2 ? 'FRONT' : 'THREE_QUARTER',
      gripContact: sequence === 0 ? [] : ['right palm supports bottle'],
      activeHands: sequence === 0 ? [] : ['RIGHT'],
      visibleComponents: sequence < 4 ? ['bottle', 'cap'] : ['bottle'],
      containedMaterial: 'RETAINED'
    },
    functional: {
      closure: sequence < 4 ? 'CLOSED' : 'OPEN',
      cap: sequence < 4 ? 'CAP_ATTACHED' : 'CAP_REMOVED',
      activation: 'NOT_APPLICABLE',
      extension: 'NOT_APPLICABLE',
      fold: 'NOT_APPLICABLE',
      partAttachment: 'NOT_APPLICABLE',
      content: 'CONTENT_RETAINED',
      application: 'NOT_APPLICABLE'
    }
  };
}

function camera(sceneIndex: number, beat: 'A' | 'B') {
  return {
    distance: sceneIndex % 2 === 0 ? 'CLOSE' : 'MEDIUM',
    angle: beat === 'A' ? 'FRONT' : 'THREE_QUARTER_RIGHT',
    focusTarget: beat === 'A' ? 'FULL_PRODUCT' : 'FUNCTION_RESULT',
    cameraBehavior: beat === 'A' ? 'STABLE_HANDHELD' : 'MICRO_REFRAME',
    actionVisible: true,
    continuousTake: true,
    stateHidingCut: false
  };
}

function realism(beat: 'A' | 'B') {
  return {
    realismVersion: HUMAN_REALISM_V2,
    approach: `${beat} ordinary reach`,
    gripAndContact: `${beat} continuous contact`,
    forceAndTiming: `${beat} gentle force`,
    microAdjustment: `${beat} small correction`,
    completionAndSettle: `${beat} visible completion`,
    cameraCoordination: `${beat} phone follows naturally`,
    preservesDeclaredHands: true,
    preservesStateTransition: true
  };
}

function sfx(beat: 'A' | 'B') {
  return {
    sfxVersion: SFX_PLAN_V2,
    mode: 'NONE',
    events: [],
    actionBeat: beat
  };
}

function lineage() {
  return {
    productFoundationVersion: PRODUCT_FOUNDATION_V1_2,
    sceneBlueprintVersion: SCENE_BLUEPRINT_V1_2,
    finalizedScriptVersion: FINALIZED_SCRIPT_V1_2,
    productionCompiledVersion: PRODUCTION_COMPILED_V1_2,
    productFoundationId: 'pf12-foundation',
    sceneBlueprintId: 'sb12-blueprint',
    finalizedScriptId: 'fs12-script',
    projectId: 'project-1',
    productId: 'product-1',
    productVariantId: 'variant-reviewed',
    sourceEvidenceVersion: 'evidence-v1',
    creativeSeed: '0123456789abcdef0123456789abcdef'
  };
}

function scene(index: number) {
  const start = state((index - 1) * 2);
  const mid = state((index - 1) * 2 + 1);
  const end = state(index * 2);
  const actionA = index === 1 ? 'PICK_UP' : 'HOLD_STEADY';
  const actionB = index === 4 ? 'REMOVE_CAP' : 'ROTATE_SLOW';
  const pairA = `scene-${index}-pair-1`;
  const pairB = `scene-${index}-pair-2`;
  const sentenceA = index === 1 ? `${productName} là lựa chọn mình đang cầm.` : `Cách dùng này rõ ràng và tiện lợi.`;
  const sentenceB = `Thao tác tiếp theo cho thấy điểm hữu ích.`;
  const eligibility = {
    productionEligibility: 'V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED',
    truthEligible: true,
    affordanceEligible: true,
    stateEligible: true,
    handEligible: true,
    timingEligible: true,
    cameraEligible: true,
    humanRealismEligible: true,
    riskEligible: true
  };
  const beat = (
    label: 'A' | 'B',
    order: 1 | 2,
    actionId: string,
    semanticGoal: string,
    inputState: ReturnType<typeof state>,
    outputState: ReturnType<typeof state>,
    startSeconds: number,
    endSeconds: number
  ) => ({
    beat: label,
    order,
    actionId,
    semanticPairId: label === 'A' ? pairA : pairB,
    actionFamily: actionId === 'REMOVE_CAP' ? 'FUNCTIONAL' : 'SIMPLE_PRESENTATION',
    semanticGoal,
    handRequirement: { handCount: 'ONE', hands: ['RIGHT'], declared: true },
    affordanceBindings: actionId === 'REMOVE_CAP'
      ? [{ affordanceId: 'cap-removal', authorityReferences: [{ authority: 'PRODUCT_TRUTH_FACT', factId: 'packaging:0' }] }]
      : [],
    capability: 'UNTESTED',
    eligibility,
    inputState,
    outputState,
    timing: { startSeconds, endSeconds, targetDurationSeconds: endSeconds - startSeconds },
    cameraFocus: camera(index, label),
    humanRealism: realism(label),
    sfx: sfx(label)
  });
  return {
    schemaVersion: '1.0.0',
    sceneExecutionContractVersion: SCENE_EXECUTION_CONTRACT_V2,
    actionSequenceVersion: TWO_BEAT_ACTION_SEQUENCE_V1_2,
    stateEngineVersion: STATE_ENGINE_V2,
    humanRealismVersion: HUMAN_REALISM_V2,
    sfxPlanVersion: SFX_PLAN_V2,
    lineage: lineage(),
    sceneId: `product-1:scene:${index}`,
    index,
    role: roles[index - 1],
    durationSeconds: 8,
    aspectRatio: '9:16',
    cameraFamily: 'SMARTPHONE_POV',
    reviewerFaceVisibility: 'FORBIDDEN',
    productName,
    voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1',
    creativeSeed: lineage().creativeSeed,
    seededDecisionTraces: [{
      creativeSeed: lineage().creativeSeed,
      namespace: `scene-${index}-action-pair`,
      orderedCandidateIds: [`candidate-${index}-a`, `candidate-${index}-b`],
      integerWeights: [3, 2],
      selectedId: `candidate-${index}-a`
    }],
    referenceBindings: [{
      assetId: 'asset-canonical',
      purpose: 'CANONICAL_REVIEWED_PRODUCT_IDENTITY',
      productVariantId: 'variant-reviewed',
      authorityReferences: [{ authority: 'PRODUCT_NAME', exactProductName: productName }]
    }],
    semanticPairs: [
      {
        pairId: pairA,
        order: 1,
        insightId: `insight-${index}-a`,
        authorityReferences: index === 1
          ? [{ authority: 'PRODUCT_NAME', exactProductName: productName }]
          : [{ authority: 'PRODUCT_TRUTH_FACT', factId: 'geometry:0' }],
        semanticGoal: `show benefit ${index}a`,
        actionBeat: 'A',
        dialogueSentenceIndex: 1,
        keyPointIndex: 1
      },
      {
        pairId: pairB,
        order: 2,
        insightId: `insight-${index}-b`,
        authorityReferences: [{ authority: 'PRODUCT_TRUTH_FACT', factId: 'packaging:0' }],
        semanticGoal: `show benefit ${index}b`,
        actionBeat: 'B',
        dialogueSentenceIndex: 2,
        keyPointIndex: 2
      }
    ],
    states: { start, mid, end },
    actionBeats: [
      beat('A', 1, actionA, `complete ${actionA}`, start, mid, 0, 4),
      beat('B', 2, actionB, `complete ${actionB}`, mid, end, 4, 8)
    ],
    sequenceCompatibility: {
      status: 'PASS',
      actionAId: actionA,
      actionBId: actionB,
      actionAOutputState: mid,
      actionBInputState: mid,
      exactMidStateMatch: true,
      noHiddenReset: true,
      noTeleportation: true,
      noStateHidingCut: true,
      noThirdPrimaryAction: true
    },
    handoffTiming: {
      actionAStartSeconds: 0,
      actionAEndSeconds: 4,
      handoffAtSeconds: 4,
      actionBStartSeconds: 4,
      actionBEndSeconds: 8,
      evidence: 'continuous visible handoff'
    },
    dialogueSentences: [
      { sentenceIndex: 1, pairId: pairA, actionBeat: 'A', text: sentenceA, language: 'vi-VN', containsExactProductName: index === 1, timing: { startSeconds: 0.25, endSeconds: 3.5, spokenUnitCount: 8 } },
      { sentenceIndex: 2, pairId: pairB, actionBeat: 'B', text: sentenceB, language: 'vi-VN', containsExactProductName: false, timing: { startSeconds: 4.25, endSeconds: 7.75, spokenUnitCount: 8 } }
    ],
    keyPoints: [
      { keyPointIndex: 1, pairId: pairA, actionBeat: 'A', sentenceIndex: 1, text: index === 1 ? productName : `Điểm hữu ích cảnh ${index}`, sourceSentenceText: sentenceA, derivedFromDialogue: true },
      { keyPointIndex: 2, pairId: pairB, actionBeat: 'B', sentenceIndex: 2, text: `Thao tác rõ cảnh ${index}`, sourceSentenceText: sentenceB, derivedFromDialogue: true }
    ],
    effects: { bgm: 'NONE', vfx: 'NONE' }
  };
}

function validSet() {
  const scenes = [scene(1), scene(2), scene(3), scene(4)];
  for (let offset = 1; offset < scenes.length; offset += 1) {
    scenes[offset]!.states.start = structuredClone(scenes[offset - 1]!.states.end);
    scenes[offset]!.actionBeats[0]!.inputState = structuredClone(scenes[offset]!.states.start);
  }
  return {
    schemaVersion: '1.0.0',
    executionSetVersion: FOUR_SCENE_EXECUTION_SET_V2,
    lineage: lineage(),
    productName,
    scenes
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

test('V1.2 exports its frozen versions and separate bounded authorization vocabulary', () => {
  assert.deepEqual([
    PRODUCT_FOUNDATION_V1_2, SCENE_BLUEPRINT_V1_2, FINALIZED_SCRIPT_V1_2,
    PRODUCTION_COMPILED_V1_2, PRODUCTION_READY_V1_2, TWO_BEAT_ACTION_SEQUENCE_V1_2,
    STATE_ENGINE_V2, HUMAN_REALISM_V2, SFX_PLAN_V2, SCENE_EXECUTION_CONTRACT_V2
  ], [
    'PRODUCT_FOUNDATION_V1_2', 'SCENE_BLUEPRINT_V1_2', 'FINALIZED_SCRIPT_V1_2',
    'PRODUCTION_COMPILED_V1_2', 'PRODUCTION_READY_V1_2', 'TWO_BEAT_ACTION_SEQUENCE_V1_2',
    'STATE_ENGINE_V2', 'HUMAN_REALISM_V2', 'SFX_PLAN_V2', 'SCENE_EXECUTION_CONTRACT_V2'
  ]);
  assert.equal(MAX_SCENE_REPLAN_ATTEMPTS_V1_2, 2);
  assert.equal(PRODUCTION_ELIGIBILITY_POLICY_V1_2.defaultCapability, 'UNTESTED');
  assert.equal(PRODUCTION_ELIGIBILITY_POLICY_V1_2.neverPromotesUntestedToSafe, true);
  assert.deepEqual(validateProductionEligibilityPolicyV1_2(PRODUCTION_ELIGIBILITY_POLICY_V1_2), []);
  assert.deepEqual(validateCommercialScoreV1_2({ purchaseTrigger: 100, productAppeal: 80, visualDemonstrability: 70, relevanceUsefulness: 60, distinctiveness: 50 }), []);
  assert.ok(validateCommercialScoreV1_2({ purchaseTrigger: 101, productAppeal: 80, visualDemonstrability: 70, relevanceUsefulness: 60, distinctiveness: 50 }).length > 0);
  const capabilities = Object.fromEntries(PRODUCTION_ELIGIBILITY_POLICY_V1_2.actionIds.map(actionId => [actionId, 'UNTESTED']));
  assert.deepEqual(validateActionCapabilityMapV1_2(capabilities), []);
  assert.ok(validateActionCapabilityMapV1_2({ ...capabilities, REMOVE_CAP: 'SAFE', providerId: 'forbidden' }).length > 0);
});

test('V1.2 exposes only the canonical expanded Primary Action IDs', () => {
  assert.deepEqual(ACTION_IDS_V1_2, [
    'PICK_UP', 'HOLD_STEADY', 'MOVE_CLOSER', 'MOVE_AWAY', 'RAISE_SLIGHTLY',
    'LOWER_SLIGHTLY', 'TILT_LEFT_RIGHT', 'TILT_UP_DOWN', 'ROTATE_SLOW',
    'FLIP_FRONT_BACK', 'PLACE_DOWN', 'SET_UPRIGHT', 'OPEN_SIMPLE', 'CLOSE_SIMPLE',
    'REMOVE_CAP', 'REPLACE_CAP', 'PRESS_BUTTON', 'TOGGLE_SWITCH', 'SLIDE_CONTROL',
    'TWIST_CONTROL', 'PULL_TAB', 'PUSH_PART', 'PULL_PART', 'EXTEND_SIMPLE',
    'RETRACT_SIMPLE', 'FOLD_SIMPLE', 'UNFOLD_SIMPLE', 'INSERT_SIMPLE',
    'REMOVE_PART_SIMPLE', 'ATTACH_SIMPLE', 'DETACH_SIMPLE', 'POUR_SIMPLE',
    'DISPENSE_SIMPLE', 'APPLY_SIMPLE', 'SCOOP_SIMPLE', 'WIPE_SIMPLE', 'ROLL_SIMPLE',
    'SPIN_SIMPLE', 'ASSEMBLE_SIMPLE', 'SEPARATE_SIMPLE', 'LOAD_SIMPLE', 'UNLOAD_SIMPLE'
  ]);
});

test('factual authority references distinguish exact Product Name from Product Truth facts and fail closed', () => {
  assert.deepEqual(validateFactualAuthorityReferenceV1_2({ authority: 'PRODUCT_NAME', exactProductName: productName }), []);
  assert.deepEqual(validateFactualAuthorityReferenceV1_2({ authority: 'PRODUCT_TRUTH_FACT', factId: 'geometry:0' }), []);
  assert.ok(validateFactualAuthorityReferenceV1_2({ authority: 'PRODUCT_NAME', factId: 'geometry:0' }).length > 0);
  assert.ok(validateFactualAuthorityReferenceV1_2({ authority: 'PRODUCT_TRUTH_FACT', factId: 'geometry:0', providerId: 'forbidden' }).length > 0);

  const value = scene(1);
  assert.deepEqual(validateSceneExecutionContractV2(value), []);
  value.semanticPairs[0]!.authorityReferences = [{ authority: 'PRODUCT_TRUTH_FACT', factId: 'geometry:0' }];
  assert.ok(validateSceneExecutionContractV2(value).includes('scene1_product_name_authority'));
});

test('State Engine V2 represents the bounded functional states required by the expanded action vocabulary', () => {
  const value = state(0);
  value.functional = {
    closure: 'OPEN',
    cap: 'CAP_REMOVED',
    activation: 'ACTIVATED',
    extension: 'EXTENDED',
    fold: 'UNFOLDED',
    partAttachment: 'PART_DETACHED',
    content: 'CONTENT_TRANSFERRED',
    application: 'APPLIED'
  };
  assert.deepEqual(validateFunctionalPhysicalStateV2(value), []);
  value.functional.content = 'TRANSFERRED';
  assert.ok(validateFunctionalPhysicalStateV2(value).includes('content'));
});

test('Camera/Focus V2 accepts the approved bounded grammar and rejects free-form focus targets', () => {
  const base = camera(1, 'A');
  for (const distance of ['DETAIL', 'CLOSE', 'MEDIUM']) {
    assert.deepEqual(validateCameraFocusV2({ ...base, distance }), [], `distance ${distance}`);
  }
  for (const angle of ['FRONT', 'THREE_QUARTER_LEFT', 'THREE_QUARTER_RIGHT', 'SIDE', 'TOP_DOWN', 'SLIGHT_LOW', 'OVER_HAND']) {
    assert.deepEqual(validateCameraFocusV2({ ...base, angle }), [], `angle ${angle}`);
  }
  for (const focusTarget of ['FULL_PRODUCT', 'FEATURE_DETAIL', 'INTERACTION_POINT', 'PRODUCT_LABEL', 'FUNCTION_RESULT', 'MATERIAL_SURFACE', 'HAND_PRODUCT_CONTACT']) {
    assert.deepEqual(validateCameraFocusV2({ ...base, focusTarget }), [], `focus ${focusTarget}`);
  }
  for (const cameraBehavior of ['STABLE_HANDHELD', 'SUBTLE_PUSH_IN', 'SUBTLE_PULL_BACK', 'SUBTLE_PARALLAX_LEFT', 'SUBTLE_PARALLAX_RIGHT', 'MICRO_REFRAME', 'FOLLOW_ACTION', 'NATURAL_AUTOFOCUS_SETTLE']) {
    assert.deepEqual(validateCameraFocusV2({ ...base, cameraBehavior }), [], `behavior ${cameraBehavior}`);
  }
  assert.ok(validateCameraFocusV2({ ...base, focusTarget: 'product identity' }).length > 0);
});

test('presentation actions need no pseudo-affordance while functional actions require Product Truth-backed affordances', () => {
  const presentation = scene(1).actionBeats[0]!;
  assert.deepEqual(validateActionBeatV1_2(presentation), []);

  const functional = scene(4).actionBeats[1]!;
  assert.deepEqual(validateActionBeatV1_2(functional), []);
  functional.affordanceBindings = [];
  assert.ok(validateActionBeatV1_2(functional).includes('affordances'));

  functional.affordanceBindings = [{
    affordanceId: 'cap-removal',
    authorityReferences: [{ authority: 'PRODUCT_NAME', exactProductName: productName }]
  }];
  assert.ok(validateAffordanceBindingV1_2(functional.affordanceBindings[0]!).includes('product_truth_authority'));
});

test('dialogue timing windows may be smaller than their corresponding beats but may not escape them', () => {
  const value = scene(1);
  assert.notEqual(value.dialogueSentences[0]!.timing.startSeconds, value.actionBeats[0]!.timing.startSeconds);
  assert.deepEqual(validateSceneExecutionContractV2(value), []);
  value.dialogueSentences[1]!.timing.startSeconds = 3.99;
  assert.ok(validateSceneExecutionContractV2(value).includes('sentence_timing_2'));
});

test('a supporting variant may differ without mutating the canonical reviewed product reference', () => {
  const value = scene(1);
  value.referenceBindings.push({
    assetId: 'asset-supported-variant',
    purpose: 'SUPPORTING_VARIANT',
    productVariantId: 'variant-supported-other',
    authorityReferences: [{ authority: 'PRODUCT_TRUTH_FACT', factId: 'packaging:1' }]
  });
  assert.deepEqual(validateReferenceBindingV1_2(value.referenceBindings[1]), []);
  assert.deepEqual(validateSceneExecutionContractV2(value), []);
});

test('Scene Execution Contract V2 accepts an exact two-beat START/MID/END representation', () => {
  const value = scene(1);
  assert.deepEqual(validateSceneExecutionContractV2(value), []);
  assert.equal(value.actionBeats.length, 2);
  assert.equal(value.actionBeats[0]!.capability, 'UNTESTED');
  assert.equal(value.actionBeats[0]!.eligibility.productionEligibility, 'V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED');
  assert.deepEqual(value.actionBeats[0]!.outputState, value.states.mid);
  assert.deepEqual(value.actionBeats[1]!.inputState, value.states.mid);
});

test('Scene Execution Contract V2 fails closed for every scene-local structural mutation', () => {
  const cases: readonly [string, (value: ReturnType<typeof scene>) => void][] = [
    ['wrong version', value => { value.sceneExecutionContractVersion = 'SCENE_ANCHOR_V1'; }],
    ['wrong sequence version', value => { value.actionSequenceVersion = 'ONE_ACTION'; }],
    ['duration', value => { value.durationSeconds = 7; }],
    ['aspect', value => { value.aspectRatio = '16:9'; }],
    ['camera family', value => { value.cameraFamily = 'CINEMATIC'; }],
    ['reviewer face', value => { value.reviewerFaceVisibility = 'ALLOWED'; }],
    ['logical voice identity', value => { value.voiceIdentityId = ' '; }],
    ['one primary action', value => { value.actionBeats.pop(); }],
    ['three primary actions', value => { value.actionBeats.push(clone(value.actionBeats[1]!)); }],
    ['wrong action order', value => { value.actionBeats.reverse(); }],
    ['beat-to-pair mapping', value => { value.actionBeats[0]!.semanticPairId = 'wrong'; }],
    ['START mismatch', value => { value.actionBeats[0]!.inputState = state(99); }],
    ['MID output mismatch', value => { value.actionBeats[0]!.outputState = state(99); }],
    ['Beat B wrong MID', value => { value.actionBeats[1]!.inputState = state(99); }],
    ['END mismatch', value => { value.actionBeats[1]!.outputState = state(99); }],
    ['handoff too early', value => { value.handoffTiming.handoffAtSeconds = 3.49; }],
    ['dialogue count', value => { value.dialogueSentences.pop(); }],
    ['pair mapping', value => { value.semanticPairs[0]!.actionBeat = 'B'; }],
    ['sentence mapping', value => { value.dialogueSentences[0]!.pairId = 'wrong'; }],
    ['key-point mapping', value => { value.keyPoints[0]!.sentenceIndex = 2; }],
    ['key-point count', value => { value.keyPoints.pop(); }],
    ['Scene 1 sentence Product Name', value => { value.dialogueSentences[0]!.text = 'Tên khác hoàn toàn.'; }],
    ['Scene 1 key-point Product Name', value => { value.keyPoints[0]!.text = 'Tên khác'; }],
    ['camera shape', value => { Object.assign(value.actionBeats[0]!.cameraFocus, { providerCameraId: 'x' }); }],
    ['human realism shape', value => { delete (value.actionBeats[0]!.humanRealism as { approach?: string }).approach; }],
    ['SFX shape', value => { value.actionBeats[0]!.sfx.actionBeat = 'B'; }],
    ['BGM', value => { value.effects.bgm = 'MUSIC'; }],
    ['VFX', value => { value.effects.vfx = 'SPARKLES'; }],
    ['capability promotion contradiction', value => { value.actionBeats[0]!.capability = 'AVOID'; }],
    ['incomplete authorization evidence', value => { value.actionBeats[0]!.eligibility.riskEligible = false; }],
    ['provider field', value => { Object.assign(value.lineage, { providerOperationId: 'secret' }); }],
    ['hidden reset', value => { value.sequenceCompatibility.noHiddenReset = false; }],
    ['teleportation', value => { value.sequenceCompatibility.noTeleportation = false; }],
    ['state-hiding cut', value => { value.actionBeats[0]!.cameraFocus.stateHidingCut = true; }],
    ['canonical reference variant mutation', value => { value.referenceBindings[0]!.productVariantId = 'other-variant'; }],
    ['seed mutation', value => { value.seededDecisionTraces[0]!.creativeSeed = 'ffffffffffffffffffffffffffffffff'; }],
    ['extra top-level field', value => { Object.assign(value, { provider: 'forbidden' }); }]
  ];
  for (const [name, mutate] of cases) {
    const value = scene(1);
    mutate(value);
    assert.ok(validateSceneExecutionContractV2(value).length > 0, name);
  }
});

test('four-scene audit is all-or-nothing and rejects cross-scene lineage and continuity failures', () => {
  const valid = validSet();
  assert.deepEqual(validateFourSceneExecutionSetV2(valid), []);
  assert.deepEqual(auditFourSceneExecutionSetV2(valid), {
    auditVersion: 'FOUR_SCENE_EXECUTION_AUDIT_V1_2',
    status: 'PASS',
    issues: []
  });

  const cases: readonly [string, (value: ReturnType<typeof validSet>) => void][] = [
    ['set version', value => { value.executionSetVersion = 'PRODUCTION_READY_V1'; }],
    ['scene count', value => { value.scenes.pop(); }],
    ['scene order', value => { [value.scenes[0], value.scenes[1]] = [value.scenes[1]!, value.scenes[0]!]; }],
    ['mixed V1 lineage', value => { value.scenes[2]!.lineage.sceneBlueprintVersion = 'SCENE_BLUEPRINT_V1'; }],
    ['mixed source lineage', value => { value.scenes[2]!.lineage.sourceEvidenceVersion = 'other-evidence'; }],
    ['mixed creative seed', value => { value.scenes[2]!.creativeSeed = 'ffffffffffffffffffffffffffffffff'; }],
    ['adjacent physical state', value => { value.scenes[1]!.states.start.physical.productOrientation = 'BACK'; }],
    ['adjacent functional state', value => {
      value.scenes[1]!.states.start.functional.cap = 'CAP_REMOVED';
      value.scenes[1]!.actionBeats[0]!.inputState.functional.cap = 'CAP_REMOVED';
    }],
    ['canonical reference mutation', value => { value.scenes[2]!.referenceBindings[0]!.assetId = 'other-canonical'; }],
    ['missing camera diversity', value => {
      const first = clone(value.scenes[0]!.actionBeats[0]!.cameraFocus);
      for (const item of value.scenes) for (const beat of item.actionBeats) beat.cameraFocus = clone(first);
    }],
    ['provider-only set field', value => { Object.assign(value, { flowProjectId: 'forbidden' }); }]
  ];
  for (const [name, mutate] of cases) {
    const value = validSet();
    mutate(value);
    const result = auditFourSceneExecutionSetV2(value);
    assert.equal(result.status, 'FAIL', name);
    assert.ok(result.issues.length > 0, name);
  }
});

test('four-scene structural camera diversity does not require every camera dimension to vary', () => {
  const value = validSet();
  for (const item of value.scenes) {
    for (const beat of item.actionBeats) {
      beat.cameraFocus.distance = 'CLOSE';
      beat.cameraFocus.angle = 'FRONT';
      beat.cameraFocus.focusTarget = 'FULL_PRODUCT';
      beat.cameraFocus.cameraBehavior = beat.beat === 'A' ? 'STABLE_HANDHELD' : 'FOLLOW_ACTION';
    }
  }
  assert.equal(auditFourSceneExecutionSetV2(value).status, 'PASS');
});
