import type { ActionId, PhysicalState, QCReport, ScenePlan } from '@mochi/contracts';

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
