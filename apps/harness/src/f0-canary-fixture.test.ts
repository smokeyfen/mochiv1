import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGoldenProductFixture, validateScenePlan } from '@mochi/contracts';
import { createUntestedActionCapabilityMap, evaluateFixtureReadiness, evaluateSceneFeasibility } from '@mochi/core';
import {
  F0_CANONICAL_REFERENCE_ASSET_ID,
  f0BaselineBenchmarkCases,
  f0BaselineScenePlans,
  f0CocoonTurmericSerumFixture
} from './f0-canary-fixture';

test('F0 canonical fixture is ready with exactly one flexible product reference', () => {
  assert.deepEqual(evaluateFixtureReadiness(f0CocoonTurmericSerumFixture), { ready: true, reasons: [] });
  assert.deepEqual(validateGoldenProductFixture(f0CocoonTurmericSerumFixture), []);
  assert.equal(f0CocoonTurmericSerumFixture.referenceAssets.length, 1);
  assert.deepEqual(f0CocoonTurmericSerumFixture.expectedReferenceRoles, ['PRODUCT_REFERENCE']);
  assert.equal(f0CocoonTurmericSerumFixture.referenceAssets[0]!.assetId, F0_CANONICAL_REFERENCE_ASSET_ID);
  assert.equal(f0CocoonTurmericSerumFixture.referenceAssets[0]!.sha256, 'B7F37371347DDC981973A8724A67D1BB6D0DF37A7AAD705452FB8C678D6EF510');
  assert.equal(f0CocoonTurmericSerumFixture.referenceAssets.some(asset => asset.role === 'PRODUCT_FRONT'), false);
  assert.equal(f0CocoonTurmericSerumFixture.productTruth.verificationStatus, 'VERIFIED');
  assert.deepEqual(f0CocoonTurmericSerumFixture.productTruth.allowedClaims, []);
});

test('F0 baseline contains exactly three independent Flow benchmark cases', () => {
  assert.equal(f0BaselineScenePlans.length, 3);
  assert.equal(f0BaselineBenchmarkCases.length, 3);
  assert.deepEqual(f0BaselineBenchmarkCases.map(caseItem => caseItem.benchmarkCaseId), [
    'f0-cocoon-pick-up-v1', 'f0-cocoon-hold-v1', 'f0-cocoon-rotate-slow-v1'
  ]);
  assert.deepEqual(f0BaselineBenchmarkCases.map(caseItem => caseItem.actionId), ['PICK_UP', 'HOLD', 'ROTATE_SLOW']);
  for (const caseItem of f0BaselineBenchmarkCases) {
    assert.equal(caseItem.attemptNumber, 1);
    assert.equal(caseItem.providerTarget, 'GOOGLE_FLOW');
    assert.equal(caseItem.modelTarget, 'OMNI_FLASH_1_1');
    assert.ok(caseItem.expectedInvariants.length > 0);
  }
});

test('F0 scenes remain single-action 8-second portrait benchmarks with one logical reference', () => {
  for (const scene of f0BaselineScenePlans) {
    assert.deepEqual(validateScenePlan(scene), []);
    assert.equal(scene.durationSeconds, 8);
    assert.equal(scene.aspectRatio, '9:16');
    assert.equal(scene.actions.length, 1);
    assert.deepEqual(scene.requiredAssetIds, [F0_CANONICAL_REFERENCE_ASSET_ID]);
    assert.ok(scene.dialogue.includes('no audio generation requirement'));
  }
});

test('F0 actions remain untested and fail production feasibility without observations', () => {
  const capabilityMap = createUntestedActionCapabilityMap();
  for (const scene of f0BaselineScenePlans) {
    const action = scene.actions[0]!.action;
    assert.equal(capabilityMap[action], 'UNTESTED');
    const result = evaluateSceneFeasibility(scene, capabilityMap);
    assert.equal(result.passed, false);
    assert.ok(result.reasons.includes(`action_untested:${action}`));
  }
});
