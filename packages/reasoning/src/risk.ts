import { type StateResolved4ScenePlan } from '@mochi/contracts';
import { evaluateProductionActionEligibility, type ActionCapabilityMap, type SimpleActionFastTrackPolicyV1 } from '@mochi/core';
import { ACTION_SEMANTICS } from './state.ts';

export type SceneRiskStatus='READY'|'CONDITIONAL'|'BLOCKED';
export interface SceneRiskAssessment{sceneId:string;index:number;actionId:string;actionCapability:string;productionEligibility:'EMPIRICAL_SAFE'|'FAST_TRACK_AUTHORIZED'|'BLOCKED';actionComplexity:number;referenceQuality:'READY'|'LIMITED';status:SceneRiskStatus;reasons:string[];warnings:string[];replanRecommended:boolean;}
export interface GlobalSceneRiskAssessment{scenes:SceneRiskAssessment[];}

/** R6 remains authoritative: fast-track eligibility is only one checked input to its risk result. */
export function evaluateSceneRisk(plan:StateResolved4ScenePlan,map:ActionCapabilityMap,policy?:SimpleActionFastTrackPolicyV1):GlobalSceneRiskAssessment{const limited=plan.referenceReadiness==='LIMITED';return{scenes:plan.scenes.map(s=>{const eligibility=evaluateProductionActionEligibility(s,map,policy),cap=eligibility.empiricalClassification,complexity=ACTION_SEMANTICS[s.primaryAction].complexity;let status:SceneRiskStatus='READY',reasons:string[]=[],warnings:string[]=[];if(eligibility.status==='BLOCKED'){status=cap==='AVOID'?'BLOCKED':'CONDITIONAL';reasons.push(...eligibility.reasons);}else if(complexity===3){status='CONDITIONAL';reasons.push('complexity_3');}if(limited){warnings.push(...plan.referenceLimitations);if(status!=='BLOCKED'&&complexity>1)status='CONDITIONAL';}return{sceneId:s.sceneId,index:s.index,actionId:s.primaryAction,actionCapability:cap,productionEligibility:eligibility.status,actionComplexity:complexity,referenceQuality:limited?'LIMITED':'READY',status,reasons,warnings,replanRecommended:status!=='READY'};})};}
