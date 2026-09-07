import {
  validateCreativeDirectionInput,
  validateProductInput,
  validateProductionSnapshotV1,
  type CreativeDirectionInput,
  type ProductInput,
  type ProductionSnapshotV1
} from '@mochi/contracts';
import { isDeepStrictEqual } from 'node:util';
import { type ActionCapabilityMap } from '@mochi/core';
import { analyzeProductEvidence } from '@mochi/evidence';
import { type IntelligenceMediaInput, type IntelligenceProvider } from '@mochi/providers';
import {
  analyzeProductTruth,
  analyzeReferenceAssessment,
  commitR2ProductContext,
  compileProductionContract,
  evaluateSceneRisk,
  finalizeDialogue,
  planGlobal4Scenes,
  planHumanRealism,
  planKeyPoints,
  resolveSceneStates,
  synthesizeGlobalContinuity
} from '@mochi/reasoning';
import { type ProductionSnapshotStore } from './production-snapshot.ts';

/** Ordered safe evidence for the one controlled PRE-F1 runtime invocation. */
export const PRE_F1_RUNTIME_STAGES = [
  'VALIDATE_INPUT',
  'R1_PRODUCT_EVIDENCE',
  'R2_A_PRODUCT_TRUTH',
  'R2_B_REFERENCE_ASSESSMENT',
  'R2_COMMIT',
  'R3_CONTINUITY',
  'R4_GLOBAL_PLAN',
  'R4_1_KEY_POINTS',
  'R5_STATE',
  'R6_RISK',
  'R6_READY_GATE',
  'R7_A_HUMAN_REALISM',
  'R7_B_DIALOGUE',
  'R8_PRODUCTION_CONTRACT',
  'P0_CREATE_PERSIST',
  'P0_LOAD',
  'P0_EQUALITY',
  'RETURN_VALIDATE'
] as const;

export type PreF1RuntimeStage = typeof PRE_F1_RUNTIME_STAGES[number];
export interface PreF1RuntimeTraceEntry { readonly stage: PreF1RuntimeStage; readonly status: 'COMPLETED'; }

/** All caller-controlled runtime input. No computed R2–R8 artifact can enter here. */
export interface ProductionRuntimeRequest {
  readonly projectId: string;
  readonly product: ProductInput;
  readonly creativeDirection: CreativeDirectionInput;
  readonly media: readonly IntelligenceMediaInput[];
  readonly sourceEvidenceVersion: string;
  readonly capabilityMap: ActionCapabilityMap;
}

/** Trusted server composition dependencies. One provider instance is shared by every intelligence stage. */
export interface ProductionRuntimeDependencies {
  readonly intelligence: IntelligenceProvider;
  readonly snapshotStore: ProductionSnapshotStore;
}

export interface ProductionRuntimeResult {
  /** The sole persisted production artifact. Trace data is separate and never persisted. */
  readonly snapshot: ProductionSnapshotV1;
  readonly trace: readonly PreF1RuntimeTraceEntry[];
}

export class ProductionRuntimeError extends Error {
  readonly stage: PreF1RuntimeStage;
  readonly trace: readonly PreF1RuntimeTraceEntry[];

  constructor(stage: PreF1RuntimeStage, trace: readonly PreF1RuntimeTraceEntry[]) {
    super(`PRE_F1_RUNTIME_ERROR:${stage}`);
    this.name = 'ProductionRuntimeError';
    this.stage = stage;
    this.trace = trace;
  }
}

const ACTION_IDS = [
  'REACH', 'PICK_UP', 'HOLD', 'MOVE_CLOSER', 'ROTATE_SLOW', 'PLACE_DOWN',
  'OPEN_SIMPLE', 'PRESS_BUTTON', 'POUR_SIMPLE', 'APPLY_SIMPLE', 'POINT'
] as const;
const CAPABILITY_LEVELS = new Set(['UNTESTED', 'SAFE', 'RISKY', 'AVOID']);

function validRequest(request: ProductionRuntimeRequest): boolean {
  if (!request || typeof request.projectId !== 'string' || request.projectId.trim().length === 0
    || typeof request.sourceEvidenceVersion !== 'string' || request.sourceEvidenceVersion.trim().length === 0
    || validateProductInput(request.product).length > 0
    || validateCreativeDirectionInput(request.creativeDirection).length > 0
    || !request.capabilityMap || typeof request.capabilityMap !== 'object') return false;
  return ACTION_IDS.every(action => CAPABILITY_LEVELS.has(request.capabilityMap[action]));
}

function sameValue(left: unknown, right: unknown): boolean {
  return isDeepStrictEqual(left, right);
}

/**
 * Server-only orchestration of the locked reasoning pipeline through P0.
 * This layer owns only ordering, safe tracing, and fail-closed error mapping.
 */
export function createProductionRuntime(dependencies: ProductionRuntimeDependencies) {
  if (!dependencies?.intelligence || !dependencies.snapshotStore) throw new ProductionRuntimeError('VALIDATE_INPUT', []);

  return {
    async run(request: ProductionRuntimeRequest): Promise<ProductionRuntimeResult> {
      const trace: PreF1RuntimeTraceEntry[] = [];
      const stage = async <T>(name: PreF1RuntimeStage, operation: () => T | Promise<T>): Promise<T> => {
        try {
          const value = await operation();
          trace.push({ stage: name, status: 'COMPLETED' });
          return value;
        } catch {
          throw new ProductionRuntimeError(name, trace);
        }
      };

      await stage('VALIDATE_INPUT', () => {
        if (!validRequest(request)) throw new Error('invalid');
      });
      const evidence = await stage('R1_PRODUCT_EVIDENCE', () => analyzeProductEvidence({
        product: request.product, media: request.media, intelligence: dependencies.intelligence
      }));
      const productTruth = await stage('R2_A_PRODUCT_TRUTH', () => analyzeProductTruth({
        product: request.product, evidence, sourceEvidenceVersion: request.sourceEvidenceVersion, intelligence: dependencies.intelligence
      }));
      const referenceAssessment = await stage('R2_B_REFERENCE_ASSESSMENT', () => analyzeReferenceAssessment({
        product: request.product, evidence, sourceEvidenceVersion: request.sourceEvidenceVersion,
        media: request.media, intelligence: dependencies.intelligence
      }));
      const context = await stage('R2_COMMIT', () => commitR2ProductContext({
        product: request.product, evidence, sourceEvidenceVersion: request.sourceEvidenceVersion, productTruth, referenceAssessment
      }));
      const continuity = await stage('R3_CONTINUITY', () => synthesizeGlobalContinuity({
        context, creativeDirection: request.creativeDirection, intelligence: dependencies.intelligence
      }));
      const globalPlan = await stage('R4_GLOBAL_PLAN', () => planGlobal4Scenes({
        context, continuity, creativeDirection: request.creativeDirection, intelligence: dependencies.intelligence
      }));
      const keyPointPlan = await stage('R4_1_KEY_POINTS', () => planKeyPoints({
        context, globalPlan, intelligence: dependencies.intelligence
      }));
      const statePlan = await stage('R5_STATE', () => resolveSceneStates(globalPlan));
      const riskAssessment = await stage('R6_RISK', () => evaluateSceneRisk(statePlan, request.capabilityMap));
      await stage('R6_READY_GATE', () => {
        if (riskAssessment.scenes.some(scene => scene.status !== 'READY')) throw new Error('risk_not_ready');
      });
      const humanRealismPlan = await stage('R7_A_HUMAN_REALISM', () => planHumanRealism({
        context, plan: globalPlan, statePlan, risk: riskAssessment, creativeDirection: request.creativeDirection,
        capabilityMap: request.capabilityMap, intelligence: dependencies.intelligence
      }));
      const dialoguePlan = await stage('R7_B_DIALOGUE', () => finalizeDialogue({
        context, globalPlan, keyPointPlan, creativeDirection: request.creativeDirection, intelligence: dependencies.intelligence
      }));
      const productionRequest = {
        context, creativeDirection: request.creativeDirection, globalPlan, keyPointPlan, statePlan,
        riskAssessment, capabilityMap: request.capabilityMap, humanRealismPlan, dialoguePlan
      };
      const productionContract = await stage('R8_PRODUCTION_CONTRACT', () => compileProductionContract(productionRequest));
      const snapshot = await stage('P0_CREATE_PERSIST', () => dependencies.snapshotStore.create({
        projectId: request.projectId, productionRequest
      }));
      const loaded = await stage('P0_LOAD', () => dependencies.snapshotStore.load(snapshot.snapshotId));
      await stage('P0_EQUALITY', () => {
        if (!sameValue(loaded, snapshot) || !sameValue(snapshot.productionContract, productionContract)) throw new Error('snapshot_mismatch');
      });
      await stage('RETURN_VALIDATE', () => {
        if (validateProductionSnapshotV1(loaded).length > 0) throw new Error('invalid_snapshot');
      });
      return { snapshot: loaded, trace };
    }
  };
}
