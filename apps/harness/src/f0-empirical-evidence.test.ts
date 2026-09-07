import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BENCHMARK_DIMENSIONS, RUBRIC_0_VERSION, deriveBenchmarkVerdict, validateBenchmarkObservation } from '@mochi/contracts';
import { classifyCapabilityEvidence } from '@mochi/core';
import { f0BenchmarkExecutionReceipts } from './f0-benchmark-batch-planner';
import { f0EmpiricalBenchmarkObservations } from './f0-empirical-evidence';

const historicalObservationIds = [
  'f0-cocoon-pick-up-v1-attempt-01-review',
  'f0-cocoon-hold-v1-attempt-01-review'
] as const;
const batchOneObservationIds = [
  'f0-cocoon-pick-up-v1-attempt-02-review',
  'f0-cocoon-hold-v1-attempt-02-review',
  'f0-cocoon-rotate-slow-v1-attempt-01-review'
] as const;
const historicalObservations = historicalObservationIds.map(observationId =>
  f0EmpiricalBenchmarkObservations.find(observation => observation.observationId === observationId)!
);
const batchOneObservations = batchOneObservationIds.map(observationId =>
  f0EmpiricalBenchmarkObservations.find(observation => observation.observationId === observationId)!
);

test('F0 preserves its two historical attempt-one observations and records exactly five trusted empirical observations', () => {
  assert.equal(f0EmpiricalBenchmarkObservations.length, 5);
  assert.deepEqual(f0EmpiricalBenchmarkObservations.slice(0, 2), historicalObservations);
  assert.deepEqual(historicalObservations.map(observation => [
    observation.observationId, observation.benchmarkCaseId, observation.candidateAssetId, observation.reviewedAt
  ]), [
    ['f0-cocoon-pick-up-v1-attempt-01-review', 'f0-cocoon-pick-up-v1', 'f0-cocoon-pick-up-v1-attempt-01-video', '2026-09-06T09:26:26.153Z'],
    ['f0-cocoon-hold-v1-attempt-01-review', 'f0-cocoon-hold-v1', 'f0-cocoon-hold-v1-attempt-01-video', '2026-09-06T09:46:30.495Z']
  ]);
  assert.equal(
    createHash('sha256').update(JSON.stringify(historicalObservations)).digest('hex'),
    'f8d82eda6012b7726fddb00db4cb0ab122909bc7d7e1bb95eb18b7c5db13faa3'
  );
});

test('each controlled Batch 1 observation validates with the complete passing Rubric-0 result', () => {
  assert.deepEqual(batchOneObservations.map(observation => observation.observationId), batchOneObservationIds);
  for (const observation of batchOneObservations) {
    assert.equal(observation.evidenceOrigin, 'REAL_MODEL_VIDEO');
    assert.equal(observation.rubricVersion, RUBRIC_0_VERSION);
    assert.deepEqual(validateBenchmarkObservation(observation), []);
    assert.equal(observation.dimensions.length, 7);
    assert.equal(new Set(observation.dimensions.map(result => result.dimension)).size, 7);
    assert.deepEqual(observation.dimensions.map(result => result.dimension), BENCHMARK_DIMENSIONS);
    assert.ok(observation.dimensions.every(result => result.passed === true));
    assert.equal(deriveBenchmarkVerdict(observation.dimensions), 'PASS');
    assert.equal(observation.verdict, 'PASS');
  }
});

test('each controlled Batch 1 candidate asset matches its receipt and observations contain no video or provider runtime data', () => {
  const observationKeys = [
    'schemaVersion', 'rubricVersion', 'observationId', 'benchmarkCaseId', 'fixtureId', 'archetype', 'actionId',
    'evidenceOrigin', 'candidateAssetId', 'reviewerId', 'reviewedAt', 'dimensions', 'verdict', 'reviewerNotes'
  ].sort();
  for (const observation of batchOneObservations) {
    const receipt = f0BenchmarkExecutionReceipts.find(candidate => candidate.benchmarkCaseId === observation.benchmarkCaseId);
    assert.ok(receipt);
    assert.equal(observation.candidateAssetId, receipt.candidateAssetId);
    assert.deepEqual(Object.keys(observation).sort(), observationKeys);
    assert.ok(!Object.keys(observation).some(key => /(?:bytes|url|provider|session|project|cookie|credential|operation)/i.test(key)));
  }
});

test('two PICK_UP and HOLD passes and one ROTATE_SLOW pass remain untested under the locked policy', () => {
  const pickUpEvidence = classifyCapabilityEvidence('PICK_UP', 'BOTTLE', f0EmpiricalBenchmarkObservations);
  const holdEvidence = classifyCapabilityEvidence('HOLD', 'BOTTLE', f0EmpiricalBenchmarkObservations);
  const rotateEvidence = classifyCapabilityEvidence('ROTATE_SLOW', 'BOTTLE', f0EmpiricalBenchmarkObservations);
  for (const evidence of [pickUpEvidence, holdEvidence]) {
    assert.equal(evidence.validObservationIds.length, 2);
    assert.equal(evidence.classification, 'UNTESTED');
    assert.ok(evidence.reasons.includes('insufficient_real_observations:2<10'));
  }
  assert.equal(rotateEvidence.validObservationIds.length, 1);
  assert.equal(rotateEvidence.classification, 'UNTESTED');
  assert.ok(rotateEvidence.reasons.includes('insufficient_real_observations:1<10'));
});
