import assert from 'node:assert/strict';
import test from 'node:test';
import { SCHEMA_VERSION, type Global4ScenePlan, type R2CommittedProductContext } from '@mochi/contracts';
import { createUntestedActionCapabilityMap, simpleActionFastTrackPolicyV1 } from '@mochi/core';
import { MAX_SCENE_REPLAN_ATTEMPTS, ScenePlanningBlockedError, evaluateSceneRisk, resolveSceneStates, targetedReplan, validatePlan } from './index.ts';

const context:R2CommittedProductContext={schemaVersion:SCHEMA_VERSION,productId:'p',sourceEvidenceVersion:'v',canonicalAssetIds:['a'],productTruth:{schemaVersion:SCHEMA_VERSION,productId:'p',sourceEvidenceVersion:'v',canonicalAssetIds:['a'],name:'n',category:'c',identityDescription:'identity',facts:[{factId:'geometry:0',kind:'GEOMETRY',text:'geometry',evidenceAssetIds:['a']},{factId:'color:0',kind:'COLOR',text:'color',evidenceAssetIds:['a']}],allowedClaims:[],prohibitedInferences:[],unresolvedUncertainties:[],unresolvedContradictions:[],exclusions:[]},referenceAssessment:{schemaVersion:SCHEMA_VERSION,productId:'p',sourceEvidenceVersion:'v',canonicalAssetIds:['a'],assetAssessments:[{assetId:'a',targetVisibility:'CLEAR',identityConfidence:'HIGH',geometryCoverage:'STRONG',labelReadability:'CLEAR',occlusion:'NONE',backgroundInterference:'LOW',multiProductAmbiguity:'NONE'}],readiness:'READY',limitationCodes:[]}};
const continuity={schemaVersion:SCHEMA_VERSION,productId:'p',sourceEvidenceVersion:'v',canonicalAssetIds:['a'],immutable:{handIdentity:{skinTone:'x',nailStyle:'x',jewelry:'x',dominantHand:'RIGHT' as const},environment:{location:'x',surface:'x',background:'x',lighting:'x'},cameraFamily:'SMARTPHONE_POV' as const,voiceIdentity:{voiceGender:'FEMALE' as const,voiceRegion:'SOUTH' as const,voiceStyle:'x'}}};
const base=():Global4ScenePlan=>({schemaVersion:SCHEMA_VERSION,productId:'p',sourceEvidenceVersion:'v',canonicalAssetIds:['a'],continuity,referenceLimitations:[],referenceReadiness:'READY',scenes:[['PICK_UP','BECOME_HELD'],['HOLD','REMAIN_HELD'],['ROTATE_SLOW','CHANGE_ORIENTATION'],['PLACE_DOWN','BECOME_PLACED']].map(([primaryAction,desiredStateEffect],i)=>({sceneId:`p:scene:${i+1}`,index:(i+1) as 1|2|3|4,role:['HOOK','FEATURE','PROOF','CTA'][i] as 'HOOK'|'FEATURE'|'PROOF'|'CTA',durationSeconds:8 as const,aspectRatio:'9:16' as const,primaryTruthRefId:['identity','geometry:0','color:0','identity'][i],physicalObjective:'show',primaryAction:primaryAction as any,desiredStateEffect:desiredStateEffect as any,dialogueDraft:'draft',referenceAssetIds:['a'],...(i<3?{transitionToNext:'MATCH_CUT' as const}:{} )}))});
const allSafe=()=>{const map=createUntestedActionCapabilityMap();for(const action of Object.keys(map) as (keyof typeof map)[])map[action]='SAFE';return map;};
const mock=(decision:unknown,calls:{value:number})=>({id:'mock',async analyzeStructured<T>(request:{parse:(value:unknown)=>T}){calls.value++;return {data:request.parse(decision)};}});
const decision={physicalObjective:'hold steadily',primaryAction:'HOLD',dialogueDraft:'updated',referenceAssetIds:['a']};

test('R6 applies capability and reference-risk precedence deterministically',()=>{const map=allSafe(), p=base();assert.equal(evaluateSceneRisk(resolveSceneStates(p),map).scenes[0]?.status,'READY');map.PICK_UP='UNTESTED';assert.equal(evaluateSceneRisk(resolveSceneStates(p),map).scenes[0]?.status,'CONDITIONAL');map.PICK_UP='RISKY';assert.equal(evaluateSceneRisk(resolveSceneStates(p),map).scenes[0]?.status,'CONDITIONAL');map.PICK_UP='AVOID';assert.equal(evaluateSceneRisk(resolveSceneStates(p),map).scenes[0]?.status,'BLOCKED');const high=base();high.scenes[1]={...high.scenes[1]!,primaryAction:'OPEN_SIMPLE',desiredStateEffect:'CHANGE_PRODUCT_STATE'};assert.equal(evaluateSceneRisk(resolveSceneStates(high),allSafe()).scenes[1]?.status,'CONDITIONAL');const limited={...p,referenceReadiness:'LIMITED' as const,referenceLimitations:['OCCLUSION_SEVERE']};assert.equal(evaluateSceneRisk(resolveSceneStates(limited),allSafe()).scenes[0]?.status,'READY');assert.equal(evaluateSceneRisk(resolveSceneStates(limited),allSafe()).scenes[0]?.warnings.length,1);assert.equal(evaluateSceneRisk(resolveSceneStates({...high,referenceReadiness:'LIMITED',referenceLimitations:['OCCLUSION_SEVERE']}),allSafe()).scenes[1]?.status,'CONDITIONAL');const avoid=allSafe();avoid.OPEN_SIMPLE='AVOID';assert.equal(evaluateSceneRisk(resolveSceneStates({...high,referenceReadiness:'LIMITED',referenceLimitations:['OCCLUSION_SEVERE']}),avoid).scenes[1]?.status,'BLOCKED');});

test('Gate 0/A structural locks reject mutated plan fields and accept serialized continuity',()=>{const p=base(), catalog=['identity','geometry:0','color:0'];assert.deepEqual(p.scenes.map(s=>s.sceneId),['p:scene:1','p:scene:2','p:scene:3','p:scene:4']);assert.deepEqual(validatePlan(p,context,JSON.parse(JSON.stringify(continuity)),catalog,['a']),[]);const variants:[string,Global4ScenePlan][]=[['sceneId',{...p,scenes:p.scenes.map((s,i)=>i===0?{...s,sceneId:'changed'}:s)}],['continuity',{...p,continuity:{...continuity,immutable:{...continuity.immutable,environment:{...continuity.immutable.environment,lighting:'changed'}}}}],['readiness',{...p,referenceReadiness:'LIMITED'}],['limitations',{...p,referenceLimitations:['OCCLUSION_SEVERE']}],['effect',{...p,scenes:p.scenes.map((s,i)=>i===0?{...s,desiredStateEffect:'REMAIN_HELD'}:s)}]];for(const [name,variant] of variants)assert.ok(validatePlan(variant,context,continuity,catalog,['a']).length>0,name);const incompatible={...p,scenes:p.scenes.map((s,i)=>i===1?{...s,primaryAction:'PLACE_DOWN',desiredStateEffect:'BECOME_PLACED'}:s)};assert.throws(()=>resolveSceneStates(incompatible));});

test('bounded replan preserves locked scene fields and returns only a READY candidate',async()=>{const p=base(), map=createUntestedActionCapabilityMap();map.HOLD='SAFE';const calls={value:0};const next=await targetedReplan(p,context,continuity,map,2,mock(decision,calls),MAX_SCENE_REPLAN_ATTEMPTS);assert.equal(calls.value,1);assert.equal(next.scenes[1]?.sceneId,p.scenes[1]?.sceneId);assert.equal(next.scenes[1]?.index,p.scenes[1]?.index);assert.equal(next.scenes[1]?.role,p.scenes[1]?.role);assert.equal(next.scenes[1]?.primaryTruthRefId,p.scenes[1]?.primaryTruthRefId);assert.equal(next.scenes[1]?.transitionToNext,p.scenes[1]?.transitionToNext);assert.ok(Object.keys(next.scenes[1]!).filter(k=>JSON.stringify((next.scenes[1]! as any)[k])!==JSON.stringify((p.scenes[1]! as any)[k])).every(k=>['physicalObjective','primaryAction','desiredStateEffect','dialogueDraft','referenceAssetIds'].includes(k)));assert.deepEqual(next.scenes.filter((_,i)=>i!==1),p.scenes.filter((_,i)=>i!==1));assert.equal(evaluateSceneRisk(resolveSceneStates(next),map).scenes[1]?.status,'READY');});

test('live-pattern CTA replan exposes only full-plan state-feasible fast-track actions and compiles the state effect',async()=>{
  const p=base();
  p.scenes[3]={...p.scenes[3]!,primaryAction:'POINT',desiredStateEffect:'NO_STATE_CHANGE'};
  const map=createUntestedActionCapabilityMap();
  const initialRisk=evaluateSceneRisk(resolveSceneStates(p),map,simpleActionFastTrackPolicyV1).scenes[3];
  assert.equal(initialRisk?.status,'CONDITIONAL');
  assert.equal(initialRisk?.productionEligibility,'BLOCKED');
  assert.deepEqual(initialRisk?.reasons,['action_untested']);
  assert.equal('desiredStateEffect' in decision,false);

  let captured:any;
  const provider={id:'live-pattern-mock',async analyzeStructured<T>(request:any){captured=request;return{data:request.parse(decision) as T};}};
  const next=await targetedReplan(p,context,continuity,map,4,provider,MAX_SCENE_REPLAN_ATTEMPTS,simpleActionFastTrackPolicyV1);
  const input=JSON.parse(captured.inputText);
  assert.deepEqual(input,{
    targetScene:{role:'CTA',primaryTruthRefId:'identity',currentPrimaryAction:'POINT',currentPhysicalObjective:'show'},
    stateFeasibleActions:['HOLD'],
    usableReferenceAssetIds:['a']
  });
  assert.deepEqual(captured.outputSchema.properties.primaryAction.enum,['HOLD']);
  assert.equal('desiredStateEffect' in captured.outputSchema.properties,false);
  assert.equal(captured.outputSchema.required.includes('desiredStateEffect'),false);
  assert.equal(next.scenes[3]?.primaryAction,'HOLD');
  assert.equal(next.scenes[3]?.desiredStateEffect,'REMAIN_HELD');
  assert.doesNotThrow(()=>resolveSceneStates(next));
  assert.equal(evaluateSceneRisk(resolveSceneStates(next),map,simpleActionFastTrackPolicyV1).scenes[3]?.status,'READY');
});

test('bounded replan rejects invalid decisions, exhausts exactly two attempts, and never loops',async()=>{const p=base(), map=createUntestedActionCapabilityMap();map.HOLD='SAFE';for(const invalid of [{...decision,sceneId:'changed'},{...decision,index:4},{...decision,role:'CTA'},{...decision,primaryTruthRefId:'color:0'},{...decision,transitionToNext:'JUMP_CUT'},{...decision,referenceAssetIds:['not-canonical']},{...decision,desiredStateEffect:'BECOME_HELD'}]){const calls={value:0};await assert.rejects(targetedReplan(p,context,continuity,map,2,mock(invalid,calls)),(e:unknown)=>e instanceof ScenePlanningBlockedError&&e.attempts===2);assert.equal(calls.value,2);}});

test('bounded replan blocks before provider when no eligible safe action exists',async()=>{const calls={value:0};await assert.rejects(targetedReplan(base(),context,continuity,createUntestedActionCapabilityMap(),2,mock(decision,calls)),(e:unknown)=>e instanceof ScenePlanningBlockedError&&e.reasons.includes('no_eligible_safer_action')&&e.attempts===0);assert.equal(calls.value,0);});

test('bounded replan blocks before provider when production-eligible actions are not full-plan state-feasible',async()=>{const map=createUntestedActionCapabilityMap();map.PICK_UP='SAFE';const calls={value:0};await assert.rejects(targetedReplan(base(),context,continuity,map,2,mock(decision,calls)),(e:unknown)=>e instanceof ScenePlanningBlockedError&&e.reasons.includes('no_eligible_safer_action')&&e.attempts===0);assert.equal(calls.value,0);});

test('R5 and R6 are deterministic and invoke no intelligence provider',()=>{const p=base(), map=createUntestedActionCapabilityMap();assert.deepEqual(resolveSceneStates(p),resolveSceneStates(p));assert.deepEqual(evaluateSceneRisk(resolveSceneStates(p),map),evaluateSceneRisk(resolveSceneStates(p),map));});
