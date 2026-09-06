import type { BenchmarkObservation } from '@mochi/contracts';
import { RUBRIC_0_VERSION, SCHEMA_VERSION } from '@mochi/contracts';
import { F0_CANOONICAL_FIXTURE_ID } from './f0-canary-fixture';

/**
 * Recorded human-review evidence for the completed F0-A.2 attempt. This module
 * holds only provider-neutral logical evidence metadata, never video bytes or
 * Flow runtime/session identifiers.
 */
export const f0EmpiricalBenchmarkObservations: readonly BenchmarkObservation[] = [{
  schemaVersion: SCHEMA_VERSION,
  rubricVersion: RUBRIC_0_VERSION,
  observationId: 'f0-cocoon-pick-up-v1-attempt-01-review',
  benchmarkCaseId: 'f0-cocoon-pick-up-v1',
  fixtureId: F0_CANOONICAL_FIXTURE_ID,
  archetype: 'BOTTLE',
  actionId: 'PICK_UP',
  evidenceOrigin: 'REAL_MODEL_VIDEO',
  candidateAssetId: 'f0-cocoon-pick-up-v1-attempt-01-video',
  reviewerId: 'f0-human-reviewer',
  reviewedAt: '2026-09-06T09:26:26.153Z',
  dimensions: [
    {
      dimension: 'PRODUCT_FIDELITY', passed: true, critical: true,
      notes: 'Canonical Cocoon bottle remains recognizable across the generated sequence. Amber-orange cylindrical bottle, black attached dropper and white front label remain materially stable. No product substitution or major geometry drift was observed.'
    },
    {
      dimension: 'HAND_ANATOMY', passed: true, critical: true,
      notes: 'One right hand is visible during the interaction. Finger count, grip, joints and hand-to-bottle contact appear plausible. No fused or duplicated digits or hand-product penetration were observed.'
    },
    {
      dimension: 'ACTION_COMPLETION', passed: true, critical: true,
      notes: 'The right hand reaches the bottle body, establishes a grip and lifts the bottle fully clear of the tabletop. The scene ends with the bottle held in one hand.'
    },
    {
      dimension: 'PHYSICS', passed: true, critical: true,
      notes: 'Grip, lift and bottle motion are physically plausible. No teleportation, floating, impossible clipping, bottle deformation, cap removal or dispensing was observed.'
    },
    {
      dimension: 'CAMERA_REALISM', passed: true, critical: false,
      notes: 'The framing remains usable for the benchmark objective and preserves the intended simple smartphone-style product presentation. The result is somewhat studio-clean but does not contradict the physical action contract.'
    },
    {
      dimension: 'UNEXPECTED_CUTS', passed: true, critical: true,
      notes: 'The reviewer confirmed no unexpected cut, scene reset or discontinuity that breaks the PICK_UP action.'
    },
    {
      dimension: 'VISIBLE_ARTIFACTS', passed: true, critical: true,
      notes: 'No prominent generation artifact materially damages the product, hand, action readability or usability. Minor generated label-text variation does not prevent product identity recognition.'
    }
  ],
  verdict: 'PASS',
  reviewerNotes: 'F0 transfer canary passed. Visual result was judged attractive, realistic and smooth overall. Contact-sheet review and full-motion human review agreed. This observation is empirical evidence only and must not independently promote PICK_UP.'
}];
