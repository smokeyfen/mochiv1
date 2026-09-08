import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { SCHEMA_VERSION, type MochiProjectInput } from '@mochi/contracts';
import { type IntelligenceProvider, type StructuredIntelligenceRequest } from '@mochi/providers';
import { ProductionWorkspaceError, ProductionWorkspaceService, type DeliveryOutputName } from './production-workspace.ts';
import { RuntimeConfiguration } from './runtime-configuration.ts';

const project: MochiProjectInput = { schemaVersion:SCHEMA_VERSION, projectId:'delivery-project', product:{schemaVersion:SCHEMA_VERSION,productId:'delivery-product',name:'Mochi Original',details:'Round snack reference.',category:'snack',assets:[{schemaVersion:SCHEMA_VERSION,assetId:'reference-1',role:'PRODUCT_REFERENCE',source:'UPLOAD',mimeType:'image/jpeg'}]},creativeDirection:{audience:'người thích ăn vặt',shootingContext:'bàn gỗ',reviewerPersona:'người review thân thiện',tone:'gần gũi',voiceStyle:'review',voiceGender:'FEMALE',voiceRegion:'SOUTH'}};
const references=[{assetId:'reference-1',mimeType:'image/jpeg',dataBase64:'AQ=='}] as const;
const frame=['PRODUCT_FIDELITY','HAND_ANATOMY','VISIBLE_ARTIFACTS','REVIEWER_FACE_VISIBILITY'];
const temporal=['ACTION_COMPLETION','PHYSICS','CAMERA_REALISM','UNEXPECTED_CUTS','START_STATE_MATCH','END_STATE_MATCH'];
const pair=['PRODUCT_IDENTITY_CONTINUITY','HAND_IDENTITY_CONTINUITY','ENVIRONMENT_CONTINUITY','LIGHTING_CONTINUITY','VISIBLE_STATE_HANDOFF','NO_UNEXPLAINED_IDENTITY_RESET'];
const global=['PRODUCT_CONSISTENCY','HAND_CONSISTENCY','ENVIRONMENT_LIGHTING_CONSISTENCY','SPEAKER_CONSISTENCY','SEQUENCE_COHERENCE','NARRATIVE_ROLE_COHERENCE'];
const pass=(gates:readonly string[])=>gates.map(gate=>({gate,status:'PASS'}));

function createMock() {
  const requests: StructuredIntelligenceRequest<unknown>[]=[]; let runtimeCall=0; let scene2Fail=false; let sequenceFail=false;
  const provider: IntelligenceProvider={id:'mock-delivery',async analyzeStructured<T>(input:StructuredIntelligenceRequest<T>){requests.push(input as StructuredIntelligenceRequest<unknown>); const parsed=(input.instruction.startsWith('SCENE_QC_V1:')||input.instruction.startsWith('SEQUENCE_QC_V1:'))?JSON.parse(input.inputText??'{}') as Record<string,unknown>:{};
    if(input.instruction.startsWith('TARGETED REPLAN:')) return {data:input.parse({physicalObjective:'mục tiêu replanned',primaryAction:'HOLD',desiredStateEffect:'REMAIN_HELD',dialogueDraft:'R4 replanned draft',referenceAssetIds:['reference-1']})};
    if(input.instruction.startsWith('SCENE_QC_V1:')) { const sceneId=parsed.sceneId as string, candidateAssetId=parsed.candidateAssetId as string, failed=scene2Fail&&sceneId.endsWith(':scene:2'); return {data:input.parse({sceneId,candidateAssetId,frame:failed?[{gate:'PRODUCT_FIDELITY',status:'FAIL'},...pass(frame.slice(1))]:pass(frame),temporal:pass(temporal),speechDetected:true,spokenTranscript:parsed.expectedDialogue,dialogueComplete:true,unexpectedSpeechDetected:false,presentationDynamics:{status:'WARN',meaningfulVisualProgression:true,excessiveStaticHold:false,rhythmIntentObserved:true,notes:'non-critical'}})}; }
    if(input.instruction.startsWith('SEQUENCE_QC_V1:')) { const reports=parsed.reports as {sceneId:string}[]; return {data:input.parse({pairs:[0,1,2].map(index=>({fromSceneId:reports[index]!.sceneId,toSceneId:reports[index+1]!.sceneId,gates:sequenceFail?[{gate:'PRODUCT_IDENTITY_CONTINUITY',status:'FAIL'},...pass(pair.slice(1))]:pass(pair)})),global:pass(global),visualVariation:{status:'WARN',meaningfulVisualProgression:true,excessiveStaticHold:false,rhythmIntentObserved:true,notes:'non-critical'}})}; }
    const data=[
      {schemaVersion:SCHEMA_VERSION,productId:project.product.productId,canonicalAssetIds:['reference-1'],identityDescription:'Mochi snack',geometryNotes:['Round shape'],colorNotes:['White coating'],packagingNotes:['Simple package'],labelNotes:['Mochi label'],claims:[],prohibitedInferences:[],uncertainties:[],contradictions:[]},
      {schemaVersion:SCHEMA_VERSION,productId:project.product.productId,sourceEvidenceVersion:'BROWSER_RUNTIME_V1',canonicalAssetIds:['reference-1'],retainedFactIds:['identity','geometry:0','color:0','packaging:0','label:0'],exclusions:[]},
      {schemaVersion:SCHEMA_VERSION,productId:project.product.productId,sourceEvidenceVersion:'BROWSER_RUNTIME_V1',canonicalAssetIds:['reference-1'],assetAssessments:[{assetId:'reference-1',targetVisibility:'CLEAR',identityConfidence:'HIGH',geometryCoverage:'STRONG',labelReadability:'CLEAR',occlusion:'NONE',backgroundInterference:'LOW',multiProductAmbiguity:'NONE'}]},
      {skinTone:'ấm',nailStyle:'ngắn',jewelry:'không',dominantHand:'RIGHT',surface:'gỗ',background:'trơn',lighting:'mềm'},
      {productId:project.product.productId,sourceEvidenceVersion:'BROWSER_RUNTIME_V1',canonicalAssetIds:['reference-1'],scenes:[['HOOK','identity','PICK_UP','BECOME_HELD'],['FEATURE','geometry:0','HOLD','REMAIN_HELD'],['PROOF','color:0','ROTATE_SLOW','CHANGE_ORIENTATION'],['CTA','identity','PLACE_DOWN','BECOME_PLACED']].map(([role,primaryTruthRefId,primaryAction,desiredStateEffect],offset)=>({index:offset+1,role,primaryTruthRefId,physicalObjective:`mục tiêu ${offset+1}`,primaryAction,desiredStateEffect,dialogueDraft:'R4 draft',referenceAssetIds:['reference-1'],...(offset<3?{transitionToNext:'MATCH_CUT'}:{})}))},
      {scenes:Array.from({length:4},()=>({approachBehavior:'Đưa tay tự nhiên.',gripAndContactBehavior:'Giữ chắc.',actionExecutionBehavior:'Thực hiện chậm.',postActionSettleBehavior:'Dừng nhẹ.',cameraBehavior:'Rung tay nhẹ.'}))},
      {secondaryTruthRefIds:['identity','geometry:0','geometry:0']},
      {scenes:Array.from({length:4},(_,offset)=>({sceneId:`${project.product.productId}:scene:${offset+1}`,index:offset+1,dialogue:`Mochi Original cảnh ${offset+1} nha.`,addressedKeyPointIndexes:[1,2]}))},
      {scenes:Array.from({length:4},()=>({coversKeyPoint1:true,coversKeyPoint2:true,introducesUnsupportedProductFact:false,naturalSouthernConversationalVietnamese:true,containsStageDirectionOrNonSpeechText:false})),sameReviewerPersonaAcrossScenes:true}
    ][runtimeCall++ % 9]; return {data:input.parse(data)};
  }};
  return {provider,requests,setScene2Fail:(value:boolean)=>{scene2Fail=value;},setSequenceFail:(value:boolean)=>{sequenceFail=value;}};
}

async function withWorkspace(run:(value:{service:ProductionWorkspaceService;mock:ReturnType<typeof createMock>})=>Promise<void>) { const root=await mkdtemp(join(tmpdir(),'mochi-delivery-')); const mock=createMock(); const service=new ProductionWorkspaceService(new RuntimeConfiguration(mock.provider),root); try { await run({service,mock}); } finally { await rm(root,{recursive:true,force:true}); } }
async function ready(service:ProductionWorkspaceService) { const build=await service.build(project,references); for(const scene of build.scenes) await service.uploadAndQc(build.snapshotId,scene.sceneId,scene.candidateAssetId,{type:'video/mp4',bytes:Buffer.from(`video-${scene.index}`)}); await service.runSequence(build.snapshotId); assert.equal(service.finalAcceptance(build.snapshotId).status,'FINAL_ACCEPTANCE_PASS'); return build; }
const active=(service:ProductionWorkspaceService):any=>(service as unknown as {active:any}).active;

test('Task 7B clean mocked browser E2E delivers byte-exact files and deterministic key points', async()=>withWorkspace(async({service,mock})=>{
  const build=await ready(service); const manifest=service.deliveryManifest(build.snapshotId);
  assert.deepEqual(manifest.outputs.map(output=>output.filename),['scene-01.mp4','scene-02.mp4','scene-03.mp4','scene-04.mp4','key-points.txt']); assert.equal(manifest.status,'READY_FOR_DELIVERY');
  for(const [index,filename] of ['scene-01.mp4','scene-02.mp4','scene-03.mp4','scene-04.mp4'].entries()) assert.deepEqual(service.deliveryOutput(build.snapshotId,filename as DeliveryOutputName).bytes,Buffer.from(`video-${index+1}`));
  const text=Buffer.from(service.deliveryOutput(build.snapshotId,'key-points.txt').bytes).toString('utf8'); const lines=text.trimEnd().split('\n'); assert.equal(lines.length,8); assert.equal(lines[0],project.product.name); assert.ok(lines.every(line=>line.length>0));
  assert.equal(mock.requests.filter(request=>request.instruction.startsWith('SCENE_QC_V1:')).length,4); assert.equal(mock.requests.filter(request=>request.instruction.startsWith('SEQUENCE_QC_V1:')).length,1); assert.equal(service.recordDelivery(build.snapshotId).status,'DELIVERED');
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

test('Final Acceptance records every fail-closed blocker and WARN-only QC remains accepted', async()=>withWorkspace(async({service})=>{
  const build=await ready(service); const base=structuredClone(active(service)); const cases:readonly [string,(state:any)=>void][]=[
    ['SCENE_QC_NOT_PASS',state=>{state.candidates.get(state.anchors[0].sceneId).report.result='SCENE_QC_FAIL';}],['SEQUENCE_QC_NOT_PASS',state=>{delete state.sequence;}],['STALE_SEQUENCE',state=>{state.sequence.candidateAssetIds[0]='stale';}],['STALE_CANDIDATE',state=>{state.candidates.get(state.anchors[0].sceneId).video.candidateAssetId='stale';}],['SNAPSHOT_MISMATCH',state=>{state.anchors[0].snapshotId='stale';}],['DIALOGUE_MISMATCH',state=>{state.requests[0].dialogue='stale';}],['VOICE_MISMATCH',state=>{state.requests[0].nativeVoiceBinding.logicalVoiceIdentityId='stale';}],['PROMPT_BUDGET_INVALID',state=>{state.requests[0].durationSeconds=7;}],['KEY_POINT_PLAN_INVALID',state=>{state.snapshot.productionContract.scenes[0].keyPoints[0].text='stale';}],['REFERENCE_BINDING_INVALID',state=>{state.requests[0].referenceBindings=[];}],['PAIRWISE_QC_NOT_PASS',state=>{state.sequence.view.pairs[0].gates[0].status='FAIL';}],['GLOBAL_CONTINUITY_NOT_PASS',state=>{state.sequence.view.globalGates[0].status='FAIL';}]
  ]; for(const [code,mutate] of cases) { const state=structuredClone(base); mutate(state); (service as unknown as {active:any}).active=state; assert.ok(service.finalAcceptance(build.snapshotId).blockerCodes.includes(code as never),code); } (service as unknown as {active:any}).active=base; assert.equal(service.finalAcceptance(build.snapshotId).status,'FINAL_ACCEPTANCE_PASS');
}));

test('delivery rejects failed QC, stale candidate or sequence, failed sequence, missing bytes, wrong identity, bad key plan, and a new build', async()=>withWorkspace(async({service,mock})=>{
  const build=await ready(service); const base=structuredClone(active(service)); const cases:readonly ((state:any)=>void)[]=[state=>{state.candidates.get(state.anchors[0].sceneId).report.result='SCENE_QC_FAIL';},state=>{state.sequence.candidateAssetIds[0]='stale';},state=>{state.sequence.view.status='SEQUENCE_QC_FAILED';},state=>{delete state.candidates.get(state.anchors[0].sceneId).video;},state=>{state.candidates.get(state.anchors[0].sceneId).candidateAssetId='wrong';},state=>{state.snapshot.productionContract.scenes[0].keyPoints[0].text='wrong';}]; for(const mutate of cases) { const state=structuredClone(base); mutate(state); (service as unknown as {active:any}).active=state; assert.equal(service.deliveryManifest(build.snapshotId).status,'NOT_READY'); assert.throws(()=>service.deliveryOutput(build.snapshotId,'scene-01.mp4'),ProductionWorkspaceError); } (service as unknown as {active:any}).active=base; const rebuilt=await service.build(project,references); assert.notEqual(rebuilt.scenes[0]!.candidateAssetId,build.scenes[0]!.candidateAssetId); assert.equal(service.deliveryManifest(rebuilt.snapshotId).status,'NOT_READY'); assert.equal(mock.requests.filter(request=>request.instruction.startsWith('SCENE_QC_V1:')).length,4);
}));
