import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProductInput, ScenePlan } from './index.ts';
import { SCHEMA_VERSION, validateProductInput, validateScenePlan } from './index.ts';

test('product input rejects missing assets', () => {
  const input: ProductInput = {
    schemaVersion: SCHEMA_VERSION, productId:'p1', name:'Bottle', details:'Test', category:'Beauty', audience:'Adults', assets:[]
  };
  assert.ok(validateProductInput(input).includes('assets_required'));
});

test('scene plan locks duration and aspect', () => {
  const scene = {
    schemaVersion: SCHEMA_VERSION, sceneId:'s1', index:1, role:'HOOK', durationSeconds:6, aspectRatio:'16:9',
    primaryObjective:'Pick up', dialogue:'Test', startState:{productState:{},propState:{},heldBy:'NONE',productOrientation:'FRONT',productPosition:'TABLE'},
    actions:[{action:'PICK_UP',objective:'Pick up',complexity:1}],
    endState:{productState:{},propState:{},heldBy:'RIGHT_HAND',productOrientation:'FRONT',productPosition:'CENTER'}, requiredAssetIds:['a1']
  } as unknown as ScenePlan;
  const issues = validateScenePlan(scene);
  assert.ok(issues.includes('duration_must_be_8'));
  assert.ok(issues.includes('aspect_must_be_9_16'));
});
