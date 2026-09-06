import type { ScenePlan } from '@mochi/contracts';
import {
  classifyCapabilityEvidence,
  createUntestedActionCapabilityMap,
  evaluateFixtureReadiness,
  evaluateSceneFeasibility
} from '@mochi/core';
import { pendingGoldenFixtures } from './golden-fixtures';

const fixture: ScenePlan = {
  schemaVersion: '1.0.0',
  sceneId: 'benchmark-bottle-pickup', index: 1, role: 'HOOK', durationSeconds: 8, aspectRatio: '9:16',
  primaryObjective: 'Pick up the bottle and hold the product clearly toward camera.',
  dialogue: 'Dry benchmark fixture only.',
  startState: {productState:{cap:'closed'},propState:{},heldBy:'NONE',productOrientation:'FRONT',productPosition:'TABLE'},
  actions: [{action:'PICK_UP',objective:'Pick up bottle with right hand',complexity:1}],
  endState: {productState:{cap:'closed'},propState:{},heldBy:'RIGHT_HAND',productOrientation:'FRONT',productPosition:'CENTER'},
  transitionToNext:'MATCH_CUT', requiredAssetIds:['product-reference']
};

const map = createUntestedActionCapabilityMap();
const result = evaluateSceneFeasibility(fixture, map);
const bottleFixture = pendingGoldenFixtures.find(candidate => candidate.archetype === 'BOTTLE');
if (!bottleFixture) throw new Error('MISSING_BOTTLE_FIXTURE');

console.log(JSON.stringify({
  schemaVersion: '1.0.0',
  mode: 'DRY',
  fixture: fixture.sceneId,
  goldenFixture: {
    fixtureId: bottleFixture.fixtureId,
    readiness: evaluateFixtureReadiness(bottleFixture)
  },
  capability: map.PICK_UP,
  evidence: classifyCapabilityEvidence('PICK_UP', 'BOTTLE', []),
  result
}, null, 2));
// Expected at M0: passed=false until empirical benchmark updates the capability map.
