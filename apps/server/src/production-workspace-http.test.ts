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

test('production build HTTP preserves only the bounded R2_A Product Truth diagnostic', async()=>{
  const error=new ProductionWorkspaceError('PRODUCTION_BUILD_FAILED','R2_A_PRODUCT_TRUTH',{kind:'R2_A_PRODUCT_TRUTH',productTruthErrorCode:'INVALID_MODEL_OUTPUT',providerFailureCode:'INVALID_RESPONSE',issueCategories:['DECISION_SHAPE']});
  Object.assign(error,{rawModelOutput:'data:image/png;base64,secret',prompt:'private prompt',providerMessage:'credential',stack:'private stack',path:'/private/model.json'});
  const response=await buildHandler(error)(buildRequest());
  const value=await response.json();
  assert.deepEqual(value,{ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'R2_A_PRODUCT_TRUTH',diagnostic:{kind:'R2_A_PRODUCT_TRUTH',productTruthErrorCode:'INVALID_MODEL_OUTPUT',providerFailureCode:'INVALID_RESPONSE',issueCategories:['DECISION_SHAPE']}}});
  assert.doesNotMatch(JSON.stringify(value),/base64|secret|prompt|credential|stack|\/private/i);
});

const layerIds={foundation:`pf_${'1'.repeat(64)}`,blueprint:`sb_${'2'.repeat(64)}`,script:`fs_${'3'.repeat(64)}`,ready:`pr_${'4'.repeat(64)}`,snapshot:`ps_${'5'.repeat(64)}`};
const creative={audience:'AUTO_PRODUCT_FIT',shootingContext:'AUTO_PRODUCT_FIT',reviewerPersona:'reviewer',tone:'AUTO_ROLE_APPROPRIATE_V1',voiceStyle:'review',voiceGender:'FEMALE',voiceRegion:'SOUTH'};
const skeletons=[1,2,3,4].map((index)=>({sceneId:`scene-${index}`,index,role:['HOOK','FEATURE','PROOF','CTA'][index-1],primaryAction:['PICK_UP','HOLD','ROTATE_SLOW','HOLD'][index-1],startSummary:'start',endSummary:'end',referenceAssetIds:['reference-1']}));
function layeredHandler(overrides:Partial<ProductionWorkspaceService>={}){const workspace={async createFoundation(){return{foundationId:layerIds.foundation,status:'PASS'};},async createBlueprint(){return{foundationId:layerIds.foundation,blueprintId:layerIds.blueprint,status:'PASS',scenes:skeletons};},async finalizeScript(){return{blueprintId:layerIds.blueprint,scriptId:layerIds.script,status:'PASS',scenes:skeletons.map(scene=>({...scene,keyPoints:['one','two'],dialogue:'dialogue',voiceLabel:'Female'}))};},async compileProduction(){return{readyId:layerIds.ready,snapshotId:layerIds.snapshot,status:'READY_FOR_FLOW',scenes:[]};},...overrides} as unknown as ProductionWorkspaceService;return createProductionWorkspaceHttpHandler({runtime:new RuntimeConfiguration(),workspace});}
function foundationRequest():Request{const form=new FormData();form.set('projectId','http-project');form.set('product',JSON.stringify({schemaVersion:'1.0.0',productId:'http-product',name:'Mochi',details:'Reference',category:'snack',assets:[{schemaVersion:'1.0.0',assetId:'reference-1',role:'PRODUCT_REFERENCE',source:'UPLOAD',mimeType:'image/jpeg'}]}));form.set('analysisReceiptId','par_test_receipt_0123456789');form.set('asset:reference-1',new Blob(['image'],{type:'image/jpeg'}),'reference.jpg');return new Request('http://local/api/production/foundation',{method:'POST',body:form});}

test('four layered HTTP endpoints expose only opaque IDs and bounded safe views',async()=>{const handler=layeredHandler();const l1=await(await handler(foundationRequest())).json();assert.deepEqual(l1,{ok:true,foundationId:layerIds.foundation,status:'PASS'});const l2=await(await handler(new Request('http://local/api/production/blueprint',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({foundationId:layerIds.foundation,creativeDirection:creative})}))).json();assert.deepEqual(l2,{ok:true,foundationId:layerIds.foundation,blueprintId:layerIds.blueprint,status:'PASS',scenes:skeletons});const l3=await(await handler(new Request('http://local/api/production/script',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({blueprintId:layerIds.blueprint})}))).json();assert.equal(l3.scriptId,layerIds.script);assert.equal(l3.scenes.length,4);const l4=await(await handler(new Request('http://local/api/production/compile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({scriptId:layerIds.script})}))).json();assert.deepEqual(l4,{ok:true,readyId:layerIds.ready,snapshotId:layerIds.snapshot,status:'READY_FOR_FLOW',scenes:[]});assert.doesNotMatch(JSON.stringify([l1,l2,l3,l4]),/dataBase64|rawResponse|providerMetadata|credential|flowReferenceId/i);});

test('layer HTTP inputs reject extra or malformed fields before workspace work',async()=>{let calls=0;const handler=layeredHandler({async createBlueprint(){calls+=1;throw new Error('must not run');}} as never);const response=await handler(new Request('http://local/api/production/blueprint',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({foundationId:layerIds.foundation,creativeDirection:creative,rawPrompt:'private'})}));assert.equal(response.status,400);assert.deepEqual(await response.json(),{ok:false,error:{code:'INVALID_SETUP'}});assert.equal(calls,0);});

test('L1/L2, L3, and L4 HTTP errors transport only their exact bounded diagnostics',async()=>{for(const [method,path,error,expected] of [
  ['foundation','/api/production/foundation',new ProductionWorkspaceError('PRODUCTION_LAYER_FAILED',{layer:'L1',stage:'R2_A_PRODUCT_TRUTH',diagnostic:{kind:'R2_A_PRODUCT_TRUTH',productTruthErrorCode:'PROVIDER_FAILURE',providerFailureCode:'INVALID_RESPONSE'}}),{ok:false,error:{code:'PRODUCTION_LAYER_FAILED',layer:'L1',stage:'R2_A_PRODUCT_TRUTH',diagnostic:{kind:'R2_A_PRODUCT_TRUTH',productTruthErrorCode:'PROVIDER_FAILURE',providerFailureCode:'INVALID_RESPONSE'}}}],
  ['script','/api/production/script',new ProductionWorkspaceError('PRODUCTION_LAYER_FAILED',{layer:'L3',diagnostic:{layer:'L3',phase:'ENGINE',engineStage:'R4_1_KEY_POINTS'}}),{ok:false,error:{code:'PRODUCTION_LAYER_FAILED',layer:'L3',diagnostic:{layer:'L3',phase:'ENGINE',engineStage:'R4_1_KEY_POINTS'}}}],
  ['compile','/api/production/compile',new ProductionWorkspaceError('PRODUCTION_LAYER_FAILED',{layer:'L4',diagnostic:{layer:'L4',phase:'COMPILE',compileStage:'FLOW_REQUEST'}}),{ok:false,error:{code:'PRODUCTION_LAYER_FAILED',layer:'L4',diagnostic:{layer:'L4',phase:'COMPILE',compileStage:'FLOW_REQUEST'}}}]
] as const){Object.assign(error,{rawMessage:'secret Base64',stack:'private',path:'/private',prompt:'hidden'});const override=method==='foundation'?{async createFoundation(){throw error;}}:method==='script'?{async finalizeScript(){throw error;}}:{async compileProduction(){throw error;}};const handler=layeredHandler(override as never);const request=method==='foundation'?foundationRequest():new Request(`http://local${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(method==='script'?{blueprintId:layerIds.blueprint}:{scriptId:layerIds.script})});const value=await(await handler(request)).json();assert.deepEqual(value,expected);assert.doesNotMatch(JSON.stringify(value),/secret|base64|stack|\/private|prompt/i);}});

test('malformed layer diagnostics collapse to a generic safe layer failure',async()=>{const error=new ProductionWorkspaceError('PRODUCTION_LAYER_FAILED',{layer:'L4',diagnostic:{layer:'L4',phase:'COMPILE',compileStage:'PRIVATE'} as never});const handler=layeredHandler({async compileProduction(){throw error;}} as never);const response=await handler(new Request('http://local/api/production/compile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({scriptId:layerIds.script})}));assert.deepEqual(await response.json(),{ok:false,error:{code:'PRODUCTION_LAYER_FAILED',layer:'L4'}});});
