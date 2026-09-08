import {
  GENERATED_SCENE_CANDIDATE_V1,
  validateGeneratedSceneCandidateV1,
  validateSceneAnchorV1,
  type GeneratedSceneCandidateV1,
  type SceneAnchorV1
} from '@mochi/contracts';
import type { FlowProductionRequestV1 } from './flow-production.ts';
import { IntelligenceProviderError, type IntelligenceProvider, type StructuredIntelligenceRequest } from './intelligence.ts';

export const SCENE_QC_V1 = 'SCENE_QC_V1' as const;
export type SceneQcGateStatus = 'PASS' | 'FAIL';
export type SceneQcFrameGate = 'PRODUCT_FIDELITY' | 'HAND_ANATOMY' | 'VISIBLE_ARTIFACTS' | 'REVIEWER_FACE_VISIBILITY';
export type SceneQcTemporalGate = 'ACTION_COMPLETION' | 'PHYSICS' | 'CAMERA_REALISM' | 'UNEXPECTED_CUTS' | 'START_STATE_MATCH' | 'END_STATE_MATCH';
export type SceneQcSpeechGate = 'SPEECH_DETECTED' | 'DIALOGUE_COMPLETE' | 'NO_UNEXPECTED_SPEECH' | 'EXACT_DIALOGUE_LEXICAL_MATCH';
export interface SceneQcGateResultV1<T extends string> { readonly gate: T; readonly status: SceneQcGateStatus; }
export interface PresentationDynamicsV1 { readonly status: 'PASS' | 'WARN'; readonly meaningfulVisualProgression: boolean; readonly excessiveStaticHold: boolean; readonly rhythmIntentObserved: boolean; readonly notes: string; }
export interface SceneQcReportV1 {
  readonly qcVersion: typeof SCENE_QC_V1;
  readonly result: 'SCENE_QC_PASS' | 'SCENE_QC_FAIL';
  readonly sceneId: string;
  readonly candidateAssetId: string;
  readonly frameGates: readonly SceneQcGateResultV1<SceneQcFrameGate>[];
  readonly temporalGates: readonly SceneQcGateResultV1<SceneQcTemporalGate>[];
  readonly speechGates: readonly SceneQcGateResultV1<SceneQcSpeechGate>[];
  readonly spokenTranscript: string;
  readonly presentationDynamics: PresentationDynamicsV1;
  readonly criticalFailureReasons: readonly string[];
  readonly intelligenceCallCount: 1;
}
export interface SceneQcVideoMediaV1 { readonly sceneId: string; readonly candidateAssetId: string; readonly mimeType: string; readonly dataBase64: string; }
export interface SceneQcReferenceMediaV1 { readonly sceneId: string; readonly assetId: string; readonly mimeType: string; readonly dataBase64: string; }
export interface SceneQcInputV1 { readonly candidate: GeneratedSceneCandidateV1; readonly anchor: SceneAnchorV1; readonly productionRequest: FlowProductionRequestV1; readonly video: SceneQcVideoMediaV1; readonly references: readonly SceneQcReferenceMediaV1[]; readonly intelligence: IntelligenceProvider; }

export class SceneQcError extends Error {
  readonly code: 'INVALID_INPUT' | 'INVALID_MODEL_OUTPUT' | 'PROVIDER_FAILURE';
  constructor(code: SceneQcError['code']) { super(`SCENE_QC_ERROR:${code}`); this.name = 'SceneQcError'; this.code = code; }
}

const frame = ['PRODUCT_FIDELITY', 'HAND_ANATOMY', 'VISIBLE_ARTIFACTS', 'REVIEWER_FACE_VISIBILITY'] as const;
const temporal = ['ACTION_COMPLETION', 'PHYSICS', 'CAMERA_REALISM', 'UNEXPECTED_CUTS', 'START_STATE_MATCH', 'END_STATE_MATCH'] as const;
const speech = ['SPEECH_DETECTED', 'DIALOGUE_COMPLETE', 'NO_UNEXPECTED_SPEECH', 'EXACT_DIALOGUE_LEXICAL_MATCH'] as const;
const nonBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const exactKeys = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => key in value);
const gateSchema = (values: readonly string[], count: number) => ({ type: 'array', minItems: count, maxItems: count, items: { type: 'object', additionalProperties: false, required: ['gate', 'status'], properties: { gate: { type: 'string', enum: values }, status: { type: 'string', enum: ['PASS', 'FAIL'] } } } });
/** Complete first trust-boundary schema; parseObservation remains the exact second boundary. */
export const SCENE_QC_OUTPUT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['sceneId', 'candidateAssetId', 'frame', 'temporal', 'speechDetected', 'spokenTranscript', 'dialogueComplete', 'unexpectedSpeechDetected', 'presentationDynamics'],
  properties: {
    sceneId: { type: 'string' }, candidateAssetId: { type: 'string' }, frame: gateSchema(frame, 4), temporal: gateSchema(temporal, 6),
    speechDetected: { type: 'boolean' }, spokenTranscript: { type: 'string' }, dialogueComplete: { type: 'boolean' }, unexpectedSpeechDetected: { type: 'boolean' },
    presentationDynamics: { type: 'object', additionalProperties: false, required: ['status', 'meaningfulVisualProgression', 'excessiveStaticHold', 'rhythmIntentObserved', 'notes'], properties: { status: { type: 'string', enum: ['PASS', 'WARN'] }, meaningfulVisualProgression: { type: 'boolean' }, excessiveStaticHold: { type: 'boolean' }, rhythmIntentObserved: { type: 'boolean' }, notes: { type: 'string' } } }
  }
} as const;

/** NFC, lowercase, punctuation deletion, whitespace collapse, then trim; Vietnamese diacritics and digits remain lexical. */
export function normalizeVietnameseSpeechForQc(value: string): string {
  return value.normalize('NFC').toLocaleLowerCase('vi-VN').replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/gu, ' ').trim();
}

type Observation = { sceneId: string; candidateAssetId: string; frame: readonly SceneQcGateResultV1<SceneQcFrameGate>[]; temporal: readonly SceneQcGateResultV1<SceneQcTemporalGate>[]; speechDetected: boolean; spokenTranscript: string; dialogueComplete: boolean; unexpectedSpeechDetected: boolean; presentationDynamics: PresentationDynamicsV1; };
function gates(value: unknown, expected: readonly string[]): readonly SceneQcGateResultV1<string>[] | undefined {
  if (!Array.isArray(value) || value.length !== expected.length) return undefined;
  if (!value.every(item => exactKeys(item, ['gate', 'status']) && expected.includes(item.gate as string) && ((item as { status: unknown }).status === 'PASS' || (item as { status: unknown }).status === 'FAIL'))) return undefined;
  if (new Set(value.map(item => (item as { gate: string }).gate)).size !== expected.length) return undefined;
  return value as readonly SceneQcGateResultV1<string>[];
}
function parseObservation(value: unknown): Observation {
  const keys = ['sceneId', 'candidateAssetId', 'frame', 'temporal', 'speechDetected', 'spokenTranscript', 'dialogueComplete', 'unexpectedSpeechDetected', 'presentationDynamics'];
  if (!exactKeys(value, keys)) throw new SceneQcError('INVALID_MODEL_OUTPUT');
  const row = value as Record<string, unknown>; const frameGates = gates(row.frame, frame); const temporalGates = gates(row.temporal, temporal);
  const dynamicsKeys = ['status', 'meaningfulVisualProgression', 'excessiveStaticHold', 'rhythmIntentObserved', 'notes'];
  if (!nonBlank(row.sceneId) || !nonBlank(row.candidateAssetId) || !frameGates || !temporalGates || typeof row.speechDetected !== 'boolean' || typeof row.spokenTranscript !== 'string' || typeof row.dialogueComplete !== 'boolean' || typeof row.unexpectedSpeechDetected !== 'boolean' || !exactKeys(row.presentationDynamics, dynamicsKeys)) throw new SceneQcError('INVALID_MODEL_OUTPUT');
  const d = row.presentationDynamics as Record<string, unknown>;
  if (!['PASS', 'WARN'].includes(d.status as string) || typeof d.meaningfulVisualProgression !== 'boolean' || typeof d.excessiveStaticHold !== 'boolean' || typeof d.rhythmIntentObserved !== 'boolean' || typeof d.notes !== 'string') throw new SceneQcError('INVALID_MODEL_OUTPUT');
  return { sceneId: row.sceneId, candidateAssetId: row.candidateAssetId, frame: frameGates as readonly SceneQcGateResultV1<SceneQcFrameGate>[], temporal: temporalGates as readonly SceneQcGateResultV1<SceneQcTemporalGate>[], speechDetected: row.speechDetected, spokenTranscript: row.spokenTranscript, dialogueComplete: row.dialogueComplete, unexpectedSpeechDetected: row.unexpectedSpeechDetected, presentationDynamics: d as unknown as PresentationDynamicsV1 };
}
function validateInput(input: SceneQcInputV1): void {
  const { candidate, anchor, productionRequest, video, references } = input;
  if (validateGeneratedSceneCandidateV1(candidate).length || candidate.candidateVersion !== GENERATED_SCENE_CANDIDATE_V1 || validateSceneAnchorV1(anchor).length
    || candidate.sceneId !== anchor.sceneId || candidate.dialogue !== anchor.dialogue || candidate.voiceIdentityId !== anchor.voiceIdentityId
    || productionRequest.sceneId !== anchor.sceneId || productionRequest.dialogue !== anchor.dialogue || productionRequest.nativeVoiceBinding.logicalVoiceIdentityId !== anchor.voiceIdentityId
    || video.sceneId !== candidate.sceneId || video.candidateAssetId !== candidate.candidateAssetId || !video.mimeType.startsWith('video/') || !nonBlank(video.dataBase64)
    || !Array.isArray(references) || references.length !== anchor.referenceAssetIds.length) throw new SceneQcError('INVALID_INPUT');
  const ids = references.map(reference => reference.assetId);
  if (new Set(ids).size !== ids.length || ids.some((id, index) => id !== anchor.referenceAssetIds[index]) || references.some(reference => reference.sceneId !== anchor.sceneId || !reference.mimeType.startsWith('image/') || !nonBlank(reference.dataBase64))) throw new SceneQcError('INVALID_INPUT');
}
function requestFor(input: SceneQcInputV1): StructuredIntelligenceRequest<Observation> {
  const a = input.anchor;
  return { instruction: 'SCENE_QC_V1: Observe one supplied candidate video against the supplied authoritative product reference images. Return only the declared JSON. Assess every frame and temporal gate strictly; preserve physical correctness over presentation rhythm. Transcribe speech exactly as heard without paraphrasing.', inputText: JSON.stringify({ sceneId: a.sceneId, candidateAssetId: input.candidate.candidateAssetId, primaryAction: a.primaryAction, startState: a.startState, endState: a.endState, visualRhythm: a.visualRhythm, expectedDialogue: a.dialogue }), media: [{ assetId: input.candidate.candidateAssetId, mimeType: input.video.mimeType, dataBase64: input.video.dataBase64 }, ...input.references.map(reference => ({ assetId: reference.assetId, mimeType: reference.mimeType, dataBase64: reference.dataBase64 }))], outputSchema: SCENE_QC_OUTPUT_SCHEMA, parse: parseObservation };
}

/** One structured intelligence observation, followed by deterministic fail-closed report compilation. */
export async function evaluateSceneQcV1(input: SceneQcInputV1): Promise<SceneQcReportV1> {
  validateInput(input);
  let observation: Observation;
  try { observation = (await input.intelligence.analyzeStructured(requestFor(input))).data; }
  catch (error: unknown) { if (error instanceof SceneQcError || (error instanceof IntelligenceProviderError && error.code === 'INVALID_RESPONSE')) throw new SceneQcError('INVALID_MODEL_OUTPUT'); throw new SceneQcError('PROVIDER_FAILURE'); }
  try { observation = parseObservation(observation); } catch { throw new SceneQcError('INVALID_MODEL_OUTPUT'); }
  if (observation.sceneId !== input.candidate.sceneId || observation.candidateAssetId !== input.candidate.candidateAssetId) throw new SceneQcError('INVALID_MODEL_OUTPUT');
  const speechGates: readonly SceneQcGateResultV1<SceneQcSpeechGate>[] = [
    { gate: 'SPEECH_DETECTED', status: observation.speechDetected ? 'PASS' : 'FAIL' },
    { gate: 'DIALOGUE_COMPLETE', status: observation.dialogueComplete ? 'PASS' : 'FAIL' },
    { gate: 'NO_UNEXPECTED_SPEECH', status: !observation.unexpectedSpeechDetected ? 'PASS' : 'FAIL' },
    { gate: 'EXACT_DIALOGUE_LEXICAL_MATCH', status: normalizeVietnameseSpeechForQc(observation.spokenTranscript) === normalizeVietnameseSpeechForQc(input.anchor.dialogue) ? 'PASS' : 'FAIL' }
  ];
  const all = [...observation.frame, ...observation.temporal, ...speechGates];
  const criticalFailureReasons = all.filter(gate => gate.status === 'FAIL').map(gate => gate.gate);
  const ordered = <T extends string>(items: readonly SceneQcGateResultV1<T>[], expected: readonly T[]) => expected.map(gate => items.find(item => item.gate === gate)!);
  return { qcVersion: SCENE_QC_V1, result: criticalFailureReasons.length === 0 ? 'SCENE_QC_PASS' : 'SCENE_QC_FAIL', sceneId: input.candidate.sceneId, candidateAssetId: input.candidate.candidateAssetId, frameGates: ordered(observation.frame, frame), temporalGates: ordered(observation.temporal, temporal), speechGates, spokenTranscript: observation.spokenTranscript, presentationDynamics: observation.presentationDynamics, criticalFailureReasons, intelligenceCallCount: 1 };
}
