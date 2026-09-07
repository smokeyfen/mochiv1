import type { ActionStep, BenchmarkCase, BenchmarkObservation, PhysicalState, ScenePlan } from '@mochi/contracts';
import {
  F0_BOTTLE_BASELINE_CAPABILITY_V1,
  f0BottleBaselineCapabilityCampaign,
  f0CapabilityCampaignCases,
  deriveF0CapabilityStatus,
  validateF0CapabilityCampaign
} from './f0-capability-campaign';
import { F0_CANONICAL_REFERENCE_ASSET_ID, f0BaselineScenePlans, f0CocoonTurmericSerumFixture } from './f0-canary-fixture';
import {
  f0BenchmarkExecutionReceipts,
  planNextF0BenchmarkBatch,
  type F0BenchmarkExecutionReceipt,
  type PlanNextF0BenchmarkBatchInput
} from './f0-benchmark-batch-planner';
import { f0EmpiricalBenchmarkObservations } from './f0-empirical-evidence';

export const F0_BENCHMARK_EXECUTION_PACKET_VERSION = 'F0_BENCHMARK_EXECUTION_PACKET_V1' as const;

/** Provider-neutral instruction artifact for one future controlled benchmark generation. */
export interface F0BenchmarkExecutionPacket {
  readonly executionPacketVersion: typeof F0_BENCHMARK_EXECUTION_PACKET_VERSION;
  readonly campaignId: typeof F0_BOTTLE_BASELINE_CAPABILITY_V1;
  readonly benchmarkCaseId: string;
  readonly fixtureId: string;
  readonly actionId: BenchmarkCase['actionId'];
  readonly attemptNumber: number;
  readonly providerTarget: string;
  readonly modelTarget: string;
  readonly sceneContractId: string;
  readonly referenceAssetId: string;
  readonly referenceAssetSha256: string;
  readonly referenceMimeType: string;
  readonly durationSeconds: 8;
  readonly aspectRatio: '9:16';
  readonly primaryObjective: string;
  readonly startState: PhysicalState;
  readonly actionStep: ActionStep;
  readonly endState: PhysicalState;
  readonly expectedInvariants: readonly string[];
  readonly benchmarkPrompt: string;
}

export interface F0BenchmarkExecutionDryReport {
  readonly campaignId: typeof F0_BOTTLE_BASELINE_CAPABILITY_V1;
  readonly batchSize: number;
  readonly packets: readonly F0BenchmarkExecutionPacket[];
  readonly plannedGenerations: number;
  readonly flowCalls: 0;
  readonly geminiCalls: 0;
  readonly saydiCalls: 0;
  readonly generationsPerformed: 0;
  readonly executionReceiptCount: number;
  readonly benchmarkObservationCount: number;
  readonly campaignReady: boolean;
}

const PACKET_KEYS = [
  'executionPacketVersion', 'campaignId', 'benchmarkCaseId', 'fixtureId', 'actionId', 'attemptNumber',
  'providerTarget', 'modelTarget', 'sceneContractId', 'referenceAssetId', 'referenceAssetSha256',
  'referenceMimeType', 'durationSeconds', 'aspectRatio', 'primaryObjective', 'startState', 'actionStep',
  'endState', 'expectedInvariants', 'benchmarkPrompt'
] as const;

/** Compiles the locked physical-only prompt from canonical fixture and ScenePlan data. */
export function compileF0BenchmarkPrompt(benchmarkCase: BenchmarkCase): string {
  const { approvedCase, scenePlan } = resolveCanonicalF0BenchmarkCase(benchmarkCase);
  return compileF0BenchmarkPromptFromCanonical(approvedCase, scenePlan);
}

/** Resolves one planner-selected approved case to a strict, provider-neutral instruction packet. */
export function compileF0BenchmarkExecutionPacket(benchmarkCase: BenchmarkCase): F0BenchmarkExecutionPacket {
  const { approvedCase, scenePlan, referenceAsset } = resolveCanonicalF0BenchmarkCase(benchmarkCase);
  const packet: F0BenchmarkExecutionPacket = {
    executionPacketVersion: F0_BENCHMARK_EXECUTION_PACKET_VERSION,
    campaignId: F0_BOTTLE_BASELINE_CAPABILITY_V1,
    benchmarkCaseId: approvedCase.benchmarkCaseId,
    fixtureId: approvedCase.fixtureId,
    actionId: approvedCase.actionId,
    attemptNumber: approvedCase.attemptNumber,
    providerTarget: approvedCase.providerTarget,
    modelTarget: approvedCase.modelTarget,
    sceneContractId: approvedCase.sceneContractId,
    referenceAssetId: referenceAsset.assetId,
    referenceAssetSha256: referenceAsset.sha256!,
    referenceMimeType: referenceAsset.mimeType,
    durationSeconds: scenePlan.durationSeconds,
    aspectRatio: scenePlan.aspectRatio,
    primaryObjective: scenePlan.primaryObjective,
    startState: scenePlan.startState,
    actionStep: getOnlyActionStep(scenePlan),
    endState: scenePlan.endState,
    expectedInvariants: approvedCase.expectedInvariants,
    benchmarkPrompt: compileF0BenchmarkPrompt(approvedCase)
  };
  const issues = validateF0BenchmarkExecutionPacket(packet);
  if (issues.length > 0) throw new Error(`F0_BENCHMARK_EXECUTION_PACKET_INVALID:${issues.join(',')}`);
  return packet;
}

/** Validates exact shape and canonical campaign, fixture, scene, reference, and prompt binding. */
export function validateF0BenchmarkExecutionPacket(packet: unknown): readonly string[] {
  const issues: string[] = [];
  if (!isRecord(packet)) return ['packet'];
  for (const key of Object.keys(packet)) {
    if (!PACKET_KEYS.includes(key as typeof PACKET_KEYS[number])) issues.push(`unexpected_field:${key}`);
  }
  for (const key of PACKET_KEYS) {
    if (!(key in packet)) issues.push(`missing_field:${key}`);
  }
  if (packet.executionPacketVersion !== F0_BENCHMARK_EXECUTION_PACKET_VERSION) issues.push('execution_packet_version');
  if (packet.campaignId !== F0_BOTTLE_BASELINE_CAPABILITY_V1) issues.push('campaign_id');
  const approvedCase = typeof packet.benchmarkCaseId === 'string'
    ? f0CapabilityCampaignCases.find(candidate => candidate.benchmarkCaseId === packet.benchmarkCaseId)
    : undefined;
  if (!approvedCase) return [...issues, 'benchmark_case_binding'];

  let expected: F0BenchmarkExecutionPacket;
  try {
    expected = compileCanonicalPacket(approvedCase);
  } catch {
    return [...issues, 'canonical_binding'];
  }
  for (const key of PACKET_KEYS) {
    if (!sameValue(packet[key], expected[key])) issues.push(`binding:${key}`);
  }
  return issues;
}

/** Reuses C1 planning and preserves its order while compiling at most three packets. */
export function compileNextF0BenchmarkExecutionBatch(input: PlanNextF0BenchmarkBatchInput = {}): readonly F0BenchmarkExecutionPacket[] {
  const packets = planNextF0BenchmarkBatch(input).map(compileF0BenchmarkExecutionPacket);
  if (packets.length > 3) throw new Error('F0_BENCHMARK_BATCH_SIZE_INVALID');
  return packets;
}

/** Pure dry status: planning and packet validation only, with no execution side effects. */
export function createF0BenchmarkExecutionDryReport(input: PlanNextF0BenchmarkBatchInput = {}): F0BenchmarkExecutionDryReport {
  const packets = compileNextF0BenchmarkExecutionBatch(input);
  for (const packet of packets) {
    const issues = validateF0BenchmarkExecutionPacket(packet);
    if (issues.length > 0) throw new Error(`F0_BENCHMARK_EXECUTION_PACKET_INVALID:${issues.join(',')}`);
  }
  const observations: readonly BenchmarkObservation[] = input.observations ?? f0EmpiricalBenchmarkObservations;
  const receipts: readonly F0BenchmarkExecutionReceipt[] = input.executionReceipts ?? f0BenchmarkExecutionReceipts;
  const status = deriveF0CapabilityStatus(observations);
  return {
    campaignId: F0_BOTTLE_BASELINE_CAPABILITY_V1,
    batchSize: packets.length,
    packets,
    plannedGenerations: packets.length,
    flowCalls: 0,
    geminiCalls: 0,
    saydiCalls: 0,
    generationsPerformed: 0,
    executionReceiptCount: receipts.length,
    benchmarkObservationCount: observations.length,
    campaignReady: status.campaignReady
  };
}

export function formatF0BenchmarkExecutionDryReport(report: F0BenchmarkExecutionDryReport): string {
  return [
    `campaignId=${report.campaignId}`,
    `batchSize=${report.batchSize}`,
    ...report.packets.flatMap(packet => [
      `benchmarkCaseId=${packet.benchmarkCaseId}`,
      `${packet.actionId} attempt=${packet.attemptNumber}`
    ]),
    `plannedGenerations=${report.plannedGenerations}`,
    `flowCalls=${report.flowCalls}`,
    `geminiCalls=${report.geminiCalls}`,
    `saydiCalls=${report.saydiCalls}`,
    `generationsPerformed=${report.generationsPerformed}`,
    `campaignReady=${report.campaignReady}`
  ].join('\n');
}

function compileCanonicalPacket(benchmarkCase: BenchmarkCase): F0BenchmarkExecutionPacket {
  const { approvedCase, scenePlan, referenceAsset } = resolveCanonicalF0BenchmarkCase(benchmarkCase);
  return {
    executionPacketVersion: F0_BENCHMARK_EXECUTION_PACKET_VERSION,
    campaignId: F0_BOTTLE_BASELINE_CAPABILITY_V1,
    benchmarkCaseId: approvedCase.benchmarkCaseId,
    fixtureId: approvedCase.fixtureId,
    actionId: approvedCase.actionId,
    attemptNumber: approvedCase.attemptNumber,
    providerTarget: approvedCase.providerTarget,
    modelTarget: approvedCase.modelTarget,
    sceneContractId: approvedCase.sceneContractId,
    referenceAssetId: referenceAsset.assetId,
    referenceAssetSha256: referenceAsset.sha256!,
    referenceMimeType: referenceAsset.mimeType,
    durationSeconds: scenePlan.durationSeconds,
    aspectRatio: scenePlan.aspectRatio,
    primaryObjective: scenePlan.primaryObjective,
    startState: scenePlan.startState,
    actionStep: getOnlyActionStep(scenePlan),
    endState: scenePlan.endState,
    expectedInvariants: approvedCase.expectedInvariants,
    benchmarkPrompt: compileF0BenchmarkPromptFromCanonical(approvedCase, scenePlan)
  };
}

function resolveCanonicalF0BenchmarkCase(benchmarkCase: BenchmarkCase): {
  approvedCase: BenchmarkCase;
  scenePlan: ScenePlan;
  referenceAsset: (typeof f0CocoonTurmericSerumFixture.referenceAssets)[number];
} {
  const campaignIssues = validateF0CapabilityCampaign();
  if (campaignIssues.length > 0) throw new Error(`F0_CAPABILITY_CAMPAIGN_INVALID:${campaignIssues.join(',')}`);
  const approvedCase = f0CapabilityCampaignCases.find(candidate => candidate.benchmarkCaseId === benchmarkCase.benchmarkCaseId);
  if (!approvedCase || approvedCase !== benchmarkCase) throw new Error('F0_BENCHMARK_CASE_NOT_APPROVED');
  if (f0BottleBaselineCapabilityCampaign.benchmarkCases.find(candidate => candidate === approvedCase) !== approvedCase) {
    throw new Error('F0_BENCHMARK_CASE_CAMPAIGN_BINDING_INVALID');
  }
  if (approvedCase.fixtureId !== f0CocoonTurmericSerumFixture.fixtureId) throw new Error('F0_BENCHMARK_FIXTURE_BINDING_INVALID');
  const scenePlan = f0BottleBaselineCapabilityCampaign.scenePlans.find(scene => scene.sceneId === approvedCase.sceneContractId);
  const baselineScenePlan = f0BaselineScenePlans.find(scene => scene.sceneId === approvedCase.sceneContractId);
  if (!scenePlan || scenePlan !== baselineScenePlan || scenePlan.actions.length !== 1 || scenePlan.actions[0]?.action !== approvedCase.actionId) {
    throw new Error('F0_BENCHMARK_SCENE_BINDING_INVALID');
  }
  const referenceAsset = f0CocoonTurmericSerumFixture.referenceAssets.find(asset => asset.assetId === F0_CANONICAL_REFERENCE_ASSET_ID);
  if (!referenceAsset || referenceAsset.role !== 'PRODUCT_REFERENCE' || referenceAsset.source !== 'UPLOAD' ||
    !referenceAsset.sha256 || !referenceAsset.mimeType.startsWith('image/')) throw new Error('F0_BENCHMARK_REFERENCE_BINDING_INVALID');
  return { approvedCase, scenePlan, referenceAsset };
}

function compileF0BenchmarkPromptFromCanonical(benchmarkCase: BenchmarkCase, scenePlan: ScenePlan): string {
  const actionStep = getOnlyActionStep(scenePlan);
  return [
    'Create one independent physical benchmark video clip.',
    'Duration: exactly 8 seconds.',
    'Aspect ratio: exactly 9:16.',
    `The supplied ${f0CocoonTurmericSerumFixture.productTruth.name} product reference is authoritative.`,
    'Preserve the canonical Cocoon Hưng Yên Turmeric Serum bottle identity.',
    'Use a smartphone POV / on-hand product presentation.',
    'The reviewer face must not be visible.',
    'Show exactly one plausible right hand and exactly one primary physical action.',
    `Primary action: ${actionStep.action}. Exact action objective: ${actionStep.objective}`,
    `Exact starting condition: ${JSON.stringify(scenePlan.startState)}.`,
    `Exact ending condition: ${JSON.stringify(scenePlan.endState)}.`,
    'The action must visibly complete and the product identity must remain recognizable.',
    'Keep the amber-orange cylindrical body, black attached dropper, and white front label identity materially stable.',
    'Do not substitute the product, create a major geometry morph or deformation, remove the cap, dispense, or add unrelated props.',
    'Do not show fused or duplicated fingers, an impossible grip, hand/product penetration, teleportation, floating, or an unexplained cut/reset.',
    'Keep object motion physically plausible and framing usable for smartphone/POV review.',
    `Preserve these exact benchmark invariants: ${benchmarkCase.expectedInvariants.join(' | ')}.`,
    'Do not invent marketing claims or product efficacy.',
    'No speech or voice generation is required for this physical-action benchmark.'
  ].join('\n');
}

function getOnlyActionStep(scenePlan: ScenePlan): ActionStep {
  const actionStep = scenePlan.actions[0];
  if (scenePlan.actions.length !== 1 || !actionStep) throw new Error('F0_BENCHMARK_SCENE_ACTION_INVALID');
  return actionStep;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
