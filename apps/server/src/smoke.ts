import { readFile } from 'node:fs/promises';
import type { ProductInput } from '@mochi/contracts';
import type { IntelligenceMediaInput } from '@mochi/providers';
import type { ProductEvidenceService } from './product-evidence-service.ts';

export interface R1B2SmokeImage {
  readonly assetId: string;
  readonly path: string;
}

export interface R1B2SmokeManifest {
  readonly product: ProductInput;
  readonly images: readonly R1B2SmokeImage[];
}

export interface SmokeEvidenceRequest {
  readonly product: ProductInput;
  readonly media: readonly IntelligenceMediaInput[];
}

export type RuntimeFileReader = (path: string) => Promise<Uint8Array>;

export class R1B2SmokeError extends Error {
  readonly code:
    | 'MISSING_MANIFEST'
    | 'INVALID_MANIFEST'
    | 'UNREADABLE_IMAGE';

  constructor(code: R1B2SmokeError['code']) {
    super(`R1_B2_SMOKE_ERROR:${code}`);
    this.name = 'R1B2SmokeError';
    this.code = code;
  }
}

/** Reads runtime-only files without copying their paths or bytes into domain data. */
export async function buildSmokeEvidenceRequest(
  manifest: R1B2SmokeManifest,
  readRuntimeFile: RuntimeFileReader = readFile
): Promise<SmokeEvidenceRequest> {
  if (!isManifestLike(manifest)) throw new R1B2SmokeError('INVALID_MANIFEST');
  const product = toLogicalProductInput(manifest.product);

  const imagePathByAssetId = new Map<string, string>();
  for (const image of manifest.images) {
    if (typeof image.assetId !== 'string' || image.assetId.trim().length === 0
      || typeof image.path !== 'string' || image.path.trim().length === 0
      || imagePathByAssetId.has(image.assetId)) {
      throw new R1B2SmokeError('INVALID_MANIFEST');
    }
    imagePathByAssetId.set(image.assetId, image.path);
  }

  if (imagePathByAssetId.size !== product.assets.length) {
    throw new R1B2SmokeError('INVALID_MANIFEST');
  }

  const media: IntelligenceMediaInput[] = [];
  for (const asset of product.assets) {
    const path = imagePathByAssetId.get(asset.assetId);
    if (path === undefined) throw new R1B2SmokeError('INVALID_MANIFEST');
    let bytes: Uint8Array;
    try {
      bytes = await readRuntimeFile(path);
    } catch {
      throw new R1B2SmokeError('UNREADABLE_IMAGE');
    }
    if (bytes.byteLength === 0) throw new R1B2SmokeError('UNREADABLE_IMAGE');
    media.push({
      assetId: asset.assetId,
      mimeType: asset.mimeType,
      dataBase64: Buffer.from(bytes).toString('base64')
    });
  }
  return { product, media };
}

/** Invokes the evidence service exactly once for a prepared smoke request. */
export async function runSmokeEvidence(
  service: ProductEvidenceService,
  request: SmokeEvidenceRequest
) {
  return service.analyze(request);
}

export async function loadSmokeManifest(
  manifestPath: string | undefined,
  readManifest: RuntimeFileReader = readFile
): Promise<R1B2SmokeManifest> {
  if (manifestPath === undefined || manifestPath.trim().length === 0) {
    throw new R1B2SmokeError('MISSING_MANIFEST');
  }
  let raw: Uint8Array;
  try {
    raw = await readManifest(manifestPath);
  } catch {
    throw new R1B2SmokeError('MISSING_MANIFEST');
  }
  try {
    return JSON.parse(Buffer.from(raw).toString('utf8')) as R1B2SmokeManifest;
  } catch {
    throw new R1B2SmokeError('INVALID_MANIFEST');
  }
}

function isManifestLike(value: unknown): value is R1B2SmokeManifest {
  return typeof value === 'object' && value !== null
    && 'product' in value && 'images' in value
    && Array.isArray(value.images)
    && typeof value.product === 'object' && value.product !== null
    && Array.isArray((value.product as { assets?: unknown }).assets);
}

/** Retains only the canonical logical ProductInput fields from runtime JSON. */
function toLogicalProductInput(product: ProductInput): ProductInput {
  return {
    schemaVersion: product.schemaVersion,
    productId: product.productId,
    name: product.name,
    details: product.details,
    category: product.category,
    assets: product.assets.map(asset => ({
      schemaVersion: asset.schemaVersion,
      assetId: asset.assetId,
      role: asset.role,
      source: asset.source,
      mimeType: asset.mimeType,
      ...(asset.sha256 === undefined ? {} : { sha256: asset.sha256 }),
      ...(asset.viewAngle === undefined ? {} : { viewAngle: asset.viewAngle }),
      ...(asset.qualityScore === undefined ? {} : { qualityScore: asset.qualityScore })
    }))
  };
}
