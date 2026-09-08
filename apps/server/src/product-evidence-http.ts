import { IntelligenceProviderError } from '@mochi/providers';
import { ProductEvidenceError } from '@mochi/evidence';
import type { IntelligenceMediaInput } from '@mochi/providers';
import type { ProductInput } from '@mochi/contracts';
import type { ProductEvidenceService } from './product-evidence-service.ts';
import { decodeProductInput } from './product-input-decoder.ts';
import { sanitizeProductEvidence } from './product-evidence-response.ts';
import { createProductAnalysisReceiptStore, PRODUCT_ANALYSIS_RECEIPT_V1, type ProductAnalysisReceiptStore } from './product-analysis-receipt.ts';

export interface ProductEvidenceHttpHandlerDependencies {
  readonly service: ProductEvidenceService;
  readonly receiptStore?: ProductAnalysisReceiptStore;
}

type HttpFailureCode =
  | 'INVALID_REQUEST'
  | 'INVALID_PRODUCT_INPUT'
  | 'MISSING_MEDIA'
  | 'INVALID_MEDIA'
  | 'METHOD_NOT_ALLOWED'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'ANALYSIS_RATE_LIMITED'
  | 'ANALYSIS_UNAVAILABLE'
  | 'ANALYSIS_AUTHENTICATION'
  | 'ANALYSIS_CONFIGURATION'
  | 'INVALID_ANALYSIS_RESPONSE'
  | 'ANALYSIS_PROVIDER_FAILURE'
  | 'NOT_FOUND';

/** A small origin-neutral HTTP boundary around the existing evidence service. */
export function createProductEvidenceHttpHandler(
  dependencies: ProductEvidenceHttpHandlerDependencies
): (request: Request) => Promise<Response> {
  const receiptStore = dependencies.receiptStore ?? createProductAnalysisReceiptStore();
  return async request => {
    if (new URL(request.url).pathname !== '/api/product-evidence') return failure(404, 'NOT_FOUND');
    if (request.method !== 'POST') return failure(405, 'METHOD_NOT_ALLOWED');
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data')) {
      return failure(415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return failure(400, 'INVALID_REQUEST');
    }

    const product = decodeProductField(formData);
    if (product === undefined) return failure(400, 'INVALID_PRODUCT_INPUT');

    const mediaResult = await decodeMultipartMedia(formData, product);
    if ('response' in mediaResult) return mediaResult.response;

    try {
      const evidence = await dependencies.service.analyze({ product, media: mediaResult.media });
      const receipt = receiptStore.commit({ product, media: mediaResult.media, evidence });
      return Response.json({ ok: true, evidence: sanitizeProductEvidence(receipt.evidence), analysisReceiptId: receipt.analysisReceiptId, receiptVersion: PRODUCT_ANALYSIS_RECEIPT_V1 });
    } catch (error: unknown) {
      return mapServiceError(error);
    }
  };
}

function decodeProductField(formData: FormData): ProductInput | undefined {
  const values = formData.getAll('product');
  if (values.length !== 1 || typeof values[0] !== 'string') return undefined;
  try {
    return decodeProductInput(JSON.parse(values[0]));
  } catch {
    return undefined;
  }
}

async function decodeMultipartMedia(
  formData: FormData,
  product: ProductInput
): Promise<{ readonly media: readonly IntelligenceMediaInput[] } | { readonly response: Response }> {
  const expectedFields = new Set(product.assets.map(asset => `asset:${asset.assetId}`));
  const filesByField = new Map<string, File>();
  for (const [field, value] of formData.entries()) {
    if (field === 'product') continue;
    if (!field.startsWith('asset:') || field.length === 'asset:'.length || !expectedFields.has(field)) {
      return { response: failure(400, 'INVALID_MEDIA') };
    }
    if (typeof value === 'string' || !(value instanceof Blob) || filesByField.has(field)) {
      return { response: failure(400, 'INVALID_MEDIA') };
    }
    filesByField.set(field, value as File);
  }

  const media: IntelligenceMediaInput[] = [];
  for (const asset of product.assets) {
    const file = filesByField.get(`asset:${asset.assetId}`);
    if (file === undefined) return { response: failure(400, 'MISSING_MEDIA') };
    if (!file.type.startsWith('image/') || file.size === 0 || file.type !== asset.mimeType) {
      return { response: failure(400, 'INVALID_MEDIA') };
    }
    media.push({
      assetId: asset.assetId,
      mimeType: file.type,
      dataBase64: Buffer.from(await file.arrayBuffer()).toString('base64')
    });
  }
  return { media };
}

function mapServiceError(error: unknown): Response {
  if (error instanceof IntelligenceProviderError) {
    if (error.code === 'RATE_LIMIT') return failure(429, 'ANALYSIS_RATE_LIMITED');
    if (error.code === 'UNAVAILABLE') return failure(503, 'ANALYSIS_UNAVAILABLE');
    if (error.code === 'AUTHENTICATION') return failure(503, 'ANALYSIS_AUTHENTICATION');
    if (error.code === 'CONFIGURATION') return failure(503, 'ANALYSIS_CONFIGURATION');
    if (error.code === 'INVALID_RESPONSE') return failure(502, 'INVALID_ANALYSIS_RESPONSE');
    return failure(400, 'INVALID_REQUEST');
  }
  if (error instanceof ProductEvidenceError) {
    if (error.code === 'INVALID_INPUT') return failure(400, 'INVALID_PRODUCT_INPUT');
    if (error.code === 'MISSING_MEDIA') return failure(400, 'MISSING_MEDIA');
    if (error.code === 'INVALID_MEDIA') return failure(400, 'INVALID_MEDIA');
    if (error.code === 'INVALID_MODEL_OUTPUT') return failure(502, 'INVALID_ANALYSIS_RESPONSE');
    return failure(502, 'ANALYSIS_PROVIDER_FAILURE');
  }
  return failure(502, 'ANALYSIS_PROVIDER_FAILURE');
}

function failure(status: number, code: HttpFailureCode): Response {
  return Response.json({ ok: false, error: { code } }, { status });
}
