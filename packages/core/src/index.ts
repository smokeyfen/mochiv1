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



import type { DialogueDurationEstimate, VoiceGender, VoiceRegion, VoiceTimingCalibrationKey, VoiceTimingCalibrationPolicy, VoiceTimingObservation, VoiceTimingProfile } from '@mochi/contracts';
import { SCHEMA_VERSION } from '@mochi/contracts';
export class VoiceTimingError extends Error { readonly code:'INVALID_OBSERVATION'|'INVALID_POLICY'|'INSUFFICIENT_OBSERVATIONS'|'MIXED_CALIBRATION_KEY'|'MIXED_PROVENANCE'|'NOT_EMPIRICAL'; constructor(code:'INVALID_OBSERVATION'|'INVALID_POLICY'|'INSUFFICIENT_OBSERVATIONS'|'MIXED_CALIBRATION_KEY'|'MIXED_PROVENANCE'|'NOT_EMPIRICAL'){super(`VOICE_TIMING_ERROR:${code}`);this.code=code;} }
/** NFC, punctuation-to-space, trim, and collapsed whitespace form the deterministic spoken-unit metric; it is not Vietnamese lexical segmentation. */
export function normalizeVietnameseSpokenText(text:string):string{return text.normalize('NFC').replace(/[\p{P}\p{S}]+/gu,' ').trim().replace(/\s+/gu,' ');}
export function countVietnameseSpokenUnits(text:string):number{const normalized=normalizeVietnameseSpokenText(text);return normalized?normalized.split(' ').length:0;}
export function validateVoiceTimingObservation(observation:VoiceTimingObservation):string[]{const errors:string[]=[];const key=observation.calibrationKey;if(!observation.observationId.trim())errors.push('observation_id');if(key.language!=='vi-VN')errors.push('language');if(key.voiceGender!=='MALE'&&key.voiceGender!=='FEMALE')errors.push('gender');if(key.voiceRegion!=='SOUTH'&&key.voiceRegion!=='NORTH')errors.push('region');if(typeof key.voiceIdentityId!=='string'||!key.voiceIdentityId.trim())errors.push('voice_identity');if(!key.voiceStyle.trim())errors.push('style');const normalized=normalizeVietnameseSpokenText(observation.normalizedText);if(!normalized)errors.push('text');if(observation.normalizedText!==normalized)errors.push('normalization');if(!Number.isInteger(observation.spokenUnitCount)||observation.spokenUnitCount<=0||observation.spokenUnitCount!==countVietnameseSpokenUnits(observation.normalizedText))errors.push('units');if(!Number.isFinite(observation.measuredDurationMs)||observation.measuredDurationMs<=0)errors.push('duration');if(observation.provenance!=='SYNTHETIC'&&observation.provenance!=='EMPIRICAL')errors.push('provenance');return errors;}
export function buildVoiceTimingProfile(observations:readonly VoiceTimingObservation[],policy:VoiceTimingCalibrationPolicy):VoiceTimingProfile{validatePolicy(policy);if(observations.length<policy.minimumObservations)throw new VoiceTimingError('INSUFFICIENT_OBSERVATIONS');const seen=new Set<string>();for(const observation of observations){if(seen.has(observation.observationId)||validateVoiceTimingObservation(observation).length)throw new VoiceTimingError('INVALID_OBSERVATION');seen.add(observation.observationId);}const key=observations[0]!.calibrationKey, provenance=observations[0]!.provenance;if(observations.some(o=>!sameKey(o.calibrationKey,key)))throw new VoiceTimingError('MIXED_CALIBRATION_KEY');if(observations.some(o=>o.provenance!==provenance))throw new VoiceTimingError('MIXED_PROVENANCE');const rates=observations.map(o=>o.spokenUnitCount*1000/o.measuredDurationMs).sort((a,b)=>a-b);const median=percentile(rates,0.5);const conservative=percentile(rates,0.25);const usable=policy.targetSceneDurationMs-policy.safetyMarginMs;return{schemaVersion:SCHEMA_VERSION,calibrationVersion:'VOICE_TIMING_V2',calibrationKey:key,provenance,sampleCount:observations.length,medianUnitsPerSecond:median,conservativeUnitsPerSecond:conservative,targetSceneDurationMs:policy.targetSceneDurationMs,safetyMarginMs:policy.safetyMarginMs,usableSpeechDurationMs:usable,recommendedMaxSpokenUnits:Math.floor(usable/1000*conservative),sourceObservationIds:observations.map(o=>o.observationId)};}
/** Nearest-rank percentile over ascending measured rates: ceil(n*p)-1, clamped to the first sample. p=.25 deliberately selects the slower quartile. */
export function percentile(sortedAscending:readonly number[],p:number):number{if(!sortedAscending.length||p<=0||p>1)throw new VoiceTimingError('INVALID_POLICY');return sortedAscending[Math.max(0,Math.ceil(sortedAscending.length*p)-1)]!;}
export function estimateDialogueDuration(text:string,profile:VoiceTimingProfile):DialogueDurationEstimate{validateProfile(profile);const normalizedText=normalizeVietnameseSpokenText(text),spokenUnitCount=countVietnameseSpokenUnits(text),estimatedDurationMs=Math.ceil(spokenUnitCount/profile.conservativeUnitsPerSecond*1000);return{normalizedText,spokenUnitCount,estimatedDurationMs,usableSpeechDurationMs:profile.usableSpeechDurationMs,status:estimatedDurationMs<=profile.usableSpeechDurationMs?'FITS':'TOO_LONG'};}
export function assertEmpiricalVoiceTimingProfile(profile:VoiceTimingProfile):void{validateProfile(profile);if(profile.provenance!=='EMPIRICAL')throw new VoiceTimingError('NOT_EMPIRICAL');}
function validatePolicy(policy:VoiceTimingCalibrationPolicy):void{if(policy.targetSceneDurationMs!==8000||!Number.isFinite(policy.safetyMarginMs)||policy.safetyMarginMs<0||policy.safetyMarginMs>=8000||!Number.isInteger(policy.minimumObservations)||policy.minimumObservations<1)throw new VoiceTimingError('INVALID_POLICY');}
function validateProfile(profile:VoiceTimingProfile):void{if(profile.schemaVersion!==SCHEMA_VERSION||profile.calibrationVersion!=='VOICE_TIMING_V2'||(typeof profile.calibrationKey.voiceIdentityId!=='string'||!profile.calibrationKey.voiceIdentityId.trim())||profile.targetSceneDurationMs!==8000||profile.usableSpeechDurationMs!==8000-profile.safetyMarginMs||profile.recommendedMaxSpokenUnits!==Math.floor(profile.usableSpeechDurationMs/1000*profile.conservativeUnitsPerSecond)||profile.sampleCount!==profile.sourceObservationIds.length||profile.conservativeUnitsPerSecond<=0||profile.medianUnitsPerSecond<=0)throw new VoiceTimingError('INVALID_POLICY');}
export const V1_REVIEW_VOICE_IDENTITIES={FEMALE_SOUTH:'VN_FEMALE_SOUTH_REVIEW_V1',FEMALE_NORTH:'VN_FEMALE_NORTH_REVIEW_V1',MALE_SOUTH:'VN_MALE_SOUTH_REVIEW_V1',MALE_NORTH:'VN_MALE_NORTH_REVIEW_V1'} as const;
export function resolveV1ReviewVoiceIdentity(language:'vi-VN',voiceGender:VoiceGender,voiceRegion:VoiceRegion,voiceStyle:string):string{if(language!=='vi-VN'||voiceStyle!=='review')throw new VoiceTimingError('INVALID_POLICY');const id=V1_REVIEW_VOICE_IDENTITIES[`${voiceGender}_${voiceRegion}` as keyof typeof V1_REVIEW_VOICE_IDENTITIES];if(!id)throw new VoiceTimingError('INVALID_POLICY');return id;}
export function isV1ReviewVoiceIdentity(voiceIdentityId:string):boolean{return Object.values(V1_REVIEW_VOICE_IDENTITIES).includes(voiceIdentityId as typeof V1_REVIEW_VOICE_IDENTITIES[keyof typeof V1_REVIEW_VOICE_IDENTITIES]);}
export function assertVoiceTimingProfileForKey(profile:VoiceTimingProfile,key:VoiceTimingCalibrationKey):void{validateProfile(profile);if(!sameKey(profile.calibrationKey,key))throw new VoiceTimingError('INVALID_POLICY');}
function sameKey(a:VoiceTimingCalibrationKey,b:VoiceTimingCalibrationKey):boolean{return a.language===b.language&&a.voiceIdentityId===b.voiceIdentityId&&a.voiceGender===b.voiceGender&&a.voiceRegion===b.voiceRegion&&a.voiceStyle===b.voiceStyle;}
