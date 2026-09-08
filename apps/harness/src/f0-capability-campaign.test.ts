import test from 'node:test';
import assert from 'node:assert/strict';
import type { ActionId, BenchmarkObservation } from '@mochi/contracts';
import { BENCHMARK_DIMENSIONS } from '@mochi/contracts';
import { createUntestedActionCapabilityMap, simpleActionFastTrackPolicyV1 } from '@mochi/core';
import {
  F0_BASELINE_ACTION_IDS,
  f0BottleBaselineCapabilityCampaign,
  f0CapabilityCampaignCases,
  deriveF0CapabilityStatus,
  validateF0CapabilityCampaign
} from './f0-capability-campaign';
import { F0_CANOONICAL_FIXTURE_ID, f0BaselineBenchmarkCases } from './f0-canary-fixture';
import { f0EmpiricalBenchmarkObservations } from './f0-empirical-evidence';

function caseFor(actionId: ActionId, attemptNumber: number) {
  const result = f0CapabilityCampaignCases.find(item => item.actionId === actionId && item.attemptNumber === attemptNumber);
  assert.ok(result, `missing ${actionId} attempt ${attemptNumber}`);
  return result;
}

function reviewedObservation(actionId: ActionId, attemptNumber: number, passed = true): BenchmarkObservation {
  const benchmarkCase = caseFor(actionId, attemptNumber);
  return {
    ...f0EmpiricalBenchmarkObservations[0]!,
    observationId: `test-${actionId.toLowerCase()}-${attemptNumber}-review`,
    benchmarkCaseId: benchmarkCase.benchmarkCaseId,
    fixtureId: F0_CANOONICAL_FIXTURE_ID,
    archetype: 'BOTTLE',
    actionId,
    evidenceOrigin: 'REAL_MODEL_VIDEO',
    candidateAssetId: `test-${actionId.toLowerCase()}-${attemptNumber}-video`,
    dimensions: BENCHMARK_DIMENSIONS.map(dimension => ({
      dimension,
      passed: dimension === 'PRODUCT_FIDELITY' ? passed : true,
      critical: dimension !== 'CAMERA_REALISM',
      notes: 'Human-reviewed test observation.'
    })),
    verdict: passed ? 'PASS' : 'FAIL',
    reviewerNotes: 'Test-only reviewed observation; never repository empirical evidence.'
  };
}

test('F0 capability campaign is the exact three-action, thirty-case authority', () => {
  assert.deepEqual(validateF0CapabilityCampaign(), []);
  assert.deepEqual(f0BottleBaselineCapabilityCampaign.baselineActionIds, ['PICK_UP', 'HOLD', 'ROTATE_SLOW']);
  assert.equal(f0CapabilityCampaignCases.length, 30);
  for (const actionId of F0_BASELINE_ACTION_IDS) {
    assert.deepEqual(f0CapabilityCampaignCases.filter(item => item.actionId === actionId).map(item => item.attemptNumber), [1,2,3,4,5,6,7,8,9,10]);
  }
  assert.equal(f0BottleBaselineCapabilityCampaign.fixtureId, F0_CANOONICAL_FIXTURE_ID);
  assert.ok(f0CapabilityCampaignCases.every(item => item.fixtureId === F0_CANOONICAL_FIXTURE_ID));
});

test('F0 attempt one cases and exact ScenePlan bindings remain canonical', () => {
  assert.deepEqual(f0CapabilityCampaignCases.filter(item => item.attemptNumber === 1), f0BaselineBenchmarkCases);
  assert.deepEqual(f0CapabilityCampaignCases.filter(item => item.attemptNumber === 1).map(item => item.benchmarkCaseId), [
    'f0-cocoon-pick-up-v1', 'f0-cocoon-hold-v1', 'f0-cocoon-rotate-slow-v1'
  ]);
  assert.equal(new Set(f0CapabilityCampaignCases.filter(item => item.attemptNumber > 1).map(item => item.benchmarkCaseId)).size, 27);
  assert.ok(f0CapabilityCampaignCases.filter(item => item.attemptNumber > 1).every(item => item.benchmarkCaseId.endsWith(`attempt-${String(item.attemptNumber).padStart(2, '0')}`)));
  for (const [index, scene] of f0BottleBaselineCapabilityCampaign.scenePlans.entries()) {
    assert.equal(f0BaselineBenchmarkCases[index]!.sceneContractId, scene.sceneId);
  }
});

test('controlled Batch 1 reviewed evidence has no trusted promotions', () => {
  const status = deriveF0CapabilityStatus(f0EmpiricalBenchmarkObservations);
  assert.deepEqual(status.actions.PICK_UP.acceptedObservationIds, [
    'f0-cocoon-pick-up-v1-attempt-01-review', 'f0-cocoon-pick-up-v1-attempt-02-review'
  ]);
  assert.deepEqual(status.actions.HOLD.acceptedObservationIds, [
    'f0-cocoon-hold-v1-attempt-01-review', 'f0-cocoon-hold-v1-attempt-02-review'
  ]);
  assert.deepEqual(status.actions.ROTATE_SLOW.acceptedObservationIds, ['f0-cocoon-rotate-slow-v1-attempt-01-review']);
  assert.equal(status.actions.PICK_UP.reviewedAttemptCount, 2);
  assert.equal(status.actions.HOLD.reviewedAttemptCount, 2);
  assert.equal(status.actions.ROTATE_SLOW.reviewedAttemptCount, 1);
  assert.ok(Object.values(status.actionCapabilityMap).every(level => level === 'UNTESTED'));
  assert.equal(status.campaignReady, false);
  assert.equal(status.totalPromotionsFromUntested, 0);
  assert.deepEqual(F0_BASELINE_ACTION_IDS.map(actionId => status.actions[actionId].attemptsRemainingToMinimum), [8, 8, 9]);
  assert.equal(F0_BASELINE_ACTION_IDS.reduce((total, actionId) => total + status.actions[actionId].attemptsRemainingToMinimum, 0), 25);
});

test('V1 fast-track authorization neither creates observations nor changes the empirical dry authority', () => {
  const status = deriveF0CapabilityStatus(f0EmpiricalBenchmarkObservations);
  assert.deepEqual(simpleActionFastTrackPolicyV1.authorizedActionIds, ['PICK_UP', 'HOLD', 'ROTATE_SLOW']);
  assert.equal(f0EmpiricalBenchmarkObservations.length, 5);
  assert.deepEqual(F0_BASELINE_ACTION_IDS.map(actionId => status.actions[actionId].reviewedAttemptCount), [2, 2, 1]);
  assert.deepEqual(F0_BASELINE_ACTION_IDS.map(actionId => status.actions[actionId].classification), ['UNTESTED', 'UNTESTED', 'UNTESTED']);
  assert.deepEqual(status.actionCapabilityMap, createUntestedActionCapabilityMap());
  assert.equal(status.campaignReady, false);
  assert.equal(status.totalPromotionsFromUntested, 0);
});

test('trusted derivation rejects out-of-campaign, malformed, synthetic, and duplicate evidence', () => {
  const wrongFixture = { ...reviewedObservation('PICK_UP', 2), fixtureId: 'wrong-fixture' };
  const wrongArchetype = { ...reviewedObservation('PICK_UP', 3), archetype: 'TUBE' } as unknown as BenchmarkObservation;
  const wrongActionCase = { ...reviewedObservation('HOLD', 2), benchmarkCaseId: caseFor('PICK_UP', 2).benchmarkCaseId };
  const unknownCase = { ...reviewedObservation('PICK_UP', 4), benchmarkCaseId: 'unknown-case' };
  const synthetic = { ...reviewedObservation('PICK_UP', 5), evidenceOrigin: 'SYNTHETIC' } as unknown as BenchmarkObservation;
  const duplicateId = reviewedObservation('PICK_UP', 6);
  const duplicateCandidate = { ...reviewedObservation('PICK_UP', 7), candidateAssetId: duplicateId.candidateAssetId };
  const duplicateCase = { ...reviewedObservation('PICK_UP', 8), benchmarkCaseId: duplicateId.benchmarkCaseId };
  const malformed = { ...reviewedObservation('PICK_UP', 9), reviewerId: '' };
  const status = deriveF0CapabilityStatus([
    wrongFixture, wrongArchetype, wrongActionCase, unknownCase, synthetic,
    duplicateId, { ...duplicateId }, duplicateCandidate, duplicateCase, malformed
  ]);
  assert.equal(status.actions.PICK_UP.reviewedAttemptCount, 0);
  assert.equal(status.actions.HOLD.reviewedAttemptCount, 0);
  assert.equal(status.rejectedObservationIds.length, 10);
});

test('classifier-backed trusted status retains locked promotion math', () => {
  const ninePasses = Array.from({ length: 9 }, (_, index) => reviewedObservation('PICK_UP', index + 1));
  assert.equal(deriveF0CapabilityStatus(ninePasses).actions.PICK_UP.classification, 'UNTESTED');

  const tenPasses = Array.from({ length: 10 }, (_, index) => reviewedObservation('PICK_UP', index + 1));
  assert.equal(deriveF0CapabilityStatus(tenPasses).actions.PICK_UP.classification, 'SAFE');

  const nineOfTen = Array.from({ length: 10 }, (_, index) => reviewedObservation('PICK_UP', index + 1, index !== 9));
  assert.equal(deriveF0CapabilityStatus(nineOfTen).actions.PICK_UP.classification, 'SAFE');

  const sixOfTen = Array.from({ length: 10 }, (_, index) => reviewedObservation('PICK_UP', index + 1, index < 6));
  assert.equal(deriveF0CapabilityStatus(sixOfTen).actions.PICK_UP.classification, 'RISKY');

  const belowRisky = Array.from({ length: 10 }, (_, index) => reviewedObservation('PICK_UP', index + 1, index < 5));
  assert.equal(deriveF0CapabilityStatus(belowRisky).actions.PICK_UP.classification, 'AVOID');
});

test('rogue evidence for non-campaign actions cannot change the complete map', () => {
  const rogue = { ...reviewedObservation('PICK_UP', 2), actionId: 'REACH' } as unknown as BenchmarkObservation;
  const status = deriveF0CapabilityStatus([rogue]);
  assert.deepEqual(status.actionCapabilityMap, createUntestedActionCapabilityMap());
  assert.equal(status.rejectedObservationIds.length, 1);
});
