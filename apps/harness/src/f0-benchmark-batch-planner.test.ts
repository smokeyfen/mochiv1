import test from 'node:test';
import assert from 'node:assert/strict';
import type { ActionId, BenchmarkObservation } from '@mochi/contracts';
import { BENCHMARK_DIMENSIONS } from '@mochi/contracts';
import { createUntestedActionCapabilityMap } from '@mochi/core';
import {
  F0_BENCHMARK_EXECUTION_RECEIPT_STATUS,
  F0_BENCHMARK_EXECUTION_RECEIPT_VERSION,
  deriveF0BenchmarkCaseState,
  f0BenchmarkExecutionReceipts,
  planNextF0BenchmarkBatch,
  validateF0BenchmarkExecutionReceipt,
  type F0BenchmarkExecutionReceipt
} from './f0-benchmark-batch-planner';
import { F0_BOTTLE_BASELINE_CAPABILITY_V1, f0CapabilityCampaignCases, deriveF0CapabilityStatus } from './f0-capability-campaign';
import { f0EmpiricalBenchmarkObservations } from './f0-empirical-evidence';

function caseFor(actionId: ActionId, attemptNumber: number) {
  const benchmarkCase = f0CapabilityCampaignCases.find(candidate =>
    candidate.actionId === actionId && candidate.attemptNumber === attemptNumber
  );
  assert.ok(benchmarkCase, `missing ${actionId} attempt ${attemptNumber}`);
  return benchmarkCase;
}

function receiptFor(actionId: ActionId, attemptNumber: number): F0BenchmarkExecutionReceipt {
  const benchmarkCase = caseFor(actionId, attemptNumber);
  return {
    executionReceiptVersion: F0_BENCHMARK_EXECUTION_RECEIPT_VERSION,
    campaignId: F0_BOTTLE_BASELINE_CAPABILITY_V1,
    benchmarkCaseId: benchmarkCase.benchmarkCaseId,
    fixtureId: benchmarkCase.fixtureId,
    actionId,
    attemptNumber,
    candidateAssetId: `test-${actionId.toLowerCase().replaceAll('_', '-')}-${attemptNumber}-candidate`,
    status: F0_BENCHMARK_EXECUTION_RECEIPT_STATUS
  };
}

function rejectedObservation(actionId: ActionId, attemptNumber: number): BenchmarkObservation {
  const benchmarkCase = caseFor(actionId, attemptNumber);
  return {
    ...f0EmpiricalBenchmarkObservations[0]!,
    observationId: `test-${actionId.toLowerCase()}-${attemptNumber}-rejected`,
    benchmarkCaseId: benchmarkCase.benchmarkCaseId,
    fixtureId: benchmarkCase.fixtureId,
    actionId,
    candidateAssetId: `test-${actionId.toLowerCase()}-${attemptNumber}-rejected-candidate`,
    dimensions: BENCHMARK_DIMENSIONS.map(dimension => ({
      dimension,
      passed: true,
      critical: dimension !== 'CAMERA_REALISM',
      notes: 'Test-only rejected evidence.'
    })),
    verdict: 'PASS',
    reviewerId: ''
  };
}

test('current historical cases derive REVIEWED, REVIEWED, and PENDING', () => {
  assert.deepEqual(f0BenchmarkExecutionReceipts, []);
  assert.equal(deriveF0BenchmarkCaseState(caseFor('PICK_UP', 1)), 'REVIEWED');
  assert.equal(deriveF0BenchmarkCaseState(caseFor('HOLD', 1)), 'REVIEWED');
  assert.equal(deriveF0BenchmarkCaseState(caseFor('ROTATE_SLOW', 1)), 'PENDING');
});

test('current next batch is one lowest pending case per action in locked order', () => {
  const batch = planNextF0BenchmarkBatch();
  assert.deepEqual(batch.map(item => [item.actionId, item.attemptNumber]), [
    ['PICK_UP', 2], ['HOLD', 2], ['ROTATE_SLOW', 1]
  ]);
  assert.equal(new Set(batch.map(item => item.actionId)).size, batch.length);
});

test('planner selects the lowest PENDING attempt for each action', () => {
  const batch = planNextF0BenchmarkBatch({ executionReceipts: [receiptFor('PICK_UP', 2)] });
  assert.deepEqual(batch.map(item => [item.actionId, item.attemptNumber]), [
    ['PICK_UP', 3], ['HOLD', 2], ['ROTATE_SLOW', 1]
  ]);
});

test('planner rejects a requested batch larger than three', () => {
  assert.throws(() => planNextF0BenchmarkBatch({ requestedSize: 4 }), /F0_BENCHMARK_BATCH_SIZE_INVALID/);
});

test('a valid receipt is AWAITING_REVIEW and blocks regeneration', () => {
  const receipt = receiptFor('ROTATE_SLOW', 1);
  assert.deepEqual(validateF0BenchmarkExecutionReceipt(receipt), []);
  assert.equal(deriveF0BenchmarkCaseState(caseFor('ROTATE_SLOW', 1), f0EmpiricalBenchmarkObservations, [receipt]), 'AWAITING_REVIEW');
  assert.deepEqual(
    planNextF0BenchmarkBatch({ executionReceipts: [receipt] }).map(item => [item.actionId, item.attemptNumber]),
    [['PICK_UP', 2], ['HOLD', 2], ['ROTATE_SLOW', 2]]
  );
});

test('unknown or mismatched receipts fail strict campaign binding validation', () => {
  const unknown = { ...receiptFor('PICK_UP', 2), benchmarkCaseId: 'unknown-case' };
  const mismatched = { ...receiptFor('HOLD', 2), actionId: 'PICK_UP' as const, providerSessionId: 'not-allowed' };
  assert.ok(validateF0BenchmarkExecutionReceipt(unknown).includes('benchmark_case_binding'));
  assert.ok(validateF0BenchmarkExecutionReceipt(mismatched).includes('action_binding'));
  assert.ok(validateF0BenchmarkExecutionReceipt(mismatched).includes('unexpected_field:providerSessionId'));
  assert.throws(() => planNextF0BenchmarkBatch({ executionReceipts: [unknown] }), /F0_BENCHMARK_EXECUTION_RECEIPT_INVALID/);
});

test('duplicate case or candidate receipts and fixture or attempt mismatches fail closed', () => {
  const first = receiptFor('PICK_UP', 2);
  const duplicateCase = { ...first, candidateAssetId: 'different-candidate' };
  const duplicateCandidate = { ...receiptFor('HOLD', 2), candidateAssetId: first.candidateAssetId };
  const wrongFixture = { ...first, fixtureId: 'wrong-fixture' };
  const wrongAttempt = { ...first, attemptNumber: 3 };
  assert.throws(() => planNextF0BenchmarkBatch({ executionReceipts: [first, duplicateCase] }), /duplicate_case_receipt/);
  assert.throws(() => planNextF0BenchmarkBatch({ executionReceipts: [first, duplicateCandidate] }), /duplicate_candidate_asset/);
  assert.ok(validateF0BenchmarkExecutionReceipt(wrongFixture).includes('fixture_binding'));
  assert.ok(validateF0BenchmarkExecutionReceipt(wrongAttempt).includes('attempt_binding'));
});

test('rejected case evidence is REVIEW_EVIDENCE_INVALID and blocks regeneration', () => {
  const observations = [...f0EmpiricalBenchmarkObservations, rejectedObservation('ROTATE_SLOW', 1)];
  assert.equal(deriveF0BenchmarkCaseState(caseFor('ROTATE_SLOW', 1), observations), 'REVIEW_EVIDENCE_INVALID');
  assert.deepEqual(
    planNextF0BenchmarkBatch({ observations }).map(item => [item.actionId, item.attemptNumber]),
    [['PICK_UP', 2], ['HOLD', 2], ['ROTATE_SLOW', 2]]
  );
});

test('planner is deterministic and does not mutate F0-B campaign data or evidence', () => {
  const campaignBefore = structuredClone(f0CapabilityCampaignCases);
  const evidenceBefore = structuredClone(f0EmpiricalBenchmarkObservations);
  const receipts = [receiptFor('ROTATE_SLOW', 1)];
  const receiptsBefore = structuredClone(receipts);
  assert.deepEqual(planNextF0BenchmarkBatch({ executionReceipts: receipts }), planNextF0BenchmarkBatch({ executionReceipts: receipts }));
  assert.deepEqual(f0CapabilityCampaignCases, campaignBefore);
  assert.deepEqual(f0EmpiricalBenchmarkObservations, evidenceBefore);
  assert.deepEqual(receipts, receiptsBefore);
});

test('planner does not affect the current all-UNTESTED ActionCapabilityMap or call providers', () => {
  planNextF0BenchmarkBatch();
  assert.deepEqual(deriveF0CapabilityStatus(f0EmpiricalBenchmarkObservations).actionCapabilityMap, createUntestedActionCapabilityMap());
});
