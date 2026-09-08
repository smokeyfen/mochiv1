import { createHash, randomBytes } from 'node:crypto';
import { validateProductEvidence, type ProductEvidence, type ProductInput } from '@mochi/contracts';
import type { IntelligenceMediaInput } from '@mochi/providers';

export const PRODUCT_ANALYSIS_RECEIPT_V1 = 'PRODUCT_ANALYSIS_RECEIPT_V1' as const;

export interface ProductAnalysisReceipt { readonly version: typeof PRODUCT_ANALYSIS_RECEIPT_V1; readonly analysisReceiptId: string; readonly evidence: ProductEvidence; }
export interface ReceiptReferenceMedia { readonly assetId: string; readonly mimeType: string; readonly dataBase64: string; }
interface StoredReceipt extends ProductAnalysisReceipt { readonly productFingerprint: string; readonly mediaFingerprint: string; }
export interface ProductAnalysisReceiptStore {
  commit(input: { readonly product: ProductInput; readonly media: readonly IntelligenceMediaInput[]; readonly evidence: ProductEvidence }): ProductAnalysisReceipt;
  resolve(analysisReceiptId: string, product: ProductInput, media: readonly ReceiptReferenceMedia[]): ProductAnalysisReceipt | undefined;
}
function canonical(value: unknown): string { if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; if (value && typeof value === 'object') { const record=value as Record<string,unknown>; return `{${Object.keys(record).sort().map(key=>`${JSON.stringify(key)}:${canonical(record[key])}`).join(',')}}`; } return JSON.stringify(value); }
function sha256(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }
function mediaBinding(media: readonly ReceiptReferenceMedia[]): string { return sha256(canonical(media.map(item=>({assetId:item.assetId,mimeType:item.mimeType,bytesSha256:sha256(Buffer.from(item.dataBase64,'base64'))})))); }

/** Process-local FIFO authority: restart invalidates receipts; bounded storage excludes provider data and credentials. */
export function createProductAnalysisReceiptStore(maxEntries = 32): ProductAnalysisReceiptStore {
  const entries=new Map<string,StoredReceipt>(); const capacity=Number.isInteger(maxEntries)&&maxEntries>0?maxEntries:32;
  return {
    commit({product,media,evidence}) { if(validateProductEvidence(evidence,product).length>0) throw new Error('INVALID_PRODUCT_ANALYSIS_RECEIPT'); const analysisReceiptId=`par_${randomBytes(32).toString('base64url')}`; const receipt:StoredReceipt={version:PRODUCT_ANALYSIS_RECEIPT_V1,analysisReceiptId,evidence:structuredClone(evidence),productFingerprint:sha256(canonical(product)),mediaFingerprint:mediaBinding(media)}; entries.set(analysisReceiptId,receipt); while(entries.size>capacity)entries.delete(entries.keys().next().value!); return {version:receipt.version,analysisReceiptId:receipt.analysisReceiptId,evidence:structuredClone(receipt.evidence)}; },
    resolve(analysisReceiptId,product,media) { const receipt=entries.get(analysisReceiptId); if(!receipt||receipt.productFingerprint!==sha256(canonical(product))||receipt.mediaFingerprint!==mediaBinding(media)) return undefined; return {version:receipt.version,analysisReceiptId:receipt.analysisReceiptId,evidence:structuredClone(receipt.evidence)}; }
  };
}
