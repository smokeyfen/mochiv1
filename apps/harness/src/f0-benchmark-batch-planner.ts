import type { ActionId, BenchmarkCase, BenchmarkObservation } from '@mochi/contracts';
import {
  F0_BASELINE_ACTION_IDS,
  F0_BOTTLE_BASELINE_CAPABILITY_V1,
  f0CapabilityCampaignCases,
  deriveF0CapabilityStatus,
  validateF0CapabilityCampaign
} from './f0-capability-campaign';
import { f0EmpiricalBenchmarkObservations } from './f0-empirical-evidence';

export const F0_BENCHMARK_EXECUTION_RECEIPT_VERSION = 'F0_BENCHMARK_EXECUTION_RECEIPT_V1' as const;
export const F0_BENCHMARK_EXECUTION_RECEIPT_STATUS = 'GENERATED_AWAITING_REVIEW' as const;

/**
 * Provider-neutral execution accounting for one generated candidate. It is not
 * a video payload, provider binding, review verdict, or capability result.
 */
export interface F0BenchmarkExecutionReceipt {
  readonly executionReceiptVersion: typeof F0_BENCHMARK_EXECUTION_RECEIPT_VERSION;
  readonly campaignId: typeof F0_BOTTLE_BASELINE_CAPABILITY_V1;
  readonly benchmarkCaseId: string;
  readonly fixtureId: string;
  readonly actionId: ActionId;
  readonly attemptNumber: number;
  readonly candidateAssetId: string;
  readonly status: typeof F0_BENCHMARK_EXECUTION_RECEIPT_STATUS;
}

/** No historical execution receipts are fabricated for the locked F0-B evidence. */
export const f0BenchmarkExecutionReceipts: readonly F0BenchmarkExecutionReceipt[] = [];

export type F0BenchmarkCaseState =
  | 'REVIEWED'
  | 'AWAITING_REVIEW'
  | 'REVIEW_EVIDENCE_INVALID'
  | 'PENDING';

export interface PlanNextF0BenchmarkBatchInput {
  readonly requestedSize?: number;
  readonly observations?: readonly BenchmarkObservation[];
  readonly executionReceipts?: readonly F0BenchmarkExecutionReceipt[];
}

const RECEIPT_KEYS = [
  'executionReceiptVersion',
  'campaignId',
  'benchmarkCaseId',
  'fixtureId',
  'actionId',
  'attemptNumber',
  'candidateAssetId',
  'status'
] as const;

const LOGICAL_ID = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;

/** Validates a receipt against exactly one approved case in the locked F0 campaign. */
export function validateF0BenchmarkExecutionReceipt(receipt: unknown): readonly string[] {
  const issues: string[] = [];
  if (!isRecord(receipt)) return ['receipt'];

  const keys = Object.keys(receipt);
  for (const key of keys) {
    if (!RECEIPT_KEYS.includes(key as typeof RECEIPT_KEYS[number])) issues.push(`unexpected_field:${key}`);
  }
  for (const key of RECEIPT_KEYS) {
    if (!(key in receipt)) issues.push(`missing_field:${key}`);
  }
  if (receipt.executionReceiptVersion !== F0_BENCHMARK_EXECUTION_RECEIPT_VERSION) issues.push('execution_receipt_version');
  if (receipt.campaignId !== F0_BOTTLE_BASELINE_CAPABILITY_V1) issues.push('campaign_id');
  if (typeof receipt.benchmarkCaseId !== 'string' || !isLogicalId(receipt.benchmarkCaseId)) issues.push('benchmark_case_id');
  if (typeof receipt.fixtureId !== 'string' || !isLogicalId(receipt.fixtureId)) issues.push('fixture_id');
  if (typeof receipt.actionId !== 'string' || !F0_BASELINE_ACTION_IDS.includes(receipt.actionId as typeof F0_BASELINE_ACTION_IDS[number])) issues.push('action_id');
  if (typeof receipt.attemptNumber !== 'number' || !Number.isInteger(receipt.attemptNumber) || receipt.attemptNumber < 1) issues.push('attempt_number');
  if (typeof receipt.candidateAssetId !== 'string' || !isLogicalId(receipt.candidateAssetId)) issues.push('candidate_asset_id');
  if (receipt.status !== F0_BENCHMARK_EXECUTION_RECEIPT_STATUS) issues.push('status');

  const benchmarkCase = typeof receipt.benchmarkCaseId === 'string'
    ? f0CapabilityCampaignCases.find(candidate => candidate.benchmarkCaseId === receipt.benchmarkCaseId)
    : undefined;
  if (!benchmarkCase) {
    issues.push('benchmark_case_binding');
  } else {
    if (receipt.fixtureId !== benchmarkCase.fixtureId) issues.push('fixture_binding');
    if (receipt.actionId !== benchmarkCase.actionId) issues.push('action_binding');
    if (receipt.attemptNumber !== benchmarkCase.attemptNumber) issues.push('attempt_binding');
  }
  return issues;
}

/** Returns the state of one approved F0 case using the existing trusted evidence derivation. */
export function deriveF0BenchmarkCaseState(
  benchmarkCase: BenchmarkCase,
  observations: readonly BenchmarkObservation[] = f0EmpiricalBenchmarkObservations,
  executionReceipts: readonly F0BenchmarkExecutionReceipt[] = f0BenchmarkExecutionReceipts
): F0BenchmarkCaseState {
  assertApprovedBenchmarkCase(benchmarkCase);
  assertValidReceipts(executionReceipts);

  const status = deriveF0CapabilityStatus(observations);
  const acceptedObservationIds = new Set(
    F0_BASELINE_ACTION_IDS.flatMap(actionId => status.actions[actionId].acceptedObservationIds)
  );
  const rejectedObservationIds = new Set(status.rejectedObservationIds);
  const observationsForCase = observations
    .map((observation, index) => ({ observation, reference: observationReference(observation, index) }))
    .filter(({ observation }) => observation?.benchmarkCaseId === benchmarkCase.benchmarkCaseId);

  if (observationsForCase.some(({ observation }) => acceptedObservationIds.has(observation.observationId))) return 'REVIEWED';
  if (observationsForCase.some(({ reference }) => rejectedObservationIds.has(reference))) return 'REVIEW_EVIDENCE_INVALID';
  if (executionReceipts.some(receipt => receipt.benchmarkCaseId === benchmarkCase.benchmarkCaseId)) return 'AWAITING_REVIEW';
  return 'PENDING';
}

/** Selects only pending cases, in locked action order, without mutating source evidence or campaign data. */
export function planNextF0BenchmarkBatch(input: PlanNextF0BenchmarkBatchInput = {}): readonly BenchmarkCase[] {
  const requestedSize = input.requestedSize ?? 3;
  if (!Number.isInteger(requestedSize) || requestedSize < 1 || requestedSize > 3) {
    throw new Error('F0_BENCHMARK_BATCH_SIZE_INVALID');
  }
  const observations = input.observations ?? f0EmpiricalBenchmarkObservations;
  const executionReceipts = input.executionReceipts ?? f0BenchmarkExecutionReceipts;
  assertValidReceipts(executionReceipts);

  const batch: BenchmarkCase[] = [];
  for (const actionId of F0_BASELINE_ACTION_IDS) {
    if (batch.length >= requestedSize) break;
    const next = f0CapabilityCampaignCases
      .filter(benchmarkCase => benchmarkCase.actionId === actionId)
      .sort((left, right) => left.attemptNumber - right.attemptNumber)
      .find(benchmarkCase => deriveF0BenchmarkCaseState(benchmarkCase, observations, executionReceipts) === 'PENDING');
    if (next) batch.push(next);
  }
  return batch;
}

function assertApprovedBenchmarkCase(benchmarkCase: BenchmarkCase): void {
  const campaignIssues = validateF0CapabilityCampaign();
  if (campaignIssues.length > 0) throw new Error(`F0_CAPABILITY_CAMPAIGN_INVALID:${campaignIssues.join(',')}`);
  const approved = f0CapabilityCampaignCases.find(candidate => candidate.benchmarkCaseId === benchmarkCase.benchmarkCaseId);
  if (approved !== benchmarkCase) throw new Error('F0_BENCHMARK_CASE_NOT_APPROVED');
}

function assertValidReceipts(receipts: readonly F0BenchmarkExecutionReceipt[]): void {
  const issues = receipts.flatMap((receipt, index) =>
    validateF0BenchmarkExecutionReceipt(receipt).map(issue => `receipt:${index + 1}:${issue}`)
  );
  const caseIds = new Set<string>();
  const candidateAssetIds = new Set<string>();
  for (const receipt of receipts) {
    if (caseIds.has(receipt.benchmarkCaseId)) issues.push(`duplicate_case_receipt:${receipt.benchmarkCaseId}`);
    if (candidateAssetIds.has(receipt.candidateAssetId)) issues.push(`duplicate_candidate_asset:${receipt.candidateAssetId}`);
    caseIds.add(receipt.benchmarkCaseId);
    candidateAssetIds.add(receipt.candidateAssetId);
  }
  if (issues.length > 0) throw new Error(`F0_BENCHMARK_EXECUTION_RECEIPT_INVALID:${issues.join(',')}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLogicalId(value: string): boolean {
  return LOGICAL_ID.test(value);
}

function observationReference(observation: BenchmarkObservation, index: number): string {
  return typeof observation?.observationId === 'string' && observation.observationId.trim()
    ? observation.observationId
    : `invalid-observation-${index + 1}`;
}
