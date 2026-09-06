import {
  SCHEMA_VERSION,
  type AssetRef,
  type AssetRole,
  type ProductInput
} from '@mochi/contracts';

const ASSET_ROLES = new Set<AssetRole>([
  'PRODUCT_REFERENCE', 'PRODUCT_FRONT', 'PRODUCT_SIDE', 'PRODUCT_BACK', 'PRODUCT_IN_HAND',
  'HAND_REFERENCE', 'ENVIRONMENT_REFERENCE', 'FIRST_FRAME', 'LAST_FRAME'
]);
const ASSET_SOURCES = new Set<AssetRef['source']>(['UPLOAD', 'GENERATED', 'DERIVED']);
const PRODUCT_KEYS = new Set(['schemaVersion', 'productId', 'name', 'details', 'category', 'assets']);
const ASSET_KEYS = new Set([
  'schemaVersion', 'assetId', 'role', 'source', 'mimeType', 'sha256', 'viewAngle', 'qualityScore'
]);

/** Strictly decodes untrusted JSON into only the canonical ProductInput shape. */
export function decodeProductInput(value: unknown): ProductInput | undefined {
  if (!isRecord(value) || hasUndeclaredKeys(value, PRODUCT_KEYS)) return undefined;
  if (value.schemaVersion !== SCHEMA_VERSION
    || !isNonBlankString(value.productId)
    || !isNonBlankString(value.name)
    || !isNonBlankString(value.details)
    || !isNonBlankString(value.category)
    || !Array.isArray(value.assets)) return undefined;

  const assets = value.assets.map(decodeAssetRef);
  const decodedAssets = assets.filter((asset): asset is AssetRef => asset !== undefined);
  if (decodedAssets.length === 0 || decodedAssets.length !== assets.length) return undefined;
  if (new Set(decodedAssets.map(asset => asset.assetId)).size !== decodedAssets.length) return undefined;
  return {
    schemaVersion: SCHEMA_VERSION,
    productId: value.productId,
    name: value.name,
    details: value.details,
    category: value.category,
    assets: decodedAssets
  };
}

function decodeAssetRef(value: unknown): AssetRef | undefined {
  if (!isRecord(value) || hasUndeclaredKeys(value, ASSET_KEYS)) return undefined;
  if (value.schemaVersion !== SCHEMA_VERSION
    || !isNonBlankString(value.assetId)
    || !isAssetRole(value.role)
    || !isAssetSource(value.source)
    || !isNonBlankString(value.mimeType)
    || !isOptionalString(value.sha256)
    || !isOptionalString(value.viewAngle)
    || !isOptionalQualityScore(value.qualityScore)) return undefined;
  return {
    schemaVersion: SCHEMA_VERSION,
    assetId: value.assetId,
    role: value.role,
    source: value.source,
    mimeType: value.mimeType,
    ...(value.sha256 === undefined ? {} : { sha256: value.sha256 }),
    ...(value.viewAngle === undefined ? {} : { viewAngle: value.viewAngle }),
    ...(value.qualityScore === undefined ? {} : { qualityScore: value.qualityScore })
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasUndeclaredKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).some(key => !allowed.has(key));
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isNonBlankString(value);
}

function isOptionalQualityScore(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1);
}

function isAssetRole(value: unknown): value is AssetRole {
  return typeof value === 'string' && ASSET_ROLES.has(value as AssetRole);
}

function isAssetSource(value: unknown): value is AssetRef['source'] {
  return typeof value === 'string' && ASSET_SOURCES.has(value as AssetRef['source']);
}
