import type { GeneratedCandidate, SceneProductionContract } from '@mochi/contracts';

export interface VideoProviderCapabilities {
  referenceToVideo: boolean;
  firstFrame: boolean;
  firstAndLastFrame: boolean;
  statefulEdit: boolean;
  portrait9x16: boolean;
  supportedDurationsSeconds: readonly number[];
}

export interface GenerateVideoRequest {
  contract: SceneProductionContract;
  resolvedAssets: Readonly<Record<string, string>>;
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
