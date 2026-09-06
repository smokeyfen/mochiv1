import type {
  ActionId,
  BenchmarkObservation,
  GoldenProductFixture,
  PhysicalState,
  ProductArchetype,
  QCReport,
  ScenePlan
} from '@mochi/contracts';
import { validateBenchmarkObservation, validateGoldenProductFixture } from '@mochi/contracts';

export type CapabilityLevel = 'UNTESTED' | 'SAFE' | 'RISKY' | 'AVOID';
export type ActionCapabilityMap = Record<ActionId, CapabilityLevel>;

export const createUntestedActionCapabilityMap = (): ActionCapabilityMap => ({
  REACH: 'UNTESTED', PICK_UP: 'UNTESTED', HOLD: 'UNTESTED', MOVE_CLOSER: 'UNTESTED',
  ROTATE_SLOW: 'UNTESTED', PLACE_DOWN: 'UNTESTED', OPEN_SIMPLE: 'UNTESTED',
  PRESS_BUTTON: 'UNTESTED', POUR_SIMPLE: 'UNTESTED', APPLY_SIMPLE: 'UNTESTED', POINT: 'UNTESTED'
});

export interface FeasibilityResult {
  passed: boolean;
  reasons: string[];
  totalComplexity: number;
}

export function evaluateSceneFeasibility(
  scene: ScenePlan,
  capabilityMap: ActionCapabilityMap,
  complexityBudget = 3
): FeasibilityResult {
  const reasons: string[] = [];
  const totalComplexity = scene.actions.reduce((sum, step) => sum + step.complexity, 0);
  if (totalComplexity > complexityBudget) reasons.push(`complexity_budget_exceeded:${totalComplexity}>${complexityBudget}`);
  for (const step of scene.actions) {
    const level = capabilityMap[step.action];
    if (level === 'UNTESTED') reasons.push(`action_untested:${step.action}`);
    if (level === 'AVOID') reasons.push(`action_avoid:${step.action}`);
  }
  return { passed: reasons.length === 0, reasons, totalComplexity };
}

export function validateStateCarryover(previousEnd: PhysicalState, nextStart: PhysicalState): string[] {
  const errors: string[] = [];
  const fields: Array<keyof PhysicalState> = ['heldBy', 'productOrientation', 'productPosition'];
  for (const field of fields) {
    if (previousEnd[field] !== nextStart[field]) errors.push(`state_mismatch:${field}`);
  }
  for (const [key, value] of Object.entries(previousEnd.productState)) {
    if (nextStart.productState[key] !== value) errors.push(`product_state_mismatch:${key}`);
  }
  for (const [key, value] of Object.entries(previousEnd.propState)) {
    if (nextStart.propState[key] !== value) errors.push(`prop_state_mismatch:${key}`);
  }
  return errors;
}

export type LifecycleState =
  | 'PLANNED' | 'PREFLIGHT_PASS' | 'GENERATING' | 'GENERATED'
  | 'QC_PENDING' | 'APPROVED' | 'REJECTED';

const transitions: Record<LifecycleState, readonly LifecycleState[]> = {
  PLANNED: ['PREFLIGHT_PASS', 'REJECTED'],
  PREFLIGHT_PASS: ['GENERATING', 'REJECTED'],
  GENERATING: ['GENERATED', 'REJECTED'],
  GENERATED: ['QC_PENDING'],
  QC_PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: []
};

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return transitions[from].includes(to);
}

export function isQCFailClosed(report: QCReport): boolean {
  const criticalFailure = report.gates.some(g => g.severity === 'CRITICAL' && !g.passed);
  return report.approved && !criticalFailure && report.failureClass === 'NONE';
}

export interface FixtureReadinessResult {
  ready: boolean;
  reasons: readonly string[];
}

export function evaluateFixtureReadiness(fixture: GoldenProductFixture): FixtureReadinessResult {
  const reasons = validateGoldenProductFixture(fixture);
  return { ready: reasons.length === 0, reasons };
}

export interface CapabilityPromotionPolicy {
  minimumReviewedAttempts: number;
  safePassRate: number;
  riskyPassRate: number;
}

export const DEFAULT_CAPABILITY_PROMOTION_POLICY: CapabilityPromotionPolicy = {
  minimumReviewedAttempts: 10,
  safePassRate: 0.9,
  riskyPassRate: 0.6
};

export interface CapabilityEvidenceResult {
  actionId: ActionId;
  archetype: ProductArchetype;
  classification: CapabilityLevel;
  validObservationIds: readonly string[];
  rejectedObservationIds: readonly string[];
  passCount: number;
  failCount: number;
  passRate: number;
  reasons: readonly string[];
}

export function classifyCapabilityEvidence(
  actionId: ActionId,
  archetype: ProductArchetype,
  observations: readonly BenchmarkObservation[],
  policy: CapabilityPromotionPolicy = DEFAULT_CAPABILITY_PROMOTION_POLICY
): CapabilityEvidenceResult {
  const matching = observations.filter(observation => observation.actionId === actionId && observation.archetype === archetype);
  const valid: BenchmarkObservation[] = [];
  const rejected: BenchmarkObservation[] = [];
  const seenObservationIds = new Set<string>();
  const seenCandidateAssetIds = new Set<string>();
  for (const observation of matching) {
    const issues = [...validateBenchmarkObservation(observation)];
    if (seenObservationIds.has(observation.observationId)) issues.push('duplicate_observation_id');
    if (seenCandidateAssetIds.has(observation.candidateAssetId)) issues.push('duplicate_candidate_asset_id');
    seenObservationIds.add(observation.observationId);
    seenCandidateAssetIds.add(observation.candidateAssetId);
    if (issues.length === 0) valid.push(observation);
    else rejected.push(observation);
  }
  const passCount = valid.filter(observation => observation.verdict === 'PASS').length;
  const failCount = valid.length - passCount;
  const passRate = valid.length === 0 ? 0 : passCount / valid.length;
  const reasons: string[] = [];
  let classification: CapabilityLevel = 'UNTESTED';

  if (rejected.length > 0) reasons.push('invalid_observations_rejected');
  if (valid.length < policy.minimumReviewedAttempts) {
    reasons.push(`insufficient_real_observations:${valid.length}<${policy.minimumReviewedAttempts}`);
  } else if (passRate >= policy.safePassRate) {
    classification = 'SAFE';
  } else if (passRate >= policy.riskyPassRate) {
    classification = 'RISKY';
  } else {
    classification = 'AVOID';
  }

  return {
    actionId,
    archetype,
    classification,
    validObservationIds: valid.map(observation => observation.observationId),
    rejectedObservationIds: rejected.map(observation => observation.observationId),
    passCount,
    failCount,
    passRate,
    reasons
  };
}
