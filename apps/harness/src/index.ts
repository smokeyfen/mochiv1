import {
  classifyCapabilityEvidence,
  createUntestedActionCapabilityMap,
  evaluateFixtureReadiness,
  evaluateSceneFeasibility
} from '@mochi/core';
import { f0BaselineBenchmarkCases, f0BaselineScenePlans, f0CocoonTurmericSerumFixture } from './f0-canary-fixture';
import { f0EmpiricalBenchmarkObservations } from './f0-empirical-evidence';
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
      evidence: classifyCapabilityEvidence(benchmarkCase.actionId, 'BOTTLE', f0EmpiricalBenchmarkObservations),
      feasibility: evaluateSceneFeasibility(scene, map)
    };
  }),
  pendingGoldenFixture: {
    fixtureId: bottleFixture.fixtureId,
    readiness: evaluateFixtureReadiness(bottleFixture)
  },
  benchmarkObservationCount: f0EmpiricalBenchmarkObservations.length
}, null, 2));
// Dry mode reads recorded evidence but creates no new BenchmarkObservation or action promotion.
