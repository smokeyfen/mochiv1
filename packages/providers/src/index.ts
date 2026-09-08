import type { GeneratedCandidate, SceneProductionContract } from '@mochi/contracts';

export {
  IntelligenceProviderError,
  type IntelligenceMediaInput,
  type IntelligenceProvider,
  type IntelligenceProviderErrorCode,
  type StructuredIntelligenceRequest,
  type StructuredIntelligenceResult,
  type StructuredOutputSchema
} from './intelligence.ts';
export {
  GEMINI_3_5_FLASH_MODEL,
  Gemini35FlashIntelligenceProvider,
  createGemini35FlashIntelligenceProviderFromEnv,
  type GeminiIntelligenceTransport,
  type GeminiIntelligenceTransportFactory,
  type GeminiStructuredTransportRequest
} from './gemini-3-5-flash-intelligence.ts';

export interface VideoProviderCapabilities {
  referenceToVideo: boolean;
  firstFrame: boolean;
  firstAndLastFrame: boolean;
  statefulEdit: boolean;
  portrait9x16: boolean;
  supportedDurationsSeconds: readonly number[];
}

// Provider implementations own these resolved references. Their values may be
// provider URIs or IDs and must never be copied into Core AssetRef contracts.
export type ProviderAssetBindings = Readonly<Record<string, string>>;

export interface GenerateVideoRequest {
  contract: SceneProductionContract;
  resolvedAssets: ProviderAssetBindings;
}

export interface VideoProvider {
  readonly id: string;
  readonly capabilities: VideoProviderCapabilities;
  generate(request: GenerateVideoRequest): Promise<GeneratedCandidate>;
  edit?(candidate: GeneratedCandidate, instruction: string): Promise<GeneratedCandidate>;
}

export class CapabilityUnavailableError extends Error {
  constructor(capability: string) {
    super(`CAPABILITY_UNAVAILABLE:${capability}`);
    this.name = 'CapabilityUnavailableError';
  }
}

export { VoiceProviderError, validateVoiceSynthesisRequest, type VoiceProvider, type VoiceSynthesisRequest, type VoiceSynthesisResult, type VoiceProviderErrorCode } from './voice.ts';
export { SaydiBrowserVoiceProvider, createSaydiVoiceBindingRegistry, type SaydiBrowserDriver, type SaydiBrowserDriverResult, type SaydiVoiceBinding } from './saydi-browser-voice.ts';

export { SaydiPlaywrightDriver, SaydiSingleFlight, measureWavDurationMs, validateDownloadedWav, type SaydiPlaywrightDriverOptions, type ValidatedWavFile } from './saydi-playwright-driver.ts';
export {
  FLOW_SCENE_PROMPT_V1,
  FlowScenePromptError,
  compileFlowScenePromptV1,
  countUnicodeCodePoints,
  type FlowScenePromptBudgetStatus,
  type FlowScenePromptV1,
  type FlowScenePromptVersion
} from './flow-scene-prompt.ts';
export {
  FLOW_OMNI_FLASH_1_1_V1,
  FLOW_PRODUCTION_REQUEST_V1,
  FlowProductionError,
  compileFlowProductionRequestV1,
  executeFlowProductionRequestV1,
  mapFlowGeneratedCandidateV1,
  prepareSingleSceneCanaryV1,
  resolveFlowNativeVoiceBindingV1,
  resolveFlowReferenceBindingsV1,
  type FlowGeneratedCandidateResultV1,
  type FlowNativeVoiceBindingV1,
  type FlowProductionDriverV1,
  type FlowProductionModelTarget,
  type FlowProductionRequestV1,
  type FlowProductionRequestVersion,
  type FlowReferenceBindingV1,
  type SingleSceneCanaryPreparationV1
} from './flow-production.ts';
export {
  SCENE_QC_V1,
  SCENE_QC_OUTPUT_SCHEMA,
  SceneQcError,
  evaluateSceneQcV1,
  normalizeVietnameseSpeechForQc,
  type PresentationDynamicsV1,
  type SceneQcFrameGate,
  type SceneQcGateResultV1,
  type SceneQcInputV1,
  type SceneQcReferenceMediaV1,
  type SceneQcReportV1,
  type SceneQcSpeechGate,
  type SceneQcTemporalGate,
  type SceneQcVideoMediaV1
} from './scene-qc.ts';
export { FOUR_SCENE_PRODUCTION_V1, SequenceQcError, runFourSceneProductionV1, type FourSceneProductionInputV1, type GeneratedVideoMediaResolverV1, type GlobalGate, type PairwiseAssessmentV1, type PairwiseGate, type SequenceResultV1 } from './four-scene-production.ts';
