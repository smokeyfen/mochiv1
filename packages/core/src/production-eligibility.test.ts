import assert from 'node:assert/strict';
import test from 'node:test';
import type { StateResolvedScene } from '@mochi/contracts';
import {
  createUntestedActionCapabilityMap,
  evaluateProductionActionEligibility,
  simpleActionFastTrackPolicyV1,
  validateBoundedSimpleAction
} from './index.ts';

const base = { heldBy: 'NONE', placement: 'ON_SURFACE', orientation: 'FRONT_FACING', interactionState: 'BASELINE' } as const;
const held = { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'FRONT_FACING', interactionState: 'BASELINE' } as const;
const rotated = { heldBy: 'RIGHT_HAND', placement: 'IN_HAND', orientation: 'ROTATED', interactionState: 'BASELINE' } as const;
const scene = (primaryAction: StateResolvedScene['primaryAction'], startState = base, endState = held): StateResolvedScene => ({
  sceneId: 'p:scene:1', index: 1, role: 'HOOK', durationSeconds: 8, aspectRatio: '9:16', primaryTruthRefId: 'identity',
  physicalObjective: 'show', primaryAction, desiredStateEffect: primaryAction === 'PICK_UP' ? 'BECOME_HELD' : primaryAction === 'ROTATE_SLOW' ? 'CHANGE_ORIENTATION' : 'REMAIN_HELD', dialogueDraft: 'draft', referenceAssetIds: ['a'], startState, endState
});

test('SIMPLE_ACTION_FAST_TRACK_V1 is exactly the three user-authorized primitives', () => {
  assert.equal(simpleActionFastTrackPolicyV1.policyVersion, 'SIMPLE_ACTION_FAST_TRACK_V1');
  assert.deepEqual(simpleActionFastTrackPolicyV1.authorizedActionIds, ['PICK_UP', 'HOLD', 'ROTATE_SLOW']);
});

test('fast-track authorization leaves empirical UNTESTED classifications intact', () => {
  const map = createUntestedActionCapabilityMap();
  const cases = [
    scene('PICK_UP', base, held), scene('HOLD', held, held), scene('ROTATE_SLOW', held, rotated)
  ];
  for (const value of cases) {
    const result = evaluateProductionActionEligibility(value, map, simpleActionFastTrackPolicyV1);
    assert.equal(map[value.primaryAction], 'UNTESTED');
    assert.equal(result.empiricalClassification, 'UNTESTED');
    assert.equal(result.status, 'FAST_TRACK_AUTHORIZED');
  }
  assert.notEqual(map.PICK_UP, 'SAFE');
});

test('unrelated UNTESTED, AVOID, state-heavy, and hidden-secondary actions remain blocked', () => {
  const map = createUntestedActionCapabilityMap();
  assert.equal(evaluateProductionActionEligibility(scene('PLACE_DOWN', held, base), map, simpleActionFastTrackPolicyV1).status, 'BLOCKED');
  map.PICK_UP = 'AVOID';
  assert.equal(evaluateProductionActionEligibility(scene('PICK_UP', base, held), map, simpleActionFastTrackPolicyV1).status, 'BLOCKED');
  assert.equal(evaluateProductionActionEligibility(scene('OPEN_SIMPLE', held, { ...held, interactionState: 'OPENED' }), createUntestedActionCapabilityMap(), simpleActionFastTrackPolicyV1).status, 'BLOCKED');
  const hidden = { ...scene('PICK_UP', base, held), secondaryActionId: 'OPEN_SIMPLE' } as unknown as StateResolvedScene;
  assert.ok(validateBoundedSimpleAction(hidden).includes('unsupported_secondary_action'));
  assert.equal(evaluateProductionActionEligibility(hidden, createUntestedActionCapabilityMap(), simpleActionFastTrackPolicyV1).status, 'BLOCKED');
});
