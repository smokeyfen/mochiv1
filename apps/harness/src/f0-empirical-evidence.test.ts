import test from 'node:test';
import assert from 'node:assert/strict';
import { BENCHMARK_DIMENSIONS, RUBRIC_0_VERSION, deriveBenchmarkVerdict, validateBenchmarkObservation } from '@mochi/contracts';
import { classifyCapabilityEvidence } from '@mochi/core';
import { f0EmpiricalBenchmarkObservations } from './f0-empirical-evidence';

const pickUpObservation = f0EmpiricalBenchmarkObservations.find(observation => observation.actionId === 'PICK_UP')!;
const holdObservation = f0EmpiricalBenchmarkObservations.find(observation => observation.actionId === 'HOLD')!;

test('F0 records exactly two reviewed real PICK_UP and HOLD observations under Rubric-0', () => {
  assert.equal(f0EmpiricalBenchmarkObservations.length, 2);
  for (const observation of [pickUpObservation, holdObservation]) {
    assert.equal(observation.evidenceOrigin, 'REAL_MODEL_VIDEO');
    assert.equal(observation.rubricVersion, RUBRIC_0_VERSION);
    assert.deepEqual(observation.dimensions.map(result => result.dimension), BENCHMARK_DIMENSIONS);
    assert.equal(deriveBenchmarkVerdict(observation.dimensions), 'PASS');
    assert.deepEqual(validateBenchmarkObservation(observation), []);
  }
  assert.equal(pickUpObservation.benchmarkCaseId, 'f0-cocoon-pick-up-v1');
  assert.equal(holdObservation.benchmarkCaseId, 'f0-cocoon-hold-v1');
  assert.equal(holdObservation.actionId, 'HOLD');
});

test('one F0 PICK_UP and HOLD pass each remain untested and ROTATE_SLOW has no observations', () => {
  const pickUpEvidence = classifyCapabilityEvidence('PICK_UP', 'BOTTLE', f0EmpiricalBenchmarkObservations);
  const holdEvidence = classifyCapabilityEvidence('HOLD', 'BOTTLE', f0EmpiricalBenchmarkObservations);
  const rotateEvidence = classifyCapabilityEvidence('ROTATE_SLOW', 'BOTTLE', f0EmpiricalBenchmarkObservations);
  assert.equal(pickUpEvidence.validObservationIds.length, 1);
  assert.equal(pickUpEvidence.classification, 'UNTESTED');
  assert.ok(pickUpEvidence.reasons.includes('insufficient_real_observations:1<10'));
  assert.equal(holdEvidence.validObservationIds.length, 1);
  assert.equal(holdEvidence.classification, 'UNTESTED');
  assert.ok(holdEvidence.reasons.includes('insufficient_real_observations:1<10'));
  assert.equal(rotateEvidence.validObservationIds.length, 0);
  assert.equal(rotateEvidence.classification, 'UNTESTED');
});
