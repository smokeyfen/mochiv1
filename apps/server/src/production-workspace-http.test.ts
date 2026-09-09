import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductionWorkspaceHttpHandler } from './production-workspace-http.ts';
import { ProductionWorkspaceError, type ProductionWorkspaceService } from './production-workspace.ts';
import { RuntimeConfiguration } from './runtime-configuration.ts';

function handlerFor(output:{readonly mimeType:'video/mp4'|'text/plain; charset=utf-8';readonly bytes:Uint8Array}) {
  const workspace={deliveryOutput(snapshotId:string,filename:string){assert.equal(snapshotId,'snapshot-1'); assert.ok(['scene-01.mp4','key-points.txt'].includes(filename)); return output;}} as unknown as ProductionWorkspaceService;
  return createProductionWorkspaceHttpHandler({runtime:new RuntimeConfiguration(),workspace});
}

test('delivery HTTP returns only the exact MP4 byte view, without backing-buffer slack', async()=>{
  const backing=new Uint8Array([99,0x00,0x01,0x02,0x03,88]); const response=await handlerFor({mimeType:'video/mp4',bytes:backing.subarray(1,5)})(new Request('http://local/api/production/delivery/scene-01.mp4?snapshotId=snapshot-1'));
  assert.equal(response.status,200); assert.equal(response.headers.get('content-type'),'video/mp4'); assert.equal(response.headers.get('content-disposition'),'attachment; filename="scene-01.mp4"'); assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([0,1,2,3]));
});

test('delivery HTTP returns exact UTF-8 key-points bytes and deterministic attachment name', async()=>{
  const text=new TextEncoder().encode('Tên sản phẩm\nđiểm hai\n'); const backing=new Uint8Array(text.length+2); backing.set(text,1); const response=await handlerFor({mimeType:'text/plain; charset=utf-8',bytes:backing.subarray(1,1+text.length)})(new Request('http://local/api/production/delivery/key-points.txt?snapshotId=snapshot-1'));
  assert.equal(response.status,200); assert.equal(response.headers.get('content-type'),'text/plain; charset=utf-8'); assert.equal(response.headers.get('content-disposition'),'attachment; filename="key-points.txt"'); assert.deepEqual(new Uint8Array(await response.arrayBuffer()),text);
});

function buildRequest():Request { const form=new FormData(); form.set('project',JSON.stringify({schemaVersion:'1.0.0',projectId:'http-project',product:{schemaVersion:'1.0.0',productId:'http-product',name:'Mochi',details:'Reference',category:'snack',assets:[{schemaVersion:'1.0.0',assetId:'reference-1',role:'PRODUCT_REFERENCE',source:'UPLOAD',mimeType:'image/jpeg'}]},creativeDirection:{audience:'AUTO_PRODUCT_FIT',shootingContext:'AUTO_PRODUCT_FIT',reviewerPersona:'reviewer',tone:'AUTO_ROLE_APPROPRIATE_V1',voiceStyle:'review',voiceGender:'FEMALE',voiceRegion:'SOUTH'}})); form.set('analysisReceiptId','par_test_receipt_0123456789'); form.set('asset:reference-1',new Blob(['image'],{type:'image/jpeg'}),'reference.jpg'); return new Request('http://local/api/production/build',{method:'POST',body:form}); }
function buildHandler(error:unknown) { const workspace={async build(){throw error;}} as unknown as ProductionWorkspaceService; return createProductionWorkspaceHttpHandler({runtime:new RuntimeConfiguration(),workspace}); }

test('production build HTTP exposes only the canonical runtime stage and never its trace', async()=>{
  const error=new ProductionWorkspaceError('PRODUCTION_BUILD_FAILED','R6_BOUNDED_REPLAN'); Object.assign(error,{trace:[{stage:'R6_BOUNDED_REPLAN',status:'COMPLETED'}],providerException:'raw provider exception',apiKey:'secret'});
  const response=await buildHandler(error)(buildRequest());
  assert.equal(response.status,400); const value=await response.json(); assert.deepEqual(value,{ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'R6_BOUNDED_REPLAN'}}); assert.equal(JSON.stringify(value).includes('raw provider exception'),false); assert.equal(JSON.stringify(value).includes('secret'),false);
});

test('production build HTTP omits noncanonical stages and retains the generic fallback', async()=>{
  const unsafe=new ProductionWorkspaceError('PRODUCTION_BUILD_FAILED','PROVIDER_EXCEPTION' as never); const unsafeResponse=await buildHandler(unsafe)(buildRequest()); assert.deepEqual(await unsafeResponse.json(),{ok:false,error:{code:'PRODUCTION_BUILD_FAILED'}});
  const fallbackResponse=await buildHandler(new Error('raw provider exception'))(buildRequest()); assert.deepEqual(await fallbackResponse.json(),{ok:false,error:{code:'PRODUCTION_BUILD_FAILED'}});
});

test('production build HTTP preserves only the bounded R6 diagnostic', async()=>{
  const error=new ProductionWorkspaceError('PRODUCTION_BUILD_FAILED','R6_BOUNDED_REPLAN',{kind:'R6_SCENE_RISK',sceneIndex:3,primaryAction:'ROTATE_SLOW',riskStatus:'CONDITIONAL',productionEligibility:'BLOCKED',riskReasons:['action_risky'],replanFailureReason:'risk_unresolved',attempt:2});
  Object.assign(error,{message:'raw provider secret',trace:'stack',path:'/private'});
  const response=await buildHandler(error)(buildRequest());
  assert.deepEqual(await response.json(),{ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'R6_BOUNDED_REPLAN',diagnostic:{kind:'R6_SCENE_RISK',sceneIndex:3,primaryAction:'ROTATE_SLOW',riskStatus:'CONDITIONAL',productionEligibility:'BLOCKED',riskReasons:['action_risky'],replanFailureReason:'risk_unresolved',attempt:2}}});
});
