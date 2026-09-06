import {
  SCHEMA_VERSION,
  validateProductEvidence,
  validateProductInput,
  type ProductClaim,
  type ProductEvidence,
  type ProductEvidenceContradiction,
  type ProductEvidenceUncertainty,
  type ProductInput
} from '@mochi/contracts';

export type ProductEvidenceClientErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_PRODUCT_INPUT'
  | 'MISSING_MEDIA'
  | 'INVALID_MEDIA'
  | 'PAYLOAD_TOO_LARGE'
  | 'ANALYSIS_RATE_LIMITED'
  | 'ANALYSIS_UNAVAILABLE'
  | 'ANALYSIS_AUTHENTICATION'
  | 'ANALYSIS_CONFIGURATION'
  | 'INVALID_ANALYSIS_RESPONSE'
  | 'ANALYSIS_PROVIDER_FAILURE'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE';

export class ProductEvidenceClientError extends Error {
  constructor(readonly code: ProductEvidenceClientErrorCode) {
    super(code);
    this.name = 'ProductEvidenceClientError';
  }
}

export interface AnalyzeProductEvidenceRequest {
  readonly product: ProductInput;
  readonly filesByAssetId: ReadonlyMap<string, File>;
  readonly signal?: AbortSignal;
}

const clientErrorCodes = new Set<ProductEvidenceClientErrorCode>([
  'INVALID_REQUEST', 'INVALID_PRODUCT_INPUT', 'MISSING_MEDIA', 'INVALID_MEDIA',
  'PAYLOAD_TOO_LARGE', 'ANALYSIS_RATE_LIMITED', 'ANALYSIS_UNAVAILABLE',
  'ANALYSIS_AUTHENTICATION', 'ANALYSIS_CONFIGURATION', 'INVALID_ANALYSIS_RESPONSE',
  'ANALYSIS_PROVIDER_FAILURE', 'NETWORK_ERROR', 'INVALID_RESPONSE'
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every(key => keys.includes(key));
};

const strings = (value: unknown): readonly string[] | null =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? [...value] : null;

function decodeClaim(value: unknown): ProductClaim | null {
  if (!isRecord(value) || !hasExactKeys(value, ['claimId', 'text', 'source', 'evidenceAssetIds', 'allowed'])) return null;
  const evidenceAssetIds = strings(value.evidenceAssetIds);
  if (typeof value.claimId !== 'string' || typeof value.text !== 'string' ||
    (value.source !== 'USER_INPUT' && value.source !== 'REFERENCE_EVIDENCE') ||
    evidenceAssetIds === null || typeof value.allowed !== 'boolean') return null;
  return { claimId: value.claimId, text: value.text, source: value.source, evidenceAssetIds, allowed: value.allowed };
}

function decodeUncertainty(value: unknown): ProductEvidenceUncertainty | null {
  if (!isRecord(value) || !hasExactKeys(value, ['subject', 'assetIds', 'reason'])) return null;
  const assetIds = strings(value.assetIds);
  if (typeof value.subject !== 'string' || typeof value.reason !== 'string' || assetIds === null) return null;
  return { subject: value.subject, assetIds, reason: value.reason };
}

function decodeContradiction(value: unknown): ProductEvidenceContradiction | null {
  if (!isRecord(value) || !hasExactKeys(value, ['statements', 'assetIds', 'reason'])) return null;
  const statements = strings(value.statements);
  const assetIds = strings(value.assetIds);
  if (statements === null || assetIds === null || typeof value.reason !== 'string') return null;
  return { statements, assetIds, reason: value.reason };
}

function decodeProductEvidence(value: unknown): ProductEvidence | null {
  const keys = [
    'schemaVersion', 'productId', 'canonicalAssetIds', 'identityDescription', 'geometryNotes',
    'colorNotes', 'packagingNotes', 'labelNotes', 'claims', 'prohibitedInferences',
    'uncertainties', 'contradictions'
  ];
  if (!isRecord(value) || !hasExactKeys(value, keys)) return null;
  const canonicalAssetIds = strings(value.canonicalAssetIds);
  const geometryNotes = strings(value.geometryNotes);
  const colorNotes = strings(value.colorNotes);
  const packagingNotes = strings(value.packagingNotes);
  const labelNotes = strings(value.labelNotes);
  const prohibitedInferences = strings(value.prohibitedInferences);
  if (value.schemaVersion !== SCHEMA_VERSION || typeof value.productId !== 'string' ||
    typeof value.identityDescription !== 'string' || canonicalAssetIds === null ||
    geometryNotes === null || colorNotes === null || packagingNotes === null ||
    labelNotes === null || prohibitedInferences === null || !Array.isArray(value.claims) ||
    !Array.isArray(value.uncertainties) || !Array.isArray(value.contradictions)) return null;
  const claims = value.claims.map(decodeClaim);
  const uncertainties = value.uncertainties.map(decodeUncertainty);
  const contradictions = value.contradictions.map(decodeContradiction);
  if (claims.some(claim => claim === null) || uncertainties.some(item => item === null) ||
    contradictions.some(item => item === null)) return null;
  return {
    schemaVersion: value.schemaVersion, productId: value.productId, canonicalAssetIds,
    identityDescription: value.identityDescription, geometryNotes, colorNotes, packagingNotes,
    labelNotes, claims: claims as ProductClaim[], prohibitedInferences,
    uncertainties: uncertainties as ProductEvidenceUncertainty[],
    contradictions: contradictions as ProductEvidenceContradiction[]
  };
}

function validateRequest({ product, filesByAssetId }: AnalyzeProductEvidenceRequest): void {
  if (validateProductInput(product).length > 0 || product.category.trim().length === 0) {
    throw new ProductEvidenceClientError('INVALID_PRODUCT_INPUT');
  }
  for (const asset of product.assets) {
    const file = filesByAssetId.get(asset.assetId);
    if (file === undefined) throw new ProductEvidenceClientError('MISSING_MEDIA');
    if (file.size === 0 || !file.type.startsWith('image/') || file.type !== asset.mimeType) {
      throw new ProductEvidenceClientError('INVALID_MEDIA');
    }
  }
}

async function decodeResponse(response: Response, product: ProductInput): Promise<ProductEvidence> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ProductEvidenceClientError('INVALID_RESPONSE');
  }
  if (!response.ok) {
    if (isRecord(body) && hasExactKeys(body, ['ok', 'error']) && body.ok === false && isRecord(body.error) &&
      typeof body.error.code === 'string' && clientErrorCodes.has(body.error.code as ProductEvidenceClientErrorCode)) {
      throw new ProductEvidenceClientError(body.error.code as ProductEvidenceClientErrorCode);
    }
    throw new ProductEvidenceClientError('INVALID_RESPONSE');
  }
  if (!isRecord(body) || !hasExactKeys(body, ['ok', 'evidence']) || body.ok !== true) {
    throw new ProductEvidenceClientError('INVALID_RESPONSE');
  }
  const evidence = decodeProductEvidence(body.evidence);
  if (evidence === null || validateProductEvidence(evidence, product).length > 0) {
    throw new ProductEvidenceClientError('INVALID_RESPONSE');
  }
  return evidence;
}

/** Browser-only boundary: sends factual ProductInput and runtime Files, never project or creative data. */
export async function analyzeProductEvidence(request: AnalyzeProductEvidenceRequest): Promise<ProductEvidence> {
  validateRequest(request);
  const formData = new FormData();
  formData.set('product', JSON.stringify(request.product));
  for (const asset of request.product.assets) formData.set(`asset:${asset.assetId}`, request.filesByAssetId.get(asset.assetId)!);
  let response: Response;
  try {
    response = await fetch('/api/product-evidence', {
      method: 'POST', body: formData, ...(request.signal === undefined ? {} : { signal: request.signal })
    });
  } catch (error) {
    if (request.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error;
    throw new ProductEvidenceClientError('NETWORK_ERROR');
  }
  return decodeResponse(response, request.product);
}
