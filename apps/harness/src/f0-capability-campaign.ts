import type { ActionId, BenchmarkCase, BenchmarkObservation, ScenePlan } from '@mochi/contracts';
import {
  DEFAULT_CAPABILITY_PROMOTION_POLICY,
  deriveTrustedCapabilityStatus,
  type TrustedCapabilityCampaignScope,
  type TrustedCapabilityStatus,
  validateTrustedCapabilityCampaignScope
} from '@mochi/core';
import {
  F0_CANOONICAL_FIXTURE_ID,
  f0BaselineBenchmarkCases,
  f0BaselineScenePlans,
  f0CocoonTurmericSerumFixture
} from './f0-canary-fixture';

export const F0_BOTTLE_BASELINE_CAPABILITY_V1 = 'F0_BOTTLE_BASELINE_CAPABILITY_V1' as const;
export const F0_BASELINE_ACTION_IDS = ['PICK_UP', 'HOLD', 'ROTATE_SLOW'] as const satisfies readonly ActionId[];

/**
 * Attempt one remains the historically reviewed case object. Attempts 2–10 are
 * only deterministic planned cases and are not observations or generations.
 */
export const f0CapabilityCampaignCases: readonly BenchmarkCase[] = f0BaselineBenchmarkCases.flatMap(benchmarkCase => [
  benchmarkCase,
  ...Array.from({ length: DEFAULT_CAPABILITY_PROMOTION_POLICY.minimumReviewedAttempts - 1 }, (_, index) => ({
    ...benchmarkCase,
    benchmarkCaseId: `${benchmarkCase.benchmarkCaseId}-attempt-${String(index + 2).padStart(2, '0')}`,
    attemptNumber: index + 2
  }))
]);

export interface F0CapabilityCampaign extends TrustedCapabilityCampaignScope {
  readonly scenePlans: readonly ScenePlan[];
}

/** The approved F0 authority is deliberately limited to these three bottle actions. */
export const f0BottleBaselineCapabilityCampaign: F0CapabilityCampaign = {
  campaignId: F0_BOTTLE_BASELINE_CAPABILITY_V1,
  fixtureId: F0_CANOONICAL_FIXTURE_ID,
  archetype: 'BOTTLE',
  providerTarget: 'GOOGLE_FLOW',
  modelTarget: 'OMNI_FLASH_1_1',
  baselineActionIds: F0_BASELINE_ACTION_IDS,
  policy: DEFAULT_CAPABILITY_PROMOTION_POLICY,
  scenePlans: f0BaselineScenePlans,
  benchmarkCases: f0CapabilityCampaignCases
};

export function validateF0CapabilityCampaign(): readonly string[] {
  const issues = [...validateTrustedCapabilityCampaignScope(f0BottleBaselineCapabilityCampaign)];
  if (f0BottleBaselineCapabilityCampaign.fixtureId !== f0CocoonTurmericSerumFixture.fixtureId ||
    f0BottleBaselineCapabilityCampaign.archetype !== f0CocoonTurmericSerumFixture.archetype) issues.push('fixture_binding');
  if (f0BottleBaselineCapabilityCampaign.scenePlans.length !== F0_BASELINE_ACTION_IDS.length) issues.push('scene_plan_count');
  for (const [index, actionId] of F0_BASELINE_ACTION_IDS.entries()) {
    const attemptOne = f0BaselineBenchmarkCases[index];
    const scene = f0BottleBaselineCapabilityCampaign.scenePlans[index];
    if (!attemptOne || !scene || attemptOne.actionId !== actionId || attemptOne.sceneContractId !== scene.sceneId ||
      attemptOne.fixtureId !== F0_CANOONICAL_FIXTURE_ID || attemptOne.expectedInvariants.length === 0) issues.push(`baseline_binding:${actionId}`);
  }
  return issues;
}

export function deriveF0CapabilityStatus(observations: readonly BenchmarkObservation[]): TrustedCapabilityStatus {
  const issues = validateF0CapabilityCampaign();
  if (issues.length > 0) throw new Error(`F0_CAPABILITY_CAMPAIGN_INVALID:${issues.join(',')}`);
  return deriveTrustedCapabilityStatus('BOTTLE', f0BottleBaselineCapabilityCampaign, observations);
}
