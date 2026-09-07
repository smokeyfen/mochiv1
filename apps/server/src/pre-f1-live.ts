import { readFile } from 'node:fs/promises';
import {
  validateCreativeDirectionInput,
  validateProductInput,
  type CreativeDirectionInput,
  type ProductInput
} from '@mochi/contracts';
import { createUntestedActionCapabilityMap } from '@mochi/core';
import {
  createGemini35FlashIntelligenceProviderFromEnv,
  type IntelligenceProvider,
  type StructuredIntelligenceRequest
} from '@mochi/providers';
import { createProductionSnapshotStore } from './production-snapshot.ts';
import { createProductionRuntime, ProductionRuntimeError } from './production-runtime.ts';
import { buildSmokeEvidenceRequest, type R1B2SmokeImage } from './smoke.ts';

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

function enabled(environment: NodeJS.ProcessEnv): boolean {
  return environment.PRE_F1_LIVE === '1'
    && nonBlank(environment.PRE_F1_LIVE_MANIFEST)
    && nonBlank(environment.PRE_F1_SNAPSHOT_STORAGE_ROOT)
    && nonBlank(environment.GEMINI_API_KEY);
}

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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

async function loadManifest(manifestPath: string): Promise<PreF1LiveManifest> {
  try {
    const parsed: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (!validManifest(parsed)) throw new Error('invalid');
    return parsed;
  } catch {
    throw new Error('PRE_F1_LIVE_INPUT_INVALID');
  }
}

function safeFailureCategory(error: unknown): string {
  if (error instanceof ProductionRuntimeError) return `RUNTIME_${error.stage}`;
  return 'INPUT_OR_CONFIGURATION';
}

async function main(): Promise<void> {
  if (!enabled(process.env)) {
    console.log('PRE_F1_LIVE_NOT_RUN');
    return;
  }

  try {
    const manifest = await loadManifest(process.env.PRE_F1_LIVE_MANIFEST!);
    const evidenceRequest = await buildSmokeEvidenceRequest({ product: manifest.product, images: manifest.images });
    const concrete = createGemini35FlashIntelligenceProviderFromEnv(process.env);
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
    const runtime = createProductionRuntime({
      intelligence,
      snapshotStore: createProductionSnapshotStore({ storageRoot: process.env.PRE_F1_SNAPSHOT_STORAGE_ROOT! })
    });
    const result = await runtime.run({
      projectId: manifest.projectId,
      product: evidenceRequest.product,
      creativeDirection: manifest.creativeDirection,
      media: evidenceRequest.media,
      sourceEvidenceVersion: manifest.sourceEvidenceVersion,
      // The real current ledger remains the default and is deliberately not persisted or mutated.
      capabilityMap: createUntestedActionCapabilityMap()
    });
    console.log('PRE_F1_LIVE=PASS');
    console.log(`intelligenceRequests=${calls.length}`);
    console.log(`intelligenceStages=${calls.join(',')}`);
    console.log(`snapshotId=${result.snapshot.snapshotId}`);
    console.log(`productId=${result.snapshot.productId}`);
    console.log(`sceneIds=${result.snapshot.productionContract.scenes.map(scene => scene.sceneId).join(',')}`);
    console.log('sceneStatuses=READY,READY,READY,READY');
    console.log(`voiceIdentityId=${result.snapshot.productionContract.voiceIdentityId}`);
  } catch (error: unknown) {
    console.error('PRE_F1_LIVE=FAIL');
    console.error(`category=${safeFailureCategory(error)}`);
    process.exitCode = 1;
  }
}

void main();
