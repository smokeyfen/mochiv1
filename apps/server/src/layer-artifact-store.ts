import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, open, readFile, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { SCHEMA_VERSION, type ProductEvidence, type ProductInput, type R2CommittedProductContext } from '@mochi/contracts';
import type { ActionCapabilityMap, SimpleActionFastTrackPolicyV1 } from '@mochi/core';
import type { IntelligenceMediaInput } from '@mochi/providers';
import {
  PRODUCT_FOUNDATION_V1,
  PRODUCT_REFERENCE_BINDING_V1,
  SCENE_BLUEPRINT_V1,
  validateProductFoundationV1,
  validateSceneBlueprintV1,
  type ProductFoundationV1,
  type ProductReferenceBindingV1,
  type SceneBlueprintV1
} from '@mochi/reasoning';
import { canonicalJson } from './production-snapshot.ts';

const FOUNDATION_ID = /^pf_[0-9a-f]{64}$/;
const BLUEPRINT_ID = /^sb_[0-9a-f]{64}$/;

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

export interface LayerArtifactStore {
  createProductFoundation(request: CreateProductFoundationRequest): Promise<ProductFoundationV1>;
  loadProductFoundation(foundationId: string): Promise<ProductFoundationV1>;
  createSceneBlueprint(request: CreateSceneBlueprintRequest): Promise<SceneBlueprintV1>;
  loadSceneBlueprint(blueprintId: string): Promise<SceneBlueprintV1>;
}

export interface LayerArtifactStoreOptions {
  /** Trusted server configuration. It is never serialized into either artifact. */
  readonly storageRoot: string;
}

type FoundationContent = Omit<ProductFoundationV1, 'foundationId'>;
type BlueprintContent = Omit<SceneBlueprintV1, 'blueprintId'>;

function nonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function contentId(prefix: 'pf' | 'sb', content: FoundationContent | BlueprintContent): string {
  try { return `${prefix}_${sha256(canonicalJson(content))}`; }
  catch { throw new LayerArtifactError('INVALID_INPUT'); }
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
    loadSceneBlueprint
  };
}
