import test from 'node:test';
import assert from 'node:assert/strict';
import type { ScenePlan } from '@mochi/contracts';
import { SCHEMA_VERSION } from '@mochi/contracts';
import { canTransition, createUntestedActionCapabilityMap, evaluateSceneFeasibility, validateStateCarryover } from './index.ts';

const scene: ScenePlan = {
  schemaVersion: SCHEMA_VERSION, sceneId:'s1', index:1, role:'HOOK', durationSeconds:8, aspectRatio:'9:16',
  primaryObjective:'Pick up product', dialogue:'Test',
  startState:{productState:{cap:'closed'},propState:{},heldBy:'NONE',productOrientation:'FRONT',productPosition:'TABLE'},
  actions:[{action:'PICK_UP',objective:'Pick it up',complexity:1}],
  endState:{productState:{cap:'closed'},propState:{},heldBy:'RIGHT_HAND',productOrientation:'FRONT',productPosition:'CENTER'},
  transitionToNext:'MATCH_CUT', requiredAssetIds:['asset-1']
};

test('feasibility fails closed for untested actions', () => {
  const result = evaluateSceneFeasibility(scene, createUntestedActionCapabilityMap());
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes('action_untested:PICK_UP'));
});

test('feasibility passes after empirical SAFE classification', () => {
  const map = createUntestedActionCapabilityMap();
  map.PICK_UP = 'SAFE';
  assert.equal(evaluateSceneFeasibility(scene, map).passed, true);
});

test('continuity catches unexplained state reset', () => {
  const errors = validateStateCarryover(scene.endState, {...scene.endState, productState:{cap:'open'}});
  assert.ok(errors.includes('product_state_mismatch:cap'));
});

test('lifecycle cannot skip QC', () => {
  assert.equal(canTransition('GENERATED','APPROVED'), false);
  assert.equal(canTransition('GENERATED','QC_PENDING'), true);
});
