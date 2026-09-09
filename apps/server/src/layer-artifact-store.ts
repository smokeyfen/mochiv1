import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, open, readFile, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { SCHEMA_VERSION, type ActionId, type ProductEvidence, type ProductInput, type R2CommittedProductContext, type VoiceIdentityId } from '@mochi/contracts';
import type { ActionCapabilityMap, SimpleActionFastTrackPolicyV1 } from '@mochi/core';
import type { IntelligenceMediaInput } from '@mochi/providers';
import {
  PRODUCT_FOUNDATION_V1,
  PRODUCT_REFERENCE_BINDING_V1,
  SCENE_BLUEPRINT_V1,
  FINALIZED_SCRIPT_V1,
  validateFinalizedScriptV1,
  validateProductFoundationV1,
  validateSceneBlueprintV1,
  type FinalizedScriptV1,
  type ProductFoundationV1,
  type ProductReferenceBindingV1,
  type SceneBlueprintV1
} from '@mochi/reasoning';
import { canonicalJson } from './production-snapshot.ts';

const FOUNDATION_ID = /^pf_[0-9a-f]{64}$/;
const BLUEPRINT_ID = /^sb_[0-9a-f]{64}$/;
const SCRIPT_ID = /^fs_[0-9a-f]{64}$/;
const SNAPSHOT_ID = /^ps_[0-9a-f]{64}$/;
const READY_ID = /^pr_[0-9a-f]{64}$/;
const SHA256 = /^[0-9a-f]{64}$/;

export const PRODUCTION_READY_V1 = 'PRODUCTION_READY_V1' as const;

export interface ProductionReadySceneProofV1 {
  readonly sceneId: string;
  readonly index: 1 | 2 | 3 | 4;
  readonly primaryAction: ActionId;
  readonly sceneAnchorSha256: string;
  readonly flowPromptSha256: string;
  readonly dialogueSha256: string;
  readonly voiceIdentityId: VoiceIdentityId;
  readonly referenceAssetIds: readonly string[];
  readonly durationSeconds: 8;
  readonly aspectRatio: '9:16';
  readonly effects: { readonly sfx: 'NONE'; readonly vfx: 'NONE' };
  readonly promptUnicodeCharacterCount: number;
  readonly promptBudgetStatus: 'TARGET' | 'COMPACTED_TARGET' | 'HEADROOM';
}

export interface ProductionReadyV1 {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly readyVersion: typeof PRODUCTION_READY_V1;
  readonly readyId: string;
  readonly scriptId: string;
  readonly snapshotId: string;
  readonly status: 'READY_FOR_FLOW';
  readonly compileProof: {
    readonly sceneCount: 4;
    readonly scenes: readonly [
      ProductionReadySceneProofV1,
      ProductionReadySceneProofV1,
      ProductionReadySceneProofV1,
      ProductionReadySceneProofV1
    ];
  };
}

export type LayerArtifactErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'CORRUPT_ARTIFACT' | 'ARTIFACT_CONFLICT' | 'STORAGE_FAILURE';

export class LayerArtifactError extends Error {
  readonly code: LayerArtifactErrorCode;
  constructor(code: LayerArtifactErrorCode) {
    super(`LAYER_ARTIFACT_ERROR:${code}`);
    this.name = 'LayerArtifactError';
    this.code = code;
  }
}

export interface CreateProductFoundationRequest {
  readonly projectId: string;
  readonly productReferenceBinding: ProductReferenceBindingV1;
  readonly productEvidence: ProductEvidence;
  readonly committedContext: R2CommittedProductContext;
}

export interface CreateSceneBlueprintRequest extends Omit<SceneBlueprintV1, 'schemaVersion' | 'blueprintVersion' | 'blueprintId'> {}
export interface CreateFinalizedScriptRequest extends Omit<FinalizedScriptV1, 'schemaVersion' | 'scriptVersion' | 'scriptId'> {}
export interface CreateProductionReadyRequest extends Omit<ProductionReadyV1, 'schemaVersion' | 'readyVersion' | 'readyId'> {}

export interface LayerArtifactStore {
  createProductFoundation(request: CreateProductFoundationRequest): Promise<ProductFoundationV1>;
  loadProductFoundation(foundationId: string): Promise<ProductFoundationV1>;
  createSceneBlueprint(request: CreateSceneBlueprintRequest): Promise<SceneBlueprintV1>;
  loadSceneBlueprint(blueprintId: string): Promise<SceneBlueprintV1>;
  createFinalizedScript(request: CreateFinalizedScriptRequest): Promise<FinalizedScriptV1>;
  loadFinalizedScript(scriptId: string): Promise<FinalizedScriptV1>;
  createProductionReady(request: CreateProductionReadyRequest): Promise<ProductionReadyV1>;
  loadProductionReady(readyId: string): Promise<ProductionReadyV1>;
}

export interface LayerArtifactStoreOptions {
  /** Trusted server configuration. It is never serialized into either artifact. */
  readonly storageRoot: string;
}

type FoundationContent = Omit<ProductFoundationV1, 'foundationId'>;
type BlueprintContent = Omit<SceneBlueprintV1, 'blueprintId'>;
type ScriptContent = Omit<FinalizedScriptV1, 'scriptId'>;
type ReadyContent = Omit<ProductionReadyV1, 'readyId'>;

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function contentId(prefix: 'pf' | 'sb' | 'fs' | 'pr', content: FoundationContent | BlueprintContent | ScriptContent | ReadyContent): string {
  try { return `${prefix}_${sha256(canonicalJson(content))}`; }
  catch { throw new LayerArtifactError('INVALID_INPUT'); }
}

const READY_KEYS = ['schemaVersion', 'readyVersion', 'readyId', 'scriptId', 'snapshotId', 'status', 'compileProof'] as const;
const COMPILE_PROOF_KEYS = ['sceneCount', 'scenes'] as const;
const READY_SCENE_KEYS = [
  'sceneId', 'index', 'primaryAction', 'sceneAnchorSha256', 'flowPromptSha256', 'dialogueSha256',
  'voiceIdentityId', 'referenceAssetIds', 'durationSeconds', 'aspectRatio', 'effects',
  'promptUnicodeCharacterCount', 'promptBudgetStatus'
] as const;
const EFFECT_KEYS = ['sfx', 'vfx'] as const;
const ACTION_SPINE = ['PICK_UP', 'HOLD', 'ROTATE_SLOW', 'HOLD'] as const;
const VOICE_IDENTITIES = new Set(['VN_FEMALE_SOUTH_REVIEW_V1', 'VN_MALE_SOUTH_REVIEW_V1']);

function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => key in value);
}

/** Strict standalone shape validation; load additionally verifies the content-addressed readyId. */
export function validateProductionReadyV1(value: unknown): string[] {
  if (!exact(value, READY_KEYS)) return ['shape'];
  const ready = value as unknown as ProductionReadyV1;
  const issues: string[] = [];
  if (ready.schemaVersion !== SCHEMA_VERSION || ready.readyVersion !== PRODUCTION_READY_V1) issues.push('version');
  if (!READY_ID.test(ready.readyId) || !SCRIPT_ID.test(ready.scriptId) || !SNAPSHOT_ID.test(ready.snapshotId)) issues.push('lineage');
  if (ready.status !== 'READY_FOR_FLOW') issues.push('status');
  if (!exact(ready.compileProof, COMPILE_PROOF_KEYS)
    || ready.compileProof.sceneCount !== 4 || !Array.isArray(ready.compileProof.scenes)
    || ready.compileProof.scenes.length !== 4) return [...issues, 'compile_proof'];
  const sceneIds = new Set<string>();
  for (let offset = 0; offset < 4; offset += 1) {
    const scene = ready.compileProof.scenes[offset];
    if (!exact(scene, READY_SCENE_KEYS)) {
      issues.push('scene_proof');
      continue;
    }
    const proof = scene as unknown as ProductionReadySceneProofV1;
    if (!nonBlank(proof.sceneId) || sceneIds.has(proof.sceneId) || proof.index !== offset + 1
      || proof.primaryAction !== ACTION_SPINE[offset]) issues.push('scene_binding');
    sceneIds.add(proof.sceneId);
    if (!SHA256.test(proof.sceneAnchorSha256) || !SHA256.test(proof.flowPromptSha256)
      || !SHA256.test(proof.dialogueSha256)) issues.push('hash');
    if (!VOICE_IDENTITIES.has(proof.voiceIdentityId)) issues.push('voice');
    if (!Array.isArray(proof.referenceAssetIds) || proof.referenceAssetIds.some(id => !nonBlank(id))) issues.push('references');
    if (proof.durationSeconds !== 8 || proof.aspectRatio !== '9:16'
      || !exact(proof.effects, EFFECT_KEYS) || proof.effects.sfx !== 'NONE' || proof.effects.vfx !== 'NONE') issues.push('format');
    if (!Number.isInteger(proof.promptUnicodeCharacterCount) || proof.promptUnicodeCharacterCount <= 0
      || proof.promptUnicodeCharacterCount > 3200
      || !['TARGET', 'COMPACTED_TARGET', 'HEADROOM'].includes(proof.promptBudgetStatus)
      || (proof.promptBudgetStatus === 'HEADROOM' && proof.promptUnicodeCharacterCount <= 2800)
      || (proof.promptBudgetStatus !== 'HEADROOM' && proof.promptUnicodeCharacterCount > 2800)) issues.push('prompt_budget');
  }
  return [...new Set(issues)];
}

/** Creates the exact ordered product/reference binding while retaining only SHA-256 byte identity. */
export function createProductReferenceBindingV1(
  product: ProductInput,
  media: readonly IntelligenceMediaInput[]
): ProductReferenceBindingV1 {
  return {
    bindingVersion: PRODUCT_REFERENCE_BINDING_V1,
    product: structuredClone(product),
    references: media.map(reference => ({
      assetId: reference.assetId,
      mimeType: reference.mimeType,
      sha256: sha256(Buffer.from(reference.dataBase64, 'base64'))
    }))
  };
}

/** Proves a loaded L1 artifact still belongs to the exact current factual input and reference bytes. */
export function validateProductFoundationBinding(
  foundation: ProductFoundationV1,
  product: ProductInput,
  media: readonly IntelligenceMediaInput[]
): readonly string[] {
  if (validateProductFoundationV1(foundation).length > 0) return ['foundation'];
  return canonicalJson(foundation.productReferenceBinding) === canonicalJson(createProductReferenceBindingV1(product, media))
    ? []
    : ['stale_product_reference_binding'];
}

/** Proves an L2 artifact is reusable only for the exact current creative and production-eligibility inputs. */
export function validateSceneBlueprintBinding(
  blueprint: SceneBlueprintV1,
  foundation: ProductFoundationV1,
  creativeDirection: SceneBlueprintV1['creativeDirection'],
  capabilityMap: ActionCapabilityMap,
  productionEligibilityPolicy?: SimpleActionFastTrackPolicyV1
): readonly string[] {
  if (validateSceneBlueprintV1(blueprint, foundation).length > 0) return ['blueprint'];
  if (blueprint.foundationId !== foundation.foundationId) return ['stale_foundation_lineage'];
  if (canonicalJson(blueprint.creativeDirection) !== canonicalJson(creativeDirection)) return ['stale_creative_direction'];
  const expectedEligibility = {
    capabilityMap,
    productionEligibilityPolicy: productionEligibilityPolicy ?? null
  };
  return canonicalJson(blueprint.eligibilityBinding) === canonicalJson(expectedEligibility)
    ? []
    : ['stale_eligibility_binding'];
}

function artifactPath(root: string, directory: string, id: string, pattern: RegExp, code: LayerArtifactErrorCode): string {
  if (typeof id !== 'string' || !pattern.test(id)) throw new LayerArtifactError(code);
  const filename = `${id}.json`;
  const path = join(root, directory, filename);
  if (basename(path) !== filename) throw new LayerArtifactError(code);
  return path;
}

function normalizeStorageError(error: unknown): LayerArtifactError {
  return error instanceof LayerArtifactError ? error : new LayerArtifactError('STORAGE_FAILURE');
}

function parseJson(text: string): unknown {
  try { return JSON.parse(text); } catch { throw new LayerArtifactError('CORRUPT_ARTIFACT'); }
}

export function createLayerArtifactStore(options: LayerArtifactStoreOptions): LayerArtifactStore {
  if (!nonBlank(options?.storageRoot)) throw new LayerArtifactError('INVALID_INPUT');
  const root = options.storageRoot;

  async function publish<T>(directory: string, id: string, value: T, pattern: RegExp): Promise<T> {
    const target = artifactPath(root, directory, id, pattern, 'INVALID_INPUT');
    const serialized = canonicalJson(value);
    let temporaryPath: string | undefined;
    try {
      const directoryPath = join(root, directory);
      await mkdir(directoryPath, { recursive: true });
      temporaryPath = join(directoryPath, `.${id}.${randomUUID()}.tmp`);
      const handle = await open(temporaryPath, 'wx');
      try { await handle.writeFile(serialized, 'utf8'); } finally { await handle.close(); }
      try {
        await link(temporaryPath, target);
        await unlink(temporaryPath);
        return value;
      } catch (error: unknown) {
        if ((error as { code?: unknown })?.code !== 'EEXIST') throw error;
        const existing = await readFile(target, 'utf8');
        if (existing !== serialized) throw new LayerArtifactError('ARTIFACT_CONFLICT');
        return parseJson(existing) as T;
      }
    } catch (error: unknown) {
      throw normalizeStorageError(error);
    } finally {
      if (temporaryPath) {
        try { await unlink(temporaryPath); } catch { /* already published or cleanup unavailable */ }
      }
    }
  }

  async function read(directory: string, id: string, pattern: RegExp): Promise<unknown> {
    const path = artifactPath(root, directory, id, pattern, 'INVALID_INPUT');
    try { return parseJson(await readFile(path, 'utf8')); }
    catch (error: unknown) {
      if ((error as { code?: unknown })?.code === 'ENOENT') throw new LayerArtifactError('NOT_FOUND');
      throw normalizeStorageError(error);
    }
  }

  async function loadProductFoundation(foundationId: string): Promise<ProductFoundationV1> {
    const parsed = await read('product-foundations', foundationId, FOUNDATION_ID);
    if (validateProductFoundationV1(parsed).length > 0) throw new LayerArtifactError('CORRUPT_ARTIFACT');
    const foundation = parsed as ProductFoundationV1;
    const { foundationId: _foundationId, ...content } = foundation;
    if (foundation.foundationId !== foundationId || contentId('pf', content) !== foundationId) {
      throw new LayerArtifactError('CORRUPT_ARTIFACT');
    }
    return foundation;
  }

  async function loadSceneBlueprint(blueprintId: string): Promise<SceneBlueprintV1> {
    const parsed = await read('scene-blueprints', blueprintId, BLUEPRINT_ID);
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as { foundationId?: unknown }).foundationId !== 'string') {
      throw new LayerArtifactError('CORRUPT_ARTIFACT');
    }
    const foundation = await loadProductFoundation((parsed as { foundationId: string }).foundationId);
    if (validateSceneBlueprintV1(parsed, foundation).length > 0) throw new LayerArtifactError('CORRUPT_ARTIFACT');
    const blueprint = parsed as SceneBlueprintV1;
    const { blueprintId: _blueprintId, ...content } = blueprint;
    if (blueprint.blueprintId !== blueprintId || contentId('sb', content) !== blueprintId) {
      throw new LayerArtifactError('CORRUPT_ARTIFACT');
    }
    return blueprint;
  }

  async function loadFinalizedScript(scriptId: string): Promise<FinalizedScriptV1> {
    const parsed = await read('finalized-scripts', scriptId, SCRIPT_ID);
    if (!parsed || typeof parsed !== 'object' || typeof (parsed as { blueprintId?: unknown }).blueprintId !== 'string') {
      throw new LayerArtifactError('CORRUPT_ARTIFACT');
    }
    const blueprint = await loadSceneBlueprint((parsed as { blueprintId: string }).blueprintId);
    const foundation = await loadProductFoundation(blueprint.foundationId);
    if (validateFinalizedScriptV1(parsed, blueprint, foundation).length > 0) throw new LayerArtifactError('CORRUPT_ARTIFACT');
    const script = parsed as FinalizedScriptV1;
    const { scriptId: _scriptId, ...content } = script;
    if (script.scriptId !== scriptId || contentId('fs', content) !== scriptId) {
      throw new LayerArtifactError('CORRUPT_ARTIFACT');
    }
    return script;
  }

  async function loadProductionReady(readyId: string): Promise<ProductionReadyV1> {
    const parsed = await read('production-ready', readyId, READY_ID);
    if (validateProductionReadyV1(parsed).length > 0) throw new LayerArtifactError('CORRUPT_ARTIFACT');
    const ready = parsed as ProductionReadyV1;
    const { readyId: _readyId, ...content } = ready;
    if (ready.readyId !== readyId || contentId('pr', content) !== readyId) {
      throw new LayerArtifactError('CORRUPT_ARTIFACT');
    }
    return ready;
  }

  return {
    async createProductFoundation(request): Promise<ProductFoundationV1> {
      const content: FoundationContent = {
        schemaVersion: SCHEMA_VERSION,
        foundationVersion: PRODUCT_FOUNDATION_V1,
        projectId: request.projectId,
        productReferenceBinding: request.productReferenceBinding,
        productEvidence: request.productEvidence,
        committedContext: request.committedContext
      };
      const foundation: ProductFoundationV1 = { ...content, foundationId: contentId('pf', content) };
      if (validateProductFoundationV1(foundation).length > 0) throw new LayerArtifactError('INVALID_INPUT');
      await publish('product-foundations', foundation.foundationId, foundation, FOUNDATION_ID);
      await loadProductFoundation(foundation.foundationId);
      return foundation;
    },
    loadProductFoundation,
    async createSceneBlueprint(request): Promise<SceneBlueprintV1> {
      const foundation = await loadProductFoundation(request.foundationId);
      const content: BlueprintContent = {
        schemaVersion: SCHEMA_VERSION,
        blueprintVersion: SCENE_BLUEPRINT_V1,
        ...request
      };
      const blueprint: SceneBlueprintV1 = { ...content, blueprintId: contentId('sb', content) };
      if (validateSceneBlueprintV1(blueprint, foundation).length > 0) throw new LayerArtifactError('INVALID_INPUT');
      await publish('scene-blueprints', blueprint.blueprintId, blueprint, BLUEPRINT_ID);
      await loadSceneBlueprint(blueprint.blueprintId);
      return blueprint;
    },
    loadSceneBlueprint,
    async createFinalizedScript(request): Promise<FinalizedScriptV1> {
      const blueprint = await loadSceneBlueprint(request.blueprintId);
      const foundation = await loadProductFoundation(blueprint.foundationId);
      const content: ScriptContent = {
        schemaVersion: SCHEMA_VERSION,
        scriptVersion: FINALIZED_SCRIPT_V1,
        ...request
      };
      const script: FinalizedScriptV1 = { ...content, scriptId: contentId('fs', content) };
      if (validateFinalizedScriptV1(script, blueprint, foundation).length > 0) throw new LayerArtifactError('INVALID_INPUT');
      await publish('finalized-scripts', script.scriptId, script, SCRIPT_ID);
      await loadFinalizedScript(script.scriptId);
      return script;
    },
    loadFinalizedScript,
    async createProductionReady(request): Promise<ProductionReadyV1> {
      const content: ReadyContent = {
        schemaVersion: SCHEMA_VERSION,
        readyVersion: PRODUCTION_READY_V1,
        ...request
      };
      const ready: ProductionReadyV1 = { ...content, readyId: contentId('pr', content) };
      if (validateProductionReadyV1(ready).length > 0) throw new LayerArtifactError('INVALID_INPUT');
      await publish('production-ready', ready.readyId, ready, READY_ID);
      await loadProductionReady(ready.readyId);
      return ready;
    },
    loadProductionReady
  };
}
