import test from 'node:test';
import assert from 'node:assert/strict';
import type { BenchmarkObservation, QCReport, ScenePlan } from '@mochi/contracts';
import { BENCHMARK_DIMENSIONS, SCHEMA_VERSION } from '@mochi/contracts';
import {
  canTransition,
  classifyCapabilityEvidence,
  createUntestedActionCapabilityMap,
  evaluateSceneFeasibility,
  isQCFailClosed,
  validateStateCarryover
} from './index.ts';

const scene: ScenePlan = {
  schemaVersion: SCHEMA_VERSION, sceneId:'s1', index:1, role:'HOOK', durationSeconds:8, aspectRatio:'9:16',
  primaryObjective:'Pick up product', dialogue:'Test',
  startState:{productState:{cap:'closed'},propState:{},heldBy:'NONE',productOrientation:'FRONT',productPosition:'TABLE'},
  actions:[{action:'PICK_UP',objective:'Pick it up',complexity:1}],
  endState:{productState:{cap:'closed'},propState:{},heldBy:'RIGHT_HAND',productOrientation:'FRONT',productPosition:'CENTER'},
  transitionToNext:'MATCH_CUT', requiredAssetIds:['asset-1']
};

test('feasibility fails closed for untested actions', () => {
  const result = evaluateSceneFeasibility(scene, createUntestedActionCapabilityMap());
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes('action_untested:PICK_UP'));
});

test('all physical actions default to untested', () => {
  const levels = Object.values(createUntestedActionCapabilityMap());
  assert.equal(levels.length, 11);
  assert.ok(levels.every(level => level === 'UNTESTED'));
});

test('feasibility fails closed for avoid actions', () => {
  const map = createUntestedActionCapabilityMap();
  map.PICK_UP = 'AVOID';
  const result = evaluateSceneFeasibility(scene, map);
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes('action_avoid:PICK_UP'));
});

test('feasibility passes after empirical SAFE classification', () => {
  const map = createUntestedActionCapabilityMap();
  map.PICK_UP = 'SAFE';
  assert.equal(evaluateSceneFeasibility(scene, map).passed, true);
});

test('continuity catches unexplained state reset', () => {
  const errors = validateStateCarryover(scene.endState, {...scene.endState, productState:{cap:'open'}});
  assert.ok(errors.includes('product_state_mismatch:cap'));
});

test('lifecycle cannot skip QC', () => {
  assert.equal(canTransition('GENERATED','APPROVED'), false);
  assert.equal(canTransition('GENERATED','QC_PENDING'), true);
});

test('critical QC failure cannot be approved', () => {
  const report: QCReport = {
    schemaVersion: SCHEMA_VERSION,
    candidateId: 'candidate-1',
    gates: [{gate:'HAND_ANATOMY',severity:'CRITICAL',passed:false,reason:'Malformed hand'}],
    approved: true,
    failureClass: 'NONE'
  };
  assert.equal(isQCFailClosed(report), false);
});

test('no evidence cannot promote an action', () => {
  const result = classifyCapabilityEvidence('PICK_UP', 'BOTTLE', []);
  assert.equal(result.classification, 'UNTESTED');
  assert.ok(result.reasons.includes('insufficient_real_observations:0<10'));
});

test('a single successful observation cannot promote an action', () => {
  const observation: BenchmarkObservation = {
    schemaVersion: SCHEMA_VERSION,
    observationId: 'observation-1',
    benchmarkCaseId: 'case-1',
    fixtureId: 'fixture-1',
    archetype: 'BOTTLE',
    actionId: 'PICK_UP',
    evidenceOrigin: 'REAL_MODEL_VIDEO',
    candidateAssetId: 'candidate-asset-1',
    reviewerId: 'reviewer-1',
    reviewedAt: '2026-09-06T00:00:00.000Z',
    dimensions: BENCHMARK_DIMENSIONS.map(dimension => ({dimension,passed:true,critical:true,notes:'Passed.'})),
    verdict: 'PASS',
    reviewerNotes: 'Policy test fixture; not persisted as empirical evidence.'
  };
  const result = classifyCapabilityEvidence('PICK_UP', 'BOTTLE', [observation]);
  assert.equal(result.classification, 'UNTESTED');
  assert.ok(result.reasons.includes('insufficient_real_observations:1<10'));
});
