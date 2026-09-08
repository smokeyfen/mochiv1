import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCTION_CONTRACT_V1,
  PRODUCTION_SNAPSHOT_V1,
  SCHEMA_VERSION,
  SCENE_ANCHOR_V1,
  compileSceneAnchorsV1,
  validateProductionSnapshotV1,
  validateSceneAnchorAgainstSnapshot,
  validateSceneAnchorV1,
  type ProductionSnapshotV1
} from './index.ts';

const roles = ['HOOK', 'FEATURE', 'PROOF', 'CTA'] as const;
const actions = ['PICK_UP', 'HOLD', 'ROTATE_SLOW', 'PLACE_DOWN'] as const;
const dialogue = ['Mochi Original mở đầu nha.', 'Cầm gọn tay nè.', 'Xoay nhẹ để xem rõ nha.', 'Mochi Original rất gọn.'] as const;
const state = (heldBy: 'NONE' | 'RIGHT_HAND', placement: 'ON_SURFACE' | 'IN_HAND', orientation: 'FRONT_FACING' | 'ROTATED') => ({ heldBy, placement, orientation, interactionState: 'BASELINE' as const });

function snapshot(): ProductionSnapshotV1 {
  const continuity = {
    schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
    immutable: {
      handIdentity: { skinTone: 'warm', nailStyle: 'short', jewelry: 'none', dominantHand: 'RIGHT' as const },
      environment: { location: 'table', surface: 'wood', background: 'plain', lighting: 'soft' },
      cameraFamily: 'SMARTPHONE_POV' as const,
      voiceIdentity: { voiceGender: 'FEMALE' as const, voiceRegion: 'SOUTH' as const, voiceStyle: 'review' }
    }
  };
  const scene = (offset: number) => {
    const start = offset === 0 ? state('NONE', 'ON_SURFACE', 'FRONT_FACING') : offset === 2 ? state('RIGHT_HAND', 'IN_HAND', 'FRONT_FACING') : state('RIGHT_HAND', 'IN_HAND', 'ROTATED');
    const end = offset === 0 ? state('RIGHT_HAND', 'IN_HAND', 'FRONT_FACING') : offset === 2 ? state('RIGHT_HAND', 'IN_HAND', 'ROTATED') : offset === 3 ? state('NONE', 'ON_SURFACE', 'ROTATED') : start;
    const binding = { sceneId: `product-1:scene:${offset + 1}`, index: (offset + 1) as 1 | 2 | 3 | 4, role: roles[offset]!, physicalObjective: `objective ${offset + 1}`, primaryAction: actions[offset]!, desiredStateEffect: offset === 0 ? 'BECOME_HELD' as const : offset === 1 ? 'REMAIN_HELD' as const : offset === 2 ? 'CHANGE_ORIENTATION' as const : 'BECOME_PLACED' as const, startState: start, endState: end, referenceAssetIds: ['asset-1'], keyPoints: [{ index: 1 as const, kind: 'PRODUCT_NAME' as const, truthRefId: null, text: 'Mochi Original' }, { index: 2 as const, kind: 'PRODUCT_TRUTH' as const, truthRefId: 'identity', text: 'Mochi snack' }] as const, humanRealismBehavior: { approachBehavior: 'natural', gripAndContactBehavior: 'continuous', actionExecutionBehavior: 'controlled', postActionSettleBehavior: 'settle', cameraBehavior: 'subtle' }, dialogue: dialogue[offset]!, spokenUnitCount: 4, voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1' as const };
    return { ...binding, durationSeconds: 8 as const, aspectRatio: '9:16' as const, productionPrompt: 'existing R8 prompt' };
  };
  const scenes = [scene(0), scene(1), scene(2), scene(3)] as const;
  const bindings = scenes.map(({ durationSeconds: _durationSeconds, aspectRatio: _aspectRatio, productionPrompt: _productionPrompt, ...binding }) => binding) as unknown as typeof scenes;
  return {
    schemaVersion: SCHEMA_VERSION, snapshotVersion: PRODUCTION_SNAPSHOT_V1, snapshotId: `ps_${'a'.repeat(64)}`, projectId: 'project-1', productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'],
    productionContract: { schemaVersion: SCHEMA_VERSION, productionContractVersion: PRODUCTION_CONTRACT_V1, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-1'], continuity, voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', humanRealismGlobalConstraints: { locked: true }, inputBinding: { scenes: bindings }, scenes }
  };
}

test('Visual Rhythm and SceneAnchor deterministically bind exactly four P0 scenes without changing production values', () => {
  const source = snapshot(); const before = structuredClone(source);
  assert.deepEqual(validateProductionSnapshotV1(source), []);
  const first = compileSceneAnchorsV1(source); const second = compileSceneAnchorsV1(source);
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
  assert.deepEqual(source, before);
  assert.deepEqual(first.map(anchor => anchor.sceneId), source.productionContract.scenes.map(scene => scene.sceneId));
  assert.deepEqual(first.map(anchor => anchor.primaryAction), source.productionContract.scenes.map(scene => scene.primaryAction));
  assert.deepEqual(first.map(anchor => anchor.startState), source.productionContract.scenes.map(scene => scene.startState));
  assert.deepEqual(first.map(anchor => anchor.endState), source.productionContract.scenes.map(scene => scene.endState));
  assert.deepEqual(first.map(anchor => anchor.dialogue), dialogue);
  assert.ok(first.every(anchor => anchor.visualRhythm.presentationBeats.length <= 2));
  assert.ok(first.every(anchor => typeof anchor.visualRhythm.cameraBehavior === 'string'));
  assert.ok(first.every(anchor => anchor.visualRhythm.noAdditionalProductStateTransition && anchor.visualRhythm.noSecondHandProductContactEvent && anchor.visualRhythm.noCapOpening && anchor.visualRhythm.noDispensing));
  assert.deepEqual(first.map(anchor => anchor.hardContinuity), [first[0]!.hardContinuity, first[0]!.hardContinuity, first[0]!.hardContinuity, first[0]!.hardContinuity]);
  assert.notDeepEqual(first.map(anchor => anchor.softContinuity), [first[0]!.softContinuity, first[0]!.softContinuity, first[0]!.softContinuity, first[0]!.softContinuity]);
  assert.equal(new Set(first.map(anchor => JSON.stringify(anchor.visualRhythm))).size, 4);
  for (const anchor of first) assert.deepEqual(validateSceneAnchorAgainstSnapshot(anchor, source), []);
});

test('SceneAnchor validation rejects stale snapshot, scene, action, state, dialogue, reference, voice, and rhythm mutations', () => {
  const source = snapshot(); const anchor = compileSceneAnchorsV1(source)[0]!;
  assert.deepEqual(validateSceneAnchorV1(anchor), []);
  for (const changed of [
    { ...anchor, snapshotId: `ps_${'b'.repeat(64)}` },
    { ...anchor, sceneId: 'other' },
    { ...anchor, primaryAction: 'HOLD' as const },
    { ...anchor, startState: { ...anchor.startState, heldBy: 'RIGHT_HAND' as const } },
    { ...anchor, dialogue: 'changed' },
    { ...anchor, referenceAssetIds: ['other'] },
    { ...anchor, voiceIdentityId: 'VN_MALE_SOUTH_REVIEW_V1' as const },
    { ...anchor, visualRhythm: { ...anchor.visualRhythm, presentationBeats: ['HERO_PRESENT', 'DETAIL_EMPHASIS', 'ACTION_SETTLE'] } }
  ]) assert.ok(validateSceneAnchorAgainstSnapshot(changed as typeof anchor, source).length > 0);
  const staleSource = { ...source, snapshotId: `ps_${'c'.repeat(64)}` };
  assert.ok(validateSceneAnchorAgainstSnapshot(anchor, staleSource).length > 0);
  assert.equal(JSON.stringify(compileSceneAnchorsV1(source)).match(/flow|session|credential|provider/i), null);
  assert.equal(anchor.sceneAnchorVersion, SCENE_ANCHOR_V1);
});
