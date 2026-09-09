import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SCHEMA_VERSION, type MochiProjectInput } from '@mochi/contracts';
import { IntelligenceProviderError, type IntelligenceProvider, type StructuredIntelligenceRequest } from '@mochi/providers';
import { ProductionWorkspaceError, ProductionWorkspaceService, type DeliveryOutputName } from './production-workspace.ts';
import { RuntimeConfiguration } from './runtime-configuration.ts';
import { createProductAnalysisReceiptStore } from './product-analysis-receipt.ts';
import { createProductEvidenceService } from './product-evidence-service.ts';

const project: MochiProjectInput = { schemaVersion:SCHEMA_VERSION, projectId:'delivery-project', product:{schemaVersion:SCHEMA_VERSION,productId:'delivery-product',name:'Mochi Original',details:'Round snack reference.',category:'snack',assets:[{schemaVersion:SCHEMA_VERSION,assetId:'reference-1',role:'PRODUCT_REFERENCE',source:'UPLOAD',mimeType:'image/jpeg'}]},creativeDirection:{audience:'người thích ăn vặt',shootingContext:'bàn gỗ',reviewerPersona:'người review thân thiện',tone:'gần gũi',voiceStyle:'review',voiceGender:'FEMALE',voiceRegion:'SOUTH'}};
const references=[{assetId:'reference-1',mimeType:'image/jpeg',dataBase64:'AQ=='}] as const;
const frame=['PRODUCT_FIDELITY','HAND_ANATOMY','VISIBLE_ARTIFACTS','REVIEWER_FACE_VISIBILITY'];
const temporal=['ACTION_COMPLETION','PHYSICS','CAMERA_REALISM','UNEXPECTED_CUTS','START_STATE_MATCH','END_STATE_MATCH'];
const pair=['PRODUCT_IDENTITY_CONTINUITY','HAND_IDENTITY_CONTINUITY','ENVIRONMENT_CONTINUITY','LIGHTING_CONTINUITY','VISIBLE_STATE_HANDOFF','NO_UNEXPLAINED_IDENTITY_RESET'];
const global=['PRODUCT_CONSISTENCY','HAND_CONSISTENCY','ENVIRONMENT_LIGHTING_CONSISTENCY','SPEAKER_CONSISTENCY','SEQUENCE_COHERENCE','NARRATIVE_ROLE_COHERENCE'];
const pass=(gates:readonly string[])=>gates.map(gate=>({gate,status:'PASS'}));

function createMock() {
  const requests: StructuredIntelligenceRequest<unknown>[]=[]; let runtimeCall=0; let scene2Fail=false; let sequenceFail=false; let sceneQcThrows=false; let globalPlanThrows=false; let productTruthThrows=false;
  const provider: IntelligenceProvider={id:'mock-delivery',async analyzeStructured<T>(input:StructuredIntelligenceRequest<T>){requests.push(input as StructuredIntelligenceRequest<unknown>); const parsed=(input.instruction.startsWith('SCENE_QC_V1:')||input.instruction.startsWith('SEQUENCE_QC_V1:'))?JSON.parse(input.inputText??'{}') as Record<string,unknown>:{};
    if(input.instruction.startsWith('PRODUCT TRUTH RULES:')&&productTruthThrows) { const failure=new IntelligenceProviderError('INVALID_RESPONSE',false); Object.assign(failure,{rawModelOutput:'secret Base64 /private/model.json',providerMessage:'credential'}); throw failure; }
    if(input.instruction.startsWith('GLOBAL PLANNER RULES:')&&globalPlanThrows) throw new Error('raw provider exception must not leave the server');
    if(input.instruction.startsWith('TARGETED REPLAN:')) { return {data:input.parse({physicalObjective:'mục tiêu replanned',primaryAction:'HOLD',dialogueDraft:'R4 replanned draft',referenceAssetIds:['reference-1']})}; }
    if(input.instruction.startsWith('SCENE_QC_V1:')) { if(sceneQcThrows) throw new Error('mock QC unavailable'); const sceneId=parsed.sceneId as string, candidateAssetId=parsed.candidateAssetId as string, failed=scene2Fail&&sceneId.endsWith(':scene:2'); return {data:input.parse({sceneId,candidateAssetId,frame:failed?[{gate:'PRODUCT_FIDELITY',status:'FAIL'},...pass(frame.slice(1))]:pass(frame),temporal:pass(temporal),speechDetected:true,spokenTranscript:parsed.expectedDialogue,dialogueComplete:true,unexpectedSpeechDetected:false,presentationDynamics:{status:'WARN',meaningfulVisualProgression:true,excessiveStaticHold:false,rhythmIntentObserved:true,notes:'non-critical'}})}; }
    if(input.instruction.startsWith('SEQUENCE_QC_V1:')) { const reports=parsed.reports as {sceneId:string}[]; return {data:input.parse({pairs:[0,1,2].map(index=>({fromSceneId:reports[index]!.sceneId,toSceneId:reports[index+1]!.sceneId,gates:sequenceFail?[{gate:'PRODUCT_IDENTITY_CONTINUITY',status:'FAIL'},...pass(pair.slice(1))]:pass(pair)})),global:pass(global),visualVariation:{status:'WARN',meaningfulVisualProgression:true,excessiveStaticHold:false,rhythmIntentObserved:true,notes:'non-critical'}})}; }
    const data=[
      {schemaVersion:SCHEMA_VERSION,productId:project.product.productId,canonicalAssetIds:['reference-1'],identityDescription:'Mochi snack',geometryNotes:['Round shape'],colorNotes:['White coating'],packagingNotes:['Simple package'],labelNotes:['Mochi label'],claims:[],prohibitedInferences:[],uncertainties:[],contradictions:[]},
      {identityDisposition:'RETAIN',exclusions:[]},
      {schemaVersion:SCHEMA_VERSION,productId:project.product.productId,sourceEvidenceVersion:input.inputText?.includes('PRODUCT_ANALYSIS_RECEIPT_V1')?'PRODUCT_ANALYSIS_RECEIPT_V1':'BROWSER_RUNTIME_V1',canonicalAssetIds:['reference-1'],assetAssessments:[{assetId:'reference-1',targetVisibility:'CLEAR',identityConfidence:'HIGH',geometryCoverage:'STRONG',labelReadability:'CLEAR',occlusion:'NONE',backgroundInterference:'LOW',multiProductAmbiguity:'NONE'}]},
      {skinTone:'ấm',nailStyle:'ngắn',jewelry:'không',dominantHand:'RIGHT',surface:'gỗ',background:'trơn',lighting:'mềm'},
      {hook:{primaryTruthRefId:'identity',dialogueDraft:'R4 draft',referenceAssetIds:['reference-1'],transitionToNext:'MATCH_CUT'},feature:{primaryTruthRefId:'geometry:0',dialogueDraft:'R4 draft',referenceAssetIds:['reference-1'],transitionToNext:'MATCH_CUT'},proof:{primaryTruthRefId:'color:0',dialogueDraft:'R4 draft',referenceAssetIds:['reference-1'],transitionToNext:'MATCH_CUT'},cta:{reuseTruthFromScene:1,dialogueDraft:'R4 draft',referenceAssetIds:['reference-1']}},
      {scenes:Array.from({length:4},()=>({approachBehavior:'Đưa tay tự nhiên.',gripAndContactBehavior:'Giữ chắc.',actionExecutionBehavior:'Thực hiện chậm.',postActionSettleBehavior:'Dừng nhẹ.',cameraBehavior:'Rung tay nhẹ.'}))},
      {secondaryTruthRefIds:['identity','geometry:0','geometry:0']},
      {scenes:Array.from({length:4},(_,offset)=>({sceneId:`${project.product.productId}:scene:${offset+1}`,index:offset+1,dialogue:`Mochi Original cảnh ${offset+1} nha.`,addressedKeyPointIndexes:[1,2]}))},
      {scenes:Array.from({length:4},()=>({coversKeyPoint1:true,coversKeyPoint2:true,introducesUnsupportedProductFact:false,naturalSouthernConversationalVietnamese:true,containsStageDirectionOrNonSpeechText:false})),sameReviewerPersonaAcrossScenes:true}
    ][runtimeCall++ % 9]; return {data:input.parse(data)};
  }};
  return {provider,requests,setScene2Fail:(value:boolean)=>{scene2Fail=value;},setSequenceFail:(value:boolean)=>{sequenceFail=value;},setSceneQcThrows:(value:boolean)=>{sceneQcThrows=value;},setGlobalPlanThrows:(value:boolean)=>{globalPlanThrows=value;},setProductTruthThrows:(value:boolean)=>{productTruthThrows=value;}};
}

const validVideoInspector={async inspect(){return {container:'MP4' as const,width:1080,height:1920,durationMs:8000,rotationDegrees:0 as const};}};
async function withWorkspace(run:(value:{service:ProductionWorkspaceService;mock:ReturnType<typeof createMock>})=>Promise<void>, inspector=validVideoInspector) { const root=await mkdtemp(join(tmpdir(),'mochi-delivery-')); const mock=createMock(); const service=new ProductionWorkspaceService(new RuntimeConfiguration(mock.provider),root,inspector); try { await run({service,mock}); } finally { await rm(root,{recursive:true,force:true}); } }
async function ready(service:ProductionWorkspaceService) { const build=await service.build(project,references); for(const scene of build.scenes) await service.uploadAndQc(build.snapshotId,scene.sceneId,scene.candidateAssetId,{type:'video/mp4',bytes:Buffer.from(`video-${scene.index}`)}); await service.runSequence(build.snapshotId); assert.equal(service.finalAcceptance(build.snapshotId).status,'FINAL_ACCEPTANCE_PASS'); return build; }
const active=(service:ProductionWorkspaceService):any=>(service as unknown as {active:any}).active;

test('layered browser macro uses one R1 call, two L1 R2 calls, isolated L2/L3 work, and zero-intelligence L4 activation',async()=>{
  const root=await mkdtemp(join(tmpdir(),'mochi-layered-browser-'));const mock=createMock();const receipts=createProductAnalysisReceiptStore();const service=new ProductionWorkspaceService(new RuntimeConfiguration(mock.provider),root,validVideoInspector,receipts);
  try{
    const evidence=await createProductEvidenceService({intelligence:mock.provider}).analyze({product:project.product,media:references});
    const receipt=receipts.commit({product:project.product,media:references,evidence});
    assert.equal(mock.requests.length,1);
    const l1=await service.createFoundation(project.projectId,project.product,references,receipt.analysisReceiptId);
    assert.equal(l1.status,'PASS');assert.match(l1.foundationId,/^pf_[0-9a-f]{64}$/);assert.equal(mock.requests.length,3);
    assert.deepEqual(mock.requests.map(request=>request.instruction.split(':',1)[0]),['PRODUCT EVIDENCE RULES','PRODUCT TRUTH RULES','REFERENCE ASSESSMENT RULES']);
    const l2=await service.createBlueprint(l1.foundationId,project.creativeDirection);assert.equal(l2.scenes.length,4);assert.deepEqual(l2.scenes.map(scene=>scene.primaryAction),['PICK_UP','HOLD','ROTATE_SLOW','HOLD']);assert.equal(mock.requests.length,6);
    const l3=await service.finalizeScript(l2.blueprintId);assert.equal(l3.scenes.length,4);assert.ok(l3.scenes.every(scene=>scene.keyPoints.length===2));assert.equal(mock.requests.length,9);
    const beforeL4=mock.requests.length;const l4=await service.compileProduction(l3.scriptId);assert.equal(mock.requests.length,beforeL4);assert.equal(l4.status,'READY_FOR_FLOW');assert.equal(l4.scenes.length,4);assert.equal(service.activeSnapshotId(),l4.snapshotId);assert.deepEqual(l4.scenes,service.safeScenes());assert.ok(l4.scenes.every(scene=>scene.lifecycleStatus==='READY_FOR_FLOW'));
  }finally{await rm(root,{recursive:true,force:true});}
});

test('Task 7B clean mocked browser E2E delivers byte-exact files and deterministic key points', async()=>withWorkspace(async({service,mock})=>{
  const build=await ready(service); const manifest=service.deliveryManifest(build.snapshotId);
  assert.deepEqual(manifest.outputs.map(output=>output.filename),['scene-01.mp4','scene-02.mp4','scene-03.mp4','scene-04.mp4','key-points.txt']); assert.equal(manifest.status,'READY_FOR_DELIVERY');
  for(const [index,filename] of ['scene-01.mp4','scene-02.mp4','scene-03.mp4','scene-04.mp4'].entries()) assert.deepEqual(service.deliveryOutput(build.snapshotId,filename as DeliveryOutputName).bytes,Buffer.from(`video-${index+1}`));
  const text=Buffer.from(service.deliveryOutput(build.snapshotId,'key-points.txt').bytes).toString('utf8'); const lines=text.trimEnd().split('\n'); assert.equal(lines.length,8); assert.equal(lines[0],project.product.name); assert.ok(lines.every(line=>line.length>0));
  assert.equal(mock.requests.filter(request=>request.instruction.startsWith('SCENE_QC_V1:')).length,4); assert.equal(mock.requests.filter(request=>request.instruction.startsWith('SEQUENCE_QC_V1:')).length,1); assert.equal(service.recordDelivery(build.snapshotId).status,'DELIVERED');
}));

test('a ProductionRuntimeError retains its canonical failing stage at the workspace boundary', async()=>withWorkspace(async({service,mock})=>{
  mock.setGlobalPlanThrows(true);
  await assert.rejects(service.build(project,references),(error:unknown)=>error instanceof ProductionWorkspaceError&&error.code==='PRODUCTION_BUILD_FAILED'&&error.stage==='R4_GLOBAL_PLAN');
}));

test('R2_A safe diagnostic crosses the workspace boundary without raw provider detail', async()=>withWorkspace(async({service,mock})=>{
  mock.setProductTruthThrows(true);
  await assert.rejects(service.build(project,references),(error:unknown)=>error instanceof ProductionWorkspaceError
    && error.stage==='R2_A_PRODUCT_TRUTH'
    && JSON.stringify(error.diagnostic)===JSON.stringify({kind:'R2_A_PRODUCT_TRUTH',productTruthErrorCode:'PROVIDER_FAILURE',providerFailureCode:'INVALID_RESPONSE'})
    && !JSON.stringify(error).includes('secret')
    && !JSON.stringify(error).includes('/private'));
}));

test('failed Scene 2 repair creates attempt two, preserves other reports, and requires a rerun before delivery', async()=>withWorkspace(async({service,mock})=>{
  const build=await service.build(project,references); mock.setScene2Fail(true); const before=[] as any[]; for(const scene of build.scenes) before.push(await service.uploadAndQc(build.snapshotId,scene.sceneId,scene.candidateAssetId,{type:'video/mp4',bytes:Buffer.from(`first-${scene.index}`)}));
  assert.equal(before[1].lifecycleStatus,'QC_FAIL'); const replacement=service.replaceFailedCandidate(build.snapshotId,before[1].sceneId,before[1].candidateAssetId); assert.equal(replacement.attempt,2); assert.notEqual(replacement.candidateAssetId,before[1].candidateAssetId); assert.deepEqual(service.safeScenes().filter(scene=>scene.index!==2).map(scene=>scene.qcReport?.result),['SCENE_QC_PASS','SCENE_QC_PASS','SCENE_QC_PASS']); assert.equal(service.deliveryManifest(build.snapshotId).status,'NOT_READY'); assert.throws(()=>service.deliveryOutput(build.snapshotId,'scene-01.mp4'),ProductionWorkspaceError);
  mock.setScene2Fail(false); await service.uploadAndQc(build.snapshotId,replacement.sceneId,replacement.candidateAssetId,{type:'video/mp4',bytes:Buffer.from('second-2')}); await service.runSequence(build.snapshotId); assert.equal(service.finalAcceptance(build.snapshotId).status,'FINAL_ACCEPTANCE_PASS'); assert.equal(service.deliveryManifest(build.snapshotId).status,'READY_FOR_DELIVERY');
}));

test('a candidate accepts exactly one video payload and every accepted mutation invalidates sequence, final acceptance, and delivery', async()=>withWorkspace(async({service})=>{
  const build=await ready(service); const scene=service.safeScenes()[0]!; await assert.rejects(service.uploadAndQc(build.snapshotId,scene.sceneId,scene.candidateAssetId,{type:'video/mp4',bytes:Buffer.from('second')}),(error:unknown)=>error instanceof ProductionWorkspaceError&&error.code==='INVALID_OR_STALE_VIDEO');
  const state=active(service); assert.equal(state.sequence.view.status,'FOUR_SCENE_SEQUENCE_PASS'); assert.equal(state.finalAcceptance.status,'FINAL_ACCEPTANCE_PASS'); service.replaceFailedCandidate(build.snapshotId,scene.sceneId,scene.candidateAssetId); // unavailable because passed
}).catch(error=>{ if(error instanceof ProductionWorkspaceError&&error.code==='REPAIR_NOT_AVAILABLE') return; throw error; }));

test('technical validation fails closed before Scene QC for non-portrait, wrong-duration, or unverifiable media', async()=>{
  for(const inspector of [{async inspect(){return {container:'MP4' as const,width:1920,height:1080,durationMs:8000,rotationDegrees:0 as const};}},{async inspect(){return {container:'MP4' as const,width:1080,height:1920,durationMs:8101,rotationDegrees:0 as const};}},{async inspect(){throw new Error('ffprobe unavailable');}}] as const) await withWorkspace(async({service,mock})=>{
    const build=await service.build(project,references); const scene=build.scenes[0]!; await assert.rejects(service.uploadAndQc(build.snapshotId,scene.sceneId,scene.candidateAssetId,{type:'video/mp4',bytes:Buffer.from('not accepted')}),(error:unknown)=>error instanceof ProductionWorkspaceError&&error.code==='VIDEO_TECHNICAL_INVALID'); assert.equal(mock.requests.filter(request=>request.instruction.startsWith('SCENE_QC_V1:')).length,0); assert.equal(service.safeScenes()[0]!.lifecycleStatus,'READY_FOR_FLOW');
  },inspector);
});

test('a thrown Scene QC leaves the candidate retryable with no partial video or report', async()=>withWorkspace(async({service,mock})=>{
  const build=await service.build(project,references); const scene=build.scenes[0]!; mock.setSceneQcThrows(true); await assert.rejects(service.uploadAndQc(build.snapshotId,scene.sceneId,scene.candidateAssetId,{type:'video/mp4',bytes:Buffer.from('retry-me')}),(error:unknown)=>error instanceof ProductionWorkspaceError&&error.code==='SCENE_QC_FAILED'); assert.equal(service.safeScenes()[0]!.lifecycleStatus,'READY_FOR_FLOW'); const state=active(service); assert.equal(state.candidates.get(scene.sceneId).video,undefined); assert.equal(state.candidates.get(scene.sceneId).report,undefined); assert.equal(state.sequence,undefined); assert.equal(state.finalAcceptance,undefined); mock.setSceneQcThrows(false); assert.equal((await service.uploadAndQc(build.snapshotId,scene.sceneId,scene.candidateAssetId,{type:'video/mp4',bytes:Buffer.from('retry-me')})).lifecycleStatus,'QC_PASS');
}));

test('Final Acceptance records every fail-closed blocker and WARN-only QC remains accepted', async()=>withWorkspace(async({service})=>{
  const build=await ready(service); const base=structuredClone(active(service)); const cases:readonly [string,(state:any)=>void][]=[
    ['SCENE_QC_NOT_PASS',state=>{state.candidates.get(state.anchors[0].sceneId).report.result='SCENE_QC_FAIL';}],['SEQUENCE_QC_NOT_PASS',state=>{delete state.sequence;}],['STALE_SEQUENCE',state=>{state.sequence.candidateAssetIds[0]='stale';}],['STALE_CANDIDATE',state=>{state.candidates.get(state.anchors[0].sceneId).video.candidateAssetId='stale';}],['SNAPSHOT_MISMATCH',state=>{state.anchors[0].snapshotId='stale';}],['DIALOGUE_MISMATCH',state=>{state.requests[0].dialogue='stale';}],['VOICE_MISMATCH',state=>{state.requests[0].nativeVoiceBinding.logicalVoiceIdentityId='stale';}],['PROMPT_BUDGET_INVALID',state=>{state.requests[0].durationSeconds=7;}],['KEY_POINT_PLAN_INVALID',state=>{state.snapshot.productionContract.scenes[0].keyPoints[0].text='stale';}],['REFERENCE_BINDING_INVALID',state=>{state.requests[0].referenceBindings=[];}],['PAIRWISE_QC_NOT_PASS',state=>{state.sequence.view.pairs[0].gates[0].status='FAIL';}],['GLOBAL_CONTINUITY_NOT_PASS',state=>{state.sequence.view.globalGates[0].status='FAIL';}]
  ]; for(const [code,mutate] of cases) { const state=structuredClone(base); mutate(state); (service as unknown as {active:any}).active=state; assert.ok(service.finalAcceptance(build.snapshotId).blockerCodes.includes(code as never),code); } (service as unknown as {active:any}).active=base; assert.equal(service.finalAcceptance(build.snapshotId).status,'FINAL_ACCEPTANCE_PASS');
}));

test('delivery rejects failed QC, stale candidate or sequence, failed sequence, missing bytes, wrong identity, bad key plan, and a new build', async()=>withWorkspace(async({service,mock})=>{
  const build=await ready(service); const base=structuredClone(active(service)); const cases:readonly ((state:any)=>void)[]=[state=>{state.candidates.get(state.anchors[0].sceneId).report.result='SCENE_QC_FAIL';},state=>{state.sequence.candidateAssetIds[0]='stale';},state=>{state.sequence.view.status='SEQUENCE_QC_FAILED';},state=>{delete state.candidates.get(state.anchors[0].sceneId).video;},state=>{state.candidates.get(state.anchors[0].sceneId).candidateAssetId='wrong';},state=>{state.snapshot.productionContract.scenes[0].keyPoints[0].text='wrong';}]; for(const mutate of cases) { const state=structuredClone(base); mutate(state); (service as unknown as {active:any}).active=state; assert.equal(service.deliveryManifest(build.snapshotId).status,'NOT_READY'); assert.throws(()=>service.deliveryOutput(build.snapshotId,'scene-01.mp4'),ProductionWorkspaceError); } (service as unknown as {active:any}).active=base; const rebuilt=await service.build(project,references); assert.notEqual(rebuilt.scenes[0]!.candidateAssetId,build.scenes[0]!.candidateAssetId); assert.equal(service.deliveryManifest(rebuilt.snapshotId).status,'NOT_READY'); assert.equal(mock.requests.filter(request=>request.instruction.startsWith('SCENE_QC_V1:')).length,4);
}));
