import type { ScenePlan } from '@mochi/contracts';
import { createUntestedActionCapabilityMap, evaluateSceneFeasibility } from '@mochi/core';

const fixture: ScenePlan = {
  schemaVersion: '1.0.0',
  sceneId: 'benchmark-bottle-pickup', index: 1, role: 'HOOK', durationSeconds: 8, aspectRatio: '9:16',
  primaryObjective: 'Pick up the bottle and hold the front label toward camera.',
  dialogue: 'Dry benchmark fixture only.',
  startState: {productState:{cap:'closed'},propState:{},heldBy:'NONE',productOrientation:'FRONT',productPosition:'TABLE'},
  actions: [{action:'PICK_UP',objective:'Pick up bottle with right hand',complexity:1}],
  endState: {productState:{cap:'closed'},propState:{},heldBy:'RIGHT_HAND',productOrientation:'FRONT',productPosition:'CENTER'},
  transitionToNext:'MATCH_CUT', requiredAssetIds:['product-front']
};

const map = createUntestedActionCapabilityMap();
const result = evaluateSceneFeasibility(fixture, map);
console.log(JSON.stringify({fixture: fixture.sceneId, capability: map.PICK_UP, result}, null, 2));
// Expected at M0: passed=false until empirical benchmark updates the capability map.
