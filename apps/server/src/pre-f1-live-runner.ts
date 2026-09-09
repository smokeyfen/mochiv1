import {
  validateCreativeDirectionInput,
  validateProductInput,
  type CreativeDirectionInput,
  type ProductInput
} from '@mochi/contracts';
import { createUntestedActionCapabilityMap, simpleActionFastTrackPolicyV1, type ActionCapabilityMap, type SimpleActionFastTrackPolicyV1 } from '@mochi/core';
import {
  createGemini35FlashLiteIntelligenceProviderFromEnv,
  type IntelligenceProvider,
  type StructuredIntelligenceRequest
} from '@mochi/providers';
import { createProductionSnapshotStore, type ProductionSnapshotStore } from './production-snapshot.ts';
import { createLayerArtifactStore, type LayerArtifactStore } from './layer-artifact-store.ts';
import { createProductionRuntime, ProductionRuntimeError, type ProductionRuntimeRequest } from './production-runtime.ts';
import { buildSmokeEvidenceRequest, loadSmokeManifest, type R1B2SmokeImage } from './smoke.ts';

interface PreF1LiveManifest {
  readonly projectId: string;
  readonly product: ProductInput;
  readonly creativeDirection: CreativeDirectionInput;
  readonly images: readonly R1B2SmokeImage[];
  readonly sourceEvidenceVersion: string;
}

const INTELLIGENCE_STAGES = [
  'R1_PRODUCT_EVIDENCE', 'R2_A_PRODUCT_TRUTH', 'R2_B_REFERENCE_ASSESSMENT', 'R3_CONTINUITY',
  'R4_GLOBAL_PLAN', 'R4_1_KEY_POINTS', 'R7_A_HUMAN_REALISM',
  'R7_B_DIALOGUE_GENERATION', 'R7_B_DIALOGUE_SEMANTIC_GATE'
] as const;

export type PreF1LiveReport =
  | { readonly status: 'BLOCKED_BY_ENVIRONMENT'; readonly missingPrerequisites: readonly string[] }
  | { readonly status: 'FAIL'; readonly category: string }
  | {
    readonly status: 'PASS'; readonly intelligenceRequests: number; readonly intelligenceStages: readonly string[];
    readonly snapshotId: string; readonly productId: string; readonly sceneIds: readonly string[]; readonly voiceIdentityId: string;
  };

export interface PreF1LiveRunnerDependencies {
  readonly environment: NodeJS.ProcessEnv;
  /** Trusted server source only; it is never read from a manifest or environment override. */
  readonly getTrustedCapabilityMap?: () => ActionCapabilityMap;
  /** Trusted server policy only; it is never read from a manifest or environment override. */
  readonly getTrustedProductionEligibilityPolicy?: () => SimpleActionFastTrackPolicyV1;
  readonly loadManifest?: (path: string | undefined) => Promise<PreF1LiveManifest>;
  readonly prepareMedia?: typeof buildSmokeEvidenceRequest;
  readonly createIntelligence?: (environment: NodeJS.ProcessEnv) => IntelligenceProvider;
  readonly createSnapshotStore?: (storageRoot: string) => ProductionSnapshotStore;
  readonly createLayerArtifactStore?: (storageRoot: string) => LayerArtifactStore;
  readonly createRuntime?: typeof createProductionRuntime;
}

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function missingEnvironmentPrerequisites(environment: NodeJS.ProcessEnv): readonly string[] {
  const missing: string[] = [];
  if (environment.PRE_F1_LIVE !== '1') missing.push('PRE_F1_LIVE=1');
  if (!nonBlank(environment.GEMINI_API_KEY)) missing.push('GEMINI_API_KEY');
  if (!nonBlank(environment.PRE_F1_LIVE_MANIFEST)) missing.push('PRE_F1_LIVE_MANIFEST');
  if (!nonBlank(environment.PRE_F1_SNAPSHOT_STORAGE_ROOT)) missing.push('PRE_F1_SNAPSHOT_STORAGE_ROOT');
  return missing;
}

/** Current trusted state until Flow benchmark/capability evidence produces empirical classifications. */
export function getCurrentTrustedCapabilityMap(): ActionCapabilityMap {
  return createUntestedActionCapabilityMap();
}

/** The user-authorized production policy is never an empirical capability classification. */
export function getCurrentTrustedProductionEligibilityPolicy(): SimpleActionFastTrackPolicyV1 {
  return simpleActionFastTrackPolicyV1;
}

function validManifest(value: unknown): value is PreF1LiveManifest {
  if (!value || typeof value !== 'object') return false;
  const manifest = value as Partial<PreF1LiveManifest>;
  return nonBlank(manifest.projectId)
    && nonBlank(manifest.sourceEvidenceVersion)
    && manifest.product !== undefined
    && manifest.creativeDirection !== undefined
    && validateProductInput(manifest.product).length === 0
    && validateCreativeDirectionInput(manifest.creativeDirection).length === 0
    && Array.isArray(manifest.images);
}

async function defaultLoadManifest(path: string | undefined): Promise<PreF1LiveManifest> {
  const manifest = await loadSmokeManifest(path);
  if (!validManifest(manifest)) throw new Error('PRE_F1_LIVE_INPUT_INVALID');
  return manifest;
}

function safeFailureCategory(error: unknown): string {
  if (error instanceof ProductionRuntimeError) return `RUNTIME_${error.stage}`;
  return 'INPUT_OR_CONFIGURATION';
}

/**
 * Trusted inputs are composed before manifest/media reads; R5 and R6 remain
 * mandatory inside the runtime before any downstream stage can proceed.
 */
export async function runPreF1Live(dependencies: PreF1LiveRunnerDependencies): Promise<PreF1LiveReport> {
  const environment = dependencies.environment;
  const missingPrerequisites = missingEnvironmentPrerequisites(environment);
  if (missingPrerequisites.length > 0) return { status: 'BLOCKED_BY_ENVIRONMENT', missingPrerequisites };

  const capabilityMap = (dependencies.getTrustedCapabilityMap ?? getCurrentTrustedCapabilityMap)();
  const productionEligibilityPolicy = (dependencies.getTrustedProductionEligibilityPolicy ?? getCurrentTrustedProductionEligibilityPolicy)();

  try {
    const manifest = await (dependencies.loadManifest ?? defaultLoadManifest)(environment.PRE_F1_LIVE_MANIFEST);
    const evidenceRequest = await (dependencies.prepareMedia ?? buildSmokeEvidenceRequest)({ product: manifest.product, images: manifest.images });
    const concrete = (dependencies.createIntelligence ?? createGemini35FlashLiteIntelligenceProviderFromEnv)(environment);
    const calls: string[] = [];
    const intelligence: IntelligenceProvider = {
      id: concrete.id,
      async analyzeStructured<T>(request: StructuredIntelligenceRequest<T>) {
        const stage = INTELLIGENCE_STAGES[calls.length];
        if (!stage) throw new Error('unexpected_intelligence_call');
        calls.push(stage);
        return concrete.analyzeStructured(request);
      }
    };
    const runtime = (dependencies.createRuntime ?? createProductionRuntime)({
      intelligence,
      snapshotStore: (dependencies.createSnapshotStore ?? (storageRoot => createProductionSnapshotStore({ storageRoot })))(environment.PRE_F1_SNAPSHOT_STORAGE_ROOT!),
      layerArtifactStore: (dependencies.createLayerArtifactStore ?? (storageRoot => createLayerArtifactStore({ storageRoot })))(environment.PRE_F1_SNAPSHOT_STORAGE_ROOT!)
    });
    const result = await runtime.run({
      projectId: manifest.projectId,
      product: evidenceRequest.product,
      creativeDirection: manifest.creativeDirection,
      media: evidenceRequest.media,
      sourceEvidenceVersion: manifest.sourceEvidenceVersion,
      capabilityMap,
      productionEligibilityPolicy
    } satisfies ProductionRuntimeRequest);
    return {
      status: 'PASS', intelligenceRequests: calls.length, intelligenceStages: calls,
      snapshotId: result.snapshot.snapshotId, productId: result.snapshot.productId,
      sceneIds: result.snapshot.productionContract.scenes.map(scene => scene.sceneId),
      voiceIdentityId: result.snapshot.productionContract.voiceIdentityId
    };
  } catch (error: unknown) {
    return { status: 'FAIL', category: safeFailureCategory(error) };
  }
}
