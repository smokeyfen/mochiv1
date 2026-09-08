import assert from 'node:assert/strict';
import test from 'node:test';
import { SCHEMA_VERSION, type ProductEvidence, type ProductInput } from '@mochi/contracts';
import { createProductAnalysisReceiptStore, PRODUCT_ANALYSIS_RECEIPT_V1 } from './product-analysis-receipt.ts';

const product:ProductInput={schemaVersion:SCHEMA_VERSION,productId:'receipt-product',name:'Mochi',details:'Round snack',category:'snack',assets:[{schemaVersion:SCHEMA_VERSION,assetId:'asset-1',role:'PRODUCT_REFERENCE',source:'UPLOAD',mimeType:'image/jpeg'}]};
const media=[{assetId:'asset-1',mimeType:'image/jpeg',dataBase64:'AQ=='}] as const;
const evidence:ProductEvidence={schemaVersion:SCHEMA_VERSION,productId:product.productId,canonicalAssetIds:['asset-1'],identityDescription:'Mochi',geometryNotes:['Round'],colorNotes:['White'],packagingNotes:['Package'],labelNotes:['Text'],claims:[],prohibitedInferences:[],uncertainties:[],contradictions:[]};
test('PRODUCT_ANALYSIS_RECEIPT_V1 binds exact factual input and reference bytes but no creative state',()=>{
  const store=createProductAnalysisReceiptStore(); const receipt=store.commit({product,media,evidence});
  assert.equal(receipt.version,PRODUCT_ANALYSIS_RECEIPT_V1); assert.match(receipt.analysisReceiptId,/^par_[A-Za-z0-9_-]{40,}$/); assert.ok(store.resolve(receipt.analysisReceiptId,product,media));
  for(const changed of [{...product,name:'Changed'},{...product,details:'Changed'},{...product,category:'Changed'}]) assert.equal(store.resolve(receipt.analysisReceiptId,changed,media),undefined);
  assert.equal(store.resolve(receipt.analysisReceiptId,product,[{...media[0],dataBase64:'Ag=='}]),undefined);
  assert.equal(store.resolve('unknown',product,media),undefined);
  assert.equal(includesAny(JSON.stringify(receipt),['dataBase64','gemini','provider']),false);
});
test('receipt stores are bounded and process-local',()=>{const store=createProductAnalysisReceiptStore(1);const first=store.commit({product,media,evidence});const second=store.commit({product:{...product,productId:'two'},media,evidence:{...evidence,productId:'two'}});assert.equal(store.resolve(first.analysisReceiptId,product,media),undefined);assert.ok(store.resolve(second.analysisReceiptId,{...product,productId:'two'},media));assert.equal(createProductAnalysisReceiptStore().resolve(second.analysisReceiptId,{...product,productId:'two'},media),undefined);});
function includesAny(value:string,values:readonly string[]):boolean{return values.some(item=>value.toLowerCase().includes(item));}
