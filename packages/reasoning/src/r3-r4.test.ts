import assert from 'node:assert/strict'; import test from 'node:test';
import { SCHEMA_VERSION, type CreativeDirectionInput, type R2CommittedProductContext } from '@mochi/contracts';
import { createUntestedActionCapabilityMap, simpleActionFastTrackPolicyV1 } from '@mochi/core';
import { V1_REVIEW_ACTION_SPINE } from './planner.ts';

import { resolveSceneStates, evaluateSceneRisk, PlannerError, planGlobal4Scenes, synthesizeGlobalContinuity, validatePlan } from './index.ts';
const creative:CreativeDirectionInput={audience:'adults',shootingContext:'vanity',reviewerPersona:'reviewer',tone:'warm',voiceStyle:'review',voiceGender:'FEMALE',voiceRegion:'SOUTH'};
const context:R2CommittedProductContext={schemaVersion:SCHEMA_VERSION,productId:'p',sourceEvidenceVersion:'v',canonicalAssetIds:['a'],productTruth:{schemaVersion:SCHEMA_VERSION,productId:'p',sourceEvidenceVersion:'v',canonicalAssetIds:['a'],name:'n',category:'c',identityDescription:'identity',facts:[{factId:'geometry:0',kind:'GEOMETRY',text:'geometry',evidenceAssetIds:['a']},{factId:'color:0',kind:'COLOR',text:'color',evidenceAssetIds:['a']}],allowedClaims:[],prohibitedInferences:[],unresolvedUncertainties:[],unresolvedContradictions:[],exclusions:[]},referenceAssessment:{schemaVersion:SCHEMA_VERSION,productId:'p',sourceEvidenceVersion:'v',canonicalAssetIds:['a'],assetAssessments:[{assetId:'a',targetVisibility:'CLEAR',identityConfidence:'HIGH',geometryCoverage:'STRONG',labelReadability:'CLEAR',occlusion:'NONE',backgroundInterference:'LOW',multiProductAmbiguity:'NONE'}],readiness:'READY',limitationCodes:[]}};
function provider(outputs:unknown[]){let i=0;return {id:'mock',async analyzeStructured<T>(r:any){return {data:r.parse(outputs[i++])};}};}
const continuityDecision={skinTone:'warm',nailStyle:'short',jewelry:'none',dominantHand:'RIGHT',surface:'wood',background:'soft',lighting:'daylight'};
function decision(reuseTruthFromScene=1,overrides:Record<string,unknown>={}){return {hook:{primaryTruthRefId:'identity',dialogueDraft:'draft',referenceAssetIds:['a'],transitionToNext:'CONTINUOUS'},feature:{primaryTruthRefId:'geometry:0',dialogueDraft:'draft',referenceAssetIds:['a'],transitionToNext:'MATCH_CUT'},proof:{primaryTruthRefId:'color:0',dialogueDraft:'draft',referenceAssetIds:['a'],transitionToNext:'JUMP_CUT'},cta:{reuseTruthFromScene,dialogueDraft:'draft',referenceAssetIds:['a']},...overrides};}
async function validContinuity(){return synthesizeGlobalContinuity({context,creativeDirection:creative,intelligence:provider([continuityDecision])});}
test('R3 preserves source and deterministic creative locks, then R4 creates four global intents',async()=>{const p=provider([{skinTone:'warm',nailStyle:'short',jewelry:'none',dominantHand:'RIGHT',surface:'wood',background:'soft',lighting:'daylight'},{hook:{primaryTruthRefId:'identity',dialogueDraft:'draft',referenceAssetIds:['a'],transitionToNext:'MATCH_CUT'},feature:{primaryTruthRefId:'geometry:0',dialogueDraft:'draft',referenceAssetIds:['a'],transitionToNext:'MATCH_CUT'},proof:{primaryTruthRefId:'color:0',dialogueDraft:'draft',referenceAssetIds:['a'],transitionToNext:'MATCH_CUT'},cta:{reuseTruthFromScene:1,dialogueDraft:'draft',referenceAssetIds:['a']}}]);const continuity=await synthesizeGlobalContinuity({context,creativeDirection:creative,intelligence:p});assert.equal(continuity.immutable.environment.location,'vanity');assert.equal(continuity.immutable.voiceIdentity.voiceGender,'FEMALE');const plan=await planGlobal4Scenes({context,continuity,creativeDirection:creative,intelligence:p});assert.equal(plan.scenes.length,4);assert.deepEqual(plan.scenes.slice(0,3).map(s=>s.primaryTruthRefId),['identity','geometry:0','color:0']);assert.deepEqual(plan.scenes.map(s=>s.desiredStateEffect),['BECOME_HELD','REMAIN_HELD','CHANGE_ORIENTATION','REMAIN_HELD']);assert.equal('startState'in plan.scenes[0]!,false);});
test('R4 fails before provider without three selectable truth entries',async()=>{const c={...context,productTruth:{...context.productTruth,facts:[]}};const continuity=await synthesizeGlobalContinuity({context:c,creativeDirection:creative,intelligence:provider([{skinTone:'warm',nailStyle:'short',jewelry:'none',dominantHand:'RIGHT',surface:'wood',background:'soft',lighting:'daylight'}])});await assert.rejects(planGlobal4Scenes({context:c,continuity,creativeDirection:creative,intelligence:provider([])}),(e:unknown)=>e instanceof PlannerError&&e.code==='INSUFFICIENT_PLANNABLE_TRUTH');});
test('R4 slot decision removes deterministic authority and compiles the public plan exactly once',async()=>{const continuity=await validContinuity();const requests:any[]=[];const intelligence={id:'mock',async analyzeStructured<T>(request:any){requests.push(request);return {data:request.parse(decision(2))};}};const plan=await planGlobal4Scenes({context,continuity,creativeDirection:creative,intelligence});assert.equal(requests.length,1);const schema=requests[0].outputSchema;assert.deepEqual(Object.keys(schema.properties).sort(),['cta','feature','hook','proof']);for(const name of ['hook','feature','proof']){const slot=schema.properties[name];assert.equal('index'in slot.properties,false);assert.equal('role'in slot.properties,false);assert.equal('desiredStateEffect'in slot.properties,false);assert.ok(slot.required.includes('transitionToNext'));}assert.equal('transitionToNext'in schema.properties.cta.properties,false);assert.equal(schema.properties.cta.required.includes('transitionToNext'),false);assert.deepEqual(plan.scenes.map(scene=>scene.index),[1,2,3,4]);assert.deepEqual(plan.scenes.map(scene=>scene.role),['HOOK','FEATURE','PROOF','CTA']);assert.deepEqual(plan.scenes.map(scene=>scene.sceneId),['p:scene:1','p:scene:2','p:scene:3','p:scene:4']);assert.ok(plan.scenes.every(scene=>scene.durationSeconds===8&&scene.aspectRatio==='9:16'));assert.deepEqual(plan.scenes.map(scene=>scene.desiredStateEffect),['BECOME_HELD','REMAIN_HELD','CHANGE_ORIENTATION','REMAIN_HELD']);assert.equal(plan.scenes[3]!.primaryTruthRefId,plan.scenes[1]!.primaryTruthRefId);assert.deepEqual(validatePlan(plan,context,continuity,['identity','geometry:0','color:0'],['a']),[]);});
test('R4 CTA reuse maps each selected prior slot and structural or semantic violations fail closed',async()=>{const continuity=await validContinuity();for(const reuse of [1,2,3]){const plan=await planGlobal4Scenes({context,continuity,creativeDirection:creative,intelligence:provider([decision(reuse)])});assert.equal(plan.scenes[3]!.primaryTruthRefId,plan.scenes[reuse-1]!.primaryTruthRefId);}const invalids=[decision(1,{feature:{...decision().hook}}),decision(1,{hook:{...decision().hook,primaryTruthRefId:'unknown'}}),decision(1,{proof:{...decision().proof,referenceAssetIds:['unknown']}}),decision(1,{hook:(({transitionToNext,...slot})=>slot)(decision().hook)}),decision(1,{cta:{...decision().cta,transitionToNext:'MATCH_CUT'}})];for(const invalid of invalids)await assert.rejects(planGlobal4Scenes({context,continuity,creativeDirection:creative,intelligence:provider([invalid])}),(error:unknown)=>error instanceof PlannerError&&error.code==='INVALID_MODEL_OUTPUT');});

test('R4 compiler-owned V1 spine resolves complete sequential state for either dominant hand', async () => {
  for (const dominantHand of ['LEFT', 'RIGHT'] as const) {
    const continuity = await synthesizeGlobalContinuity({context, creativeDirection:creative, intelligence:provider([{...continuityDecision, dominantHand}])});
    const plan = await planGlobal4Scenes({context, continuity, creativeDirection:creative, intelligence:provider([decision()])});
    assert.equal(V1_REVIEW_ACTION_SPINE.version, 'V1_REVIEW_ACTION_SPINE_V1');
    assert.deepEqual(plan.scenes.map(s => s.primaryAction), ['PICK_UP','HOLD','ROTATE_SLOW','HOLD']);
    assert.deepEqual(plan.scenes.map(s => s.desiredStateEffect), ['BECOME_HELD','REMAIN_HELD','CHANGE_ORIENTATION','REMAIN_HELD']);
    assert.deepEqual(plan.scenes.map(s => s.physicalObjective), [
      'Pick up the product from the surface to introduce it in hand.',
      'Hold the product steadily in hand to present the selected feature.',
      'Slowly rotate the held product to show its visible details.',
      'Keep holding the product steadily in its final orientation for the call to action.'
    ]);
    const resolved = resolveSceneStates(plan);
    assert.equal(resolved.scenes.length, 4);
    assert.deepEqual(resolved.scenes[0]!.startState, {heldBy:'NONE', placement:'ON_SURFACE', orientation:'FRONT_FACING', interactionState:'BASELINE'});
    for (let i=1; i<4; i++) assert.deepEqual(resolved.scenes[i]!.startState, resolved.scenes[i-1]!.endState);
    assert.deepEqual(resolved.scenes[3]!.endState, {heldBy:dominantHand === 'LEFT' ? 'LEFT_HAND' : 'RIGHT_HAND', placement:'IN_HAND', orientation:'ROTATED', interactionState:'BASELINE'});
    assert.deepEqual(plan.scenes.map(s => s.referenceAssetIds), [['a'],['a'],['a'],['a']]);
    assert.deepEqual(plan.scenes.map(s => s.transitionToNext), ['CONTINUOUS','MATCH_CUT','JUMP_CUT',undefined]);
    assert.deepEqual(plan.scenes.map(s => s.dialogueDraft), ['draft','draft','draft','draft']);
    assert.equal(plan.schemaVersion, SCHEMA_VERSION);
    assert.equal(plan.productId, context.productId);
    assert.equal(plan.sourceEvidenceVersion, context.sourceEvidenceVersion);
    assert.deepEqual(plan.canonicalAssetIds, context.canonicalAssetIds);
  }
});

test('compiled R4 spine is R6 READY in all four scenes with all-UNTESTED plus current V1 fast-track', async () => {
  const continuity = await validContinuity();
  const plan = await planGlobal4Scenes({context, continuity, creativeDirection:creative, intelligence:provider([decision()])});
  const map = createUntestedActionCapabilityMap();
  const before = structuredClone(map);
  const resolved = resolveSceneStates(plan);
  const risk = evaluateSceneRisk(resolved, map, simpleActionFastTrackPolicyV1);
  assert.deepEqual(risk.scenes.map(s => s.status), ['READY','READY','READY','READY']);
  assert.ok(risk.scenes.every(s => s.actionCapability === 'UNTESTED' && s.productionEligibility === 'FAST_TRACK_AUTHORIZED' && !s.replanRecommended));
  assert.ok(Object.values(map).every(value => value === 'UNTESTED'));
  assert.deepEqual(map, before);
  assert.ok(evaluateSceneRisk(resolved, map).scenes.every(s => s.status === 'CONDITIONAL'));
});

test('R4 provider schema and runtime reject every removed compiler-owned field', async () => {
  const continuity = await validContinuity();
  let schema:any;
  await planGlobal4Scenes({context, continuity, creativeDirection:creative, intelligence:{id:'mock', async analyzeStructured<T>(request:any) {
    schema=request.outputSchema;
    assert.match(request.inputText, /V1_REVIEW_ACTION_SPINE_V1/);
    return {data:request.parse(decision()) as T};
  }}});
  assert.deepEqual(schema.required, ['hook','feature','proof','cta']);
  assert.equal(schema.additionalProperties, false);
  for (const name of ['hook','feature','proof','cta'] as const) {
    const keys = name === 'cta' ? ['reuseTruthFromScene','dialogueDraft','referenceAssetIds'] : ['primaryTruthRefId','dialogueDraft','referenceAssetIds','transitionToNext'];
    assert.deepEqual(Object.keys(schema.properties[name].properties), keys);
    assert.deepEqual(schema.properties[name].required, keys);
    assert.equal(schema.properties[name].additionalProperties, false);
    for (const [key,value] of Object.entries({primaryAction:'ROTATE_SLOW',physicalObjective:'place down',desiredStateEffect:'BECOME_PLACED'})) {
      const invalid = decision(1, {[name]:{...decision()[name],[key]:value}});
      await assert.rejects(planGlobal4Scenes({context,continuity,creativeDirection:creative,intelligence:provider([invalid])}), (error:unknown) => error instanceof PlannerError && error.code === 'INVALID_MODEL_OUTPUT');
    }
  }
  for (const [key,value] of Object.entries({productId:'p',sourceEvidenceVersion:'v',canonicalAssetIds:['a']})) {
    assert.equal(key in schema.properties, false);
    await assert.rejects(planGlobal4Scenes({context,continuity,creativeDirection:creative,intelligence:provider([decision(1,{[key]:value})])}), (error:unknown) => error instanceof PlannerError && error.code === 'INVALID_MODEL_OUTPUT');
  }
});
