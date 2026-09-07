import test from 'node:test';
import assert from 'node:assert/strict';
import { createUntestedActionCapabilityMap } from '@mochi/core';
import {
  compileF0BenchmarkExecutionPacket,
  compileF0BenchmarkPrompt,
  compileNextF0BenchmarkExecutionBatch,
  createF0BenchmarkExecutionDryReport,
  formatF0BenchmarkExecutionDryReport,
  validateF0BenchmarkExecutionPacket
} from './f0-benchmark-execution-packet';
import { f0BenchmarkExecutionReceipts } from './f0-benchmark-batch-planner';
import { f0BottleBaselineCapabilityCampaign, f0CapabilityCampaignCases, deriveF0CapabilityStatus } from './f0-capability-campaign';
import { F0_CANONICAL_REFERENCE_ASSET_ID, f0BaselineScenePlans, f0CocoonTurmericSerumFixture } from './f0-canary-fixture';
import { f0EmpiricalBenchmarkObservations } from './f0-empirical-evidence';

function caseFor(actionId: 'PICK_UP' | 'HOLD' | 'ROTATE_SLOW', attemptNumber: number) {
  const benchmarkCase = f0CapabilityCampaignCases.find(candidate =>
    candidate.actionId === actionId && candidate.attemptNumber === attemptNumber
  );
  assert.ok(benchmarkCase, `missing ${actionId} attempt ${attemptNumber}`);
  return benchmarkCase;
}

test('current C1 batch compiles exactly three valid packets in locked action order', () => {
  const packets = compileNextF0BenchmarkExecutionBatch();
  assert.deepEqual(packets.map(packet => [packet.actionId, packet.attemptNumber]), [
    ['PICK_UP', 2], ['HOLD', 2], ['ROTATE_SLOW', 1]
  ]);
  assert.equal(packets.length, 3);
  assert.ok(packets.every(packet => validateF0BenchmarkExecutionPacket(packet).length === 0));
});

test('each execution packet is exactly bound to its campaign case, scene, and canonical reference', () => {
  const reference = f0CocoonTurmericSerumFixture.referenceAssets.find(asset => asset.assetId === F0_CANONICAL_REFERENCE_ASSET_ID);
  assert.ok(reference);
  for (const packet of compileNextF0BenchmarkExecutionBatch()) {
    const benchmarkCase = caseFor(packet.actionId as 'PICK_UP' | 'HOLD' | 'ROTATE_SLOW', packet.attemptNumber);
    const scenePlan = f0BaselineScenePlans.find(scene => scene.sceneId === benchmarkCase.sceneContractId);
    assert.ok(scenePlan);
    assert.equal(packet.benchmarkCaseId, benchmarkCase.benchmarkCaseId);
    assert.equal(packet.fixtureId, f0CocoonTurmericSerumFixture.fixtureId);
    assert.equal(packet.actionId, benchmarkCase.actionId);
    assert.equal(packet.attemptNumber, benchmarkCase.attemptNumber);
    assert.equal(packet.sceneContractId, scenePlan.sceneId);
    assert.equal(packet.referenceAssetId, reference.assetId);
    assert.equal(packet.referenceAssetSha256, reference.sha256);
    assert.equal(packet.referenceMimeType, reference.mimeType);
    assert.equal(packet.durationSeconds, 8);
    assert.equal(packet.aspectRatio, '9:16');
    assert.equal(packet.primaryObjective, scenePlan.primaryObjective);
    assert.deepEqual(packet.startState, scenePlan.startState);
    assert.deepEqual(packet.actionStep, scenePlan.actions[0]);
    assert.deepEqual(packet.endState, scenePlan.endState);
    assert.deepEqual(packet.expectedInvariants, benchmarkCase.expectedInvariants);
  }
});

test('manual packet mutations and undeclared fields fail strict validation', () => {
  const packet = compileF0BenchmarkExecutionPacket(caseFor('PICK_UP', 2));
  const malformed = { ...packet, attemptNumber: 8, providerSessionId: 'not-allowed' };
  const issues = validateF0BenchmarkExecutionPacket(malformed);
  assert.ok(issues.includes('binding:attemptNumber'));
  assert.ok(issues.includes('unexpected_field:providerSessionId'));
});

test('each action has an attempt-invariant prompt, while physical actions differ', () => {
  const prompts = new Map<string, string>();
  for (const actionId of ['PICK_UP', 'HOLD', 'ROTATE_SLOW'] as const) {
    const actionPrompts = Array.from({ length: 10 }, (_, index) => compileF0BenchmarkPrompt(caseFor(actionId, index + 1)));
    assert.equal(new Set(actionPrompts).size, 1, `${actionId} prompt changed by attempt`);
    prompts.set(actionId, actionPrompts[0]!);
  }
  assert.notEqual(prompts.get('PICK_UP'), prompts.get('HOLD'));
  assert.notEqual(prompts.get('HOLD'), prompts.get('ROTATE_SLOW'));
  assert.equal(compileF0BenchmarkPrompt(caseFor('PICK_UP', 2)), compileF0BenchmarkPrompt(caseFor('PICK_UP', 2)));
});

test('benchmark prompts contain only locked physical instructions and no voice or execution identity', () => {
  for (const packet of compileNextF0BenchmarkExecutionBatch()) {
    const prompt = packet.benchmarkPrompt;
    assert.ok(prompt.includes('exactly 8 seconds'));
    assert.ok(prompt.includes('exactly 9:16'));
    assert.ok(prompt.includes('smartphone POV / on-hand'));
    assert.ok(prompt.includes('reviewer face must not be visible'));
    assert.ok(prompt.includes('exactly one plausible right hand'));
    assert.ok(prompt.includes(packet.actionStep.objective));
    assert.ok(prompt.includes(JSON.stringify(packet.startState)));
    assert.ok(prompt.includes(JSON.stringify(packet.endState)));
    assert.ok(prompt.includes('No speech or voice generation is required'));
    assert.ok(!prompt.includes(packet.benchmarkCaseId));
    assert.ok(!prompt.includes(`attempt ${packet.attemptNumber}`));
    for (const forbidden of ['VoiceIdentityId', 'Leda Custom', 'Achird', 'Saydi', 'credential', 'session']) {
      assert.ok(!prompt.includes(forbidden));
    }
    assert.ok(prompt.includes('Do not invent marketing claims or product efficacy.'));
  }
});

test('dry execution report is deterministic, read-only, and performs no generation or provider call', () => {
  const campaignBefore = structuredClone(f0BottleBaselineCapabilityCampaign);
  const evidenceBefore = structuredClone(f0EmpiricalBenchmarkObservations);
  const receiptsBefore = structuredClone(f0BenchmarkExecutionReceipts);
  const first = createF0BenchmarkExecutionDryReport();
  const second = createF0BenchmarkExecutionDryReport();
  assert.deepEqual(first, second);
  assert.equal(first.batchSize, 3);
  assert.equal(first.plannedGenerations, 3);
  assert.equal(first.flowCalls, 0);
  assert.equal(first.geminiCalls, 0);
  assert.equal(first.saydiCalls, 0);
  assert.equal(first.generationsPerformed, 0);
  assert.equal(first.executionReceiptCount, 0);
  assert.equal(first.benchmarkObservationCount, 2);
  assert.equal(first.campaignReady, false);
  assert.ok(formatF0BenchmarkExecutionDryReport(first).includes('PICK_UP attempt=2'));
  assert.deepEqual(f0BottleBaselineCapabilityCampaign, campaignBefore);
  assert.deepEqual(f0EmpiricalBenchmarkObservations, evidenceBefore);
  assert.deepEqual(f0BenchmarkExecutionReceipts, receiptsBefore);
  assert.deepEqual(deriveF0CapabilityStatus(f0EmpiricalBenchmarkObservations).actionCapabilityMap, createUntestedActionCapabilityMap());
});
