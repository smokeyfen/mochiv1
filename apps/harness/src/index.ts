import {
  classifyCapabilityEvidence,
  createUntestedActionCapabilityMap,
  evaluateFixtureReadiness,
  evaluateSceneFeasibility
} from '@mochi/core';
import { f0BaselineBenchmarkCases, f0BaselineScenePlans, f0CocoonTurmericSerumFixture } from './f0-canary-fixture';
import { pendingGoldenFixtures } from './golden-fixtures';

const map = createUntestedActionCapabilityMap();
const bottleFixture = pendingGoldenFixtures.find(candidate => candidate.archetype === 'BOTTLE');
if (!bottleFixture) throw new Error('MISSING_BOTTLE_FIXTURE');

console.log(JSON.stringify({
  schemaVersion: '1.0.0',
  mode: 'DRY',
  f0GoldenFixture: {
    fixtureId: f0CocoonTurmericSerumFixture.fixtureId,
    readiness: evaluateFixtureReadiness(f0CocoonTurmericSerumFixture)
  },
  f0Cases: f0BaselineBenchmarkCases.map((benchmarkCase, index) => {
    const scene = f0BaselineScenePlans[index]!;
    return {
      benchmarkCaseId: benchmarkCase.benchmarkCaseId,
      actionId: benchmarkCase.actionId,
      capability: map[benchmarkCase.actionId],
      evidence: classifyCapabilityEvidence(benchmarkCase.actionId, 'BOTTLE', []),
      feasibility: evaluateSceneFeasibility(scene, map)
    };
  }),
  pendingGoldenFixture: {
    fixtureId: bottleFixture.fixtureId,
    readiness: evaluateFixtureReadiness(bottleFixture)
  },
  benchmarkObservationCount: 0
}, null, 2));
// Dry mode intentionally creates no BenchmarkObservation or empirical action promotion.
