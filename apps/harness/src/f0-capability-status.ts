import { deriveF0CapabilityStatus, validateF0CapabilityCampaign } from './f0-capability-campaign';
import { f0EmpiricalBenchmarkObservations } from './f0-empirical-evidence';

const issues = validateF0CapabilityCampaign();
if (issues.length > 0) throw new Error(`F0_CAPABILITY_CAMPAIGN_INVALID:${issues.join(',')}`);

const status = deriveF0CapabilityStatus(f0EmpiricalBenchmarkObservations);
console.log(`campaignId=${status.campaignId}`);
console.log(`fixtureId=${status.fixtureId}`);
for (const actionId of status.baselineActionIds) {
  const action = status.actions[actionId];
  console.log(`${actionId}: ${action.reviewedAttemptCount}/${status.policy.minimumReviewedAttempts} ${action.classification}`);
}
console.log(`campaignReady=${status.campaignReady}`);
console.log(`promotions=${status.totalPromotionsFromUntested}`);
console.log(`remainingMinimumAttempts=${status.baselineActionIds.reduce((total, actionId) => total + status.actions[actionId].attemptsRemainingToMinimum, 0)}`);
