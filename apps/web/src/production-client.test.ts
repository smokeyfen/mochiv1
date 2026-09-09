import { expect, it, vi } from 'vitest';
import { buildProduction, compileProduction, createFinalizedScript, createProductFoundation, createSceneBlueprint, ProductionClientError } from './production-client';

const project={product:{assets:[{assetId:'reference-1'}]}} as never;
const files=new Map([['reference-1',new File(['image'],'reference.jpg',{type:'image/jpeg'})]]);

it('preserves only a canonical safe production build stage', async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'R6_BOUNDED_REPLAN',trace:'raw provider exception'}}),{status:400,headers:{'content-type':'application/json'}})));
  await expect(buildProduction(project,files,'receipt-test')).rejects.toMatchObject({code:'PRODUCTION_BUILD_FAILED',stage:'R6_BOUNDED_REPLAN'} satisfies Partial<ProductionClientError>);
});

it('keeps generic production build errors generic when no safe canonical stage exists', async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'PROVIDER_EXCEPTION',trace:'raw provider exception'}}),{status:400,headers:{'content-type':'application/json'}})));
  await expect(buildProduction(project,files,'receipt-test')).rejects.toMatchObject({code:'PRODUCTION_BUILD_FAILED',stage:undefined} satisfies Partial<ProductionClientError>);
});

it('decodes only the bounded production diagnostic', async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'R6_BOUNDED_REPLAN',diagnostic:{kind:'R6_SCENE_RISK',sceneIndex:3,primaryAction:'ROTATE_SLOW',riskStatus:'CONDITIONAL',productionEligibility:'BLOCKED',riskReasons:['action_risky'],replanFailureReason:'risk_unresolved',attempt:2},trace:'raw secret'}}),{status:400,headers:{'content-type':'application/json'}})));
  await expect(buildProduction(project,files,'receipt-test')).rejects.toMatchObject({diagnostic:{kind:'R6_SCENE_RISK',sceneIndex:3,primaryAction:'ROTATE_SLOW',riskReasons:['action_risky'],attempt:2}});
});

it('rejects a diagnostic primary action outside the exact V1 ActionId allowlist', async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'R6_BOUNDED_REPLAN',diagnostic:{kind:'R6_SCENE_RISK',sceneIndex:3,primaryAction:'NOT_A_V1_ACTION',riskStatus:'CONDITIONAL',productionEligibility:'BLOCKED',riskReasons:['action_risky']}}}),{status:400,headers:{'content-type':'application/json'}})));
  await expect(buildProduction(project,files,'receipt-test')).rejects.toMatchObject({code:'PRODUCTION_BUILD_FAILED',stage:'R6_BOUNDED_REPLAN',diagnostic:undefined} satisfies Partial<ProductionClientError>);
});

it('decodes only bounded R2_A Product Truth diagnostics', async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'R2_A_PRODUCT_TRUTH',diagnostic:{kind:'R2_A_PRODUCT_TRUTH',productTruthErrorCode:'PROVIDER_FAILURE',providerFailureCode:'INVALID_RESPONSE'},rawModelOutput:'secret Base64',prompt:'/private/prompt'}}),{status:400,headers:{'content-type':'application/json'}})));
  await expect(buildProduction(project,files,'receipt-test')).rejects.toMatchObject({
    code:'PRODUCTION_BUILD_FAILED',stage:'R2_A_PRODUCT_TRUTH',diagnostic:{kind:'R2_A_PRODUCT_TRUTH',productTruthErrorCode:'PROVIDER_FAILURE',providerFailureCode:'INVALID_RESPONSE'}
  } satisfies Partial<ProductionClientError>);
});

it('rejects unbounded or unknown Product Truth diagnostics', async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'R2_A_PRODUCT_TRUTH',diagnostic:{kind:'R2_A_PRODUCT_TRUTH',productTruthErrorCode:'INVALID_MODEL_OUTPUT',issueCategories:['unknown_exclusion:private-fact-id']}}}),{status:400,headers:{'content-type':'application/json'}})));
  await expect(buildProduction(project,files,'receipt-test')).rejects.toMatchObject({code:'PRODUCTION_BUILD_FAILED',stage:'R2_A_PRODUCT_TRUTH',diagnostic:undefined} satisfies Partial<ProductionClientError>);
});

const layerIds={foundation:`pf_${'1'.repeat(64)}`,blueprint:`sb_${'2'.repeat(64)}`,script:`fs_${'3'.repeat(64)}`,ready:`pr_${'4'.repeat(64)}`,snapshot:`ps_${'5'.repeat(64)}`};
const productInput={schemaVersion:'1.0.0',productId:'product-1',name:'Mochi',details:'details',category:'snack',assets:[{schemaVersion:'1.0.0',assetId:'reference-1',role:'PRODUCT_REFERENCE',source:'UPLOAD',mimeType:'image/jpeg'}]} as never;
const creative={audience:'AUTO_PRODUCT_FIT',shootingContext:'AUTO_PRODUCT_FIT',reviewerPersona:'reviewer',tone:'AUTO_ROLE_APPROPRIATE_V1',voiceStyle:'review',voiceGender:'FEMALE',voiceRegion:'SOUTH'} as never;
const roles=['HOOK','FEATURE','PROOF','CTA'] as const,actions=['PICK_UP','HOLD','ROTATE_SLOW','HOLD'] as const;
const skeletons=()=>roles.map((role,index)=>({sceneId:`scene-${index+1}`,index:index+1,role,primaryAction:actions[index],startSummary:'start',endSummary:'end',referenceAssetIds:[]}));
const scripts=()=>skeletons().map((scene,index)=>({...scene,keyPoints:[`p${index}a`,`p${index}b`],dialogue:`dialogue ${index}`,voiceLabel:'Female — Leda / Leda Custom'}));
const readyScenes=()=>scripts().map(scene=>({...scene,visualRhythm:'steady',prompt:'safe prompt',promptCharacterCount:11,promptBudgetStatus:'TARGET',lifecycleStatus:'READY_FOR_FLOW',candidateAssetId:`candidate_${scene.index}`,attempt:1}));

it('strictly decodes L1 Product Foundation and sends only factual binding fields',async()=>{const fetchMock=vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:true,foundationId:layerIds.foundation,status:'PASS'})));vi.stubGlobal('fetch',fetchMock);await expect(createProductFoundation('project-1',productInput,new Map([['reference-1',new File(['image'],'r.jpg',{type:'image/jpeg'})]]),'par_receipt')).resolves.toEqual({foundationId:layerIds.foundation,status:'PASS'});const form=fetchMock.mock.calls[0]?.[1]?.body as FormData;expect([...form.keys()]).toEqual(['projectId','product','analysisReceiptId','asset:reference-1']);expect(JSON.parse(String(form.get('product')))).not.toHaveProperty('creativeDirection');});

it('strictly decodes all four L2 blueprint scenes and rejects unknown response fields',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ok:true,foundationId:layerIds.foundation,blueprintId:layerIds.blueprint,status:'PASS',scenes:skeletons()}))).mockResolvedValueOnce(new Response(JSON.stringify({ok:true,foundationId:layerIds.foundation,blueprintId:layerIds.blueprint,status:'PASS',scenes:skeletons(),rawPrompt:'secret'}))));await expect(createSceneBlueprint(layerIds.foundation,creative)).resolves.toMatchObject({blueprintId:layerIds.blueprint,scenes:expect.arrayContaining([expect.objectContaining({primaryAction:'ROTATE_SLOW'})])});await expect(createSceneBlueprint(layerIds.foundation,creative)).rejects.toMatchObject({code:'INVALID_RESPONSE'});});

it('strictly decodes L3 finalized content and rejects malformed scene content',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ok:true,blueprintId:layerIds.blueprint,scriptId:layerIds.script,status:'PASS',scenes:scripts()}))).mockResolvedValueOnce(new Response(JSON.stringify({ok:true,blueprintId:layerIds.blueprint,scriptId:layerIds.script,status:'PASS',scenes:scripts().map((scene,index)=>index?scene:{...scene,keyPoints:['only-one']})}))));await expect(createFinalizedScript(layerIds.blueprint)).resolves.toMatchObject({scriptId:layerIds.script,scenes:expect.arrayContaining([expect.objectContaining({dialogue:'dialogue 0'})])});await expect(createFinalizedScript(layerIds.blueprint)).rejects.toMatchObject({code:'INVALID_RESPONSE'});});

it('strictly decodes L4 safe scene views and rejects an unknown opaque ID',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ok:true,readyId:layerIds.ready,snapshotId:layerIds.snapshot,status:'READY_FOR_FLOW',scenes:readyScenes()}))).mockResolvedValueOnce(new Response(JSON.stringify({ok:true,readyId:'ready-private',snapshotId:layerIds.snapshot,status:'READY_FOR_FLOW',scenes:readyScenes()}))));await expect(compileProduction(layerIds.script)).resolves.toMatchObject({readyId:layerIds.ready,snapshotId:layerIds.snapshot});await expect(compileProduction(layerIds.script)).rejects.toMatchObject({code:'INVALID_RESPONSE'});});

it('keeps bounded L3/L4 diagnostics and makes malformed diagnostics generic',async()=>{const response=(error:unknown)=>new Response(JSON.stringify({ok:false,error}),{status:400});vi.stubGlobal('fetch',vi.fn()
  .mockResolvedValueOnce(response({code:'PRODUCTION_LAYER_FAILED',layer:'L3',diagnostic:{layer:'L3',phase:'ENGINE',engineStage:'R4_1_KEY_POINTS'}}))
  .mockResolvedValueOnce(response({code:'PRODUCTION_LAYER_FAILED',layer:'L4',diagnostic:{layer:'L4',phase:'COMPILE',compileStage:'FLOW_REQUEST'}}))
  .mockResolvedValueOnce(response({code:'PRODUCTION_LAYER_FAILED',layer:'L4',diagnostic:{layer:'L4',phase:'COMPILE',compileStage:'PRIVATE',message:'raw secret'}})));
  await expect(createFinalizedScript(layerIds.blueprint)).rejects.toMatchObject({layer:'L3',diagnostic:{engineStage:'R4_1_KEY_POINTS'}});await expect(compileProduction(layerIds.script)).rejects.toMatchObject({layer:'L4',diagnostic:{compileStage:'FLOW_REQUEST'}});await expect(compileProduction(layerIds.script)).rejects.toMatchObject({code:'PRODUCTION_LAYER_FAILED',layer:'L4',diagnostic:undefined});});
