import type { AssetRef, BenchmarkCase, GoldenProductFixture, ScenePlan } from '@mochi/contracts';
import { SCHEMA_VERSION } from '@mochi/contracts';

export const F0_CANOONICAL_FIXTURE_ID = 'f0-cocoon-turmeric-serum-bottle-v1';
export const F0_CANONICAL_REFERENCE_ASSET_ID = 'f0-cocoon-reference-01';

const canonicalReference: AssetRef = {
  schemaVersion: SCHEMA_VERSION,
  assetId: F0_CANONICAL_REFERENCE_ASSET_ID,
  role: 'PRODUCT_REFERENCE',
  source: 'UPLOAD',
  mimeType: 'image/png',
  sha256: 'B7F37371347DDC981973A8724A67D1BB6D0DF37A7AAD705452FB8C678D6EF510'
};

export const f0CocoonTurmericSerumFixture: GoldenProductFixture = {
  schemaVersion: SCHEMA_VERSION,
  fixtureId: F0_CANOONICAL_FIXTURE_ID,
  archetype: 'BOTTLE',
  productTruth: {
    verificationStatus: 'VERIFIED',
    productId: 'f0-cocoon-turmeric-serum',
    name: 'Cocoon Hưng Yên Turmeric Serum',
    identityDescription: 'Transparent amber-orange cylindrical serum bottle with a black dropper cap, white rectangular front label, and Cocoon Original Vietnam branding. The front label identifies the product as Hưng Yên Turmeric Serum. The bottle is small enough for one-hand handling.',
    allowedClaims: [],
    prohibitedInferences: [
      'Do not infer efficacy, brightening, dark-spot, antioxidant, sunscreen, treatment, or other marketing claims.',
      'Do not infer ingredient concentration or ingredient-performance claims.',
      'Do not infer clinical validation, durability, or dispensing behavior.'
    ]
  },
  expectedReferenceRoles: ['PRODUCT_REFERENCE'],
  referenceAssets: [canonicalReference],
  physicalRiskNotes: [
    'Grip bottle body, not dropper bulb.',
    'Keep dropper and cap assembled and closed.',
    'Do not dispense liquid.',
    'Do not squeeze or deform bottle.',
    'Use one-hand actions only for baseline.',
    'No secondary props required.'
  ]
};

const neutralBenchmarkDialogue = 'Benchmark-only visual action; no audio generation requirement.';
const commonInvariants = [
  'canonical Cocoon bottle identity remains recognizable',
  'amber-orange transparent cylindrical body preserved',
  'black dropper preserved',
  'white front label identity preserved',
  'exactly one plausible right hand',
  'no visible face',
  'no fused or duplicated fingers',
  'no hand/product penetration',
  'no bottle deformation',
  'no cap removal',
  'no dispensing',
  'no teleportation',
  'no unexplained cut/reset',
  'product remains physically plausible',
  'smartphone/POV presentation remains usable'
] as const;

const pickUpScene: ScenePlan = {
  schemaVersion: SCHEMA_VERSION,
  sceneId: 'f0-cocoon-pick-up-scene-v1',
  index: 1,
  role: 'HOOK',
  durationSeconds: 8,
  aspectRatio: '9:16',
  primaryObjective: 'One right hand picks up the closed serum bottle by its body and establishes a stable hold.',
  dialogue: neutralBenchmarkDialogue,
  startState: { productState: { dropper: 'ATTACHED', cap: 'CLOSED' }, propState: {}, heldBy: 'NONE', productOrientation: 'FRONT_LABEL_TOWARD_CAMERA', productPosition: 'UPRIGHT_ON_NEUTRAL_TABLETOP' },
  actions: [{ action: 'PICK_UP', objective: 'Grip the bottle body with the right hand and lift it clear of the tabletop.', complexity: 1 }],
  endState: { productState: { dropper: 'ATTACHED', cap: 'CLOSED' }, propState: {}, heldBy: 'RIGHT_HAND', productOrientation: 'UPRIGHT', productPosition: 'CENTERED_IN_FRAME' },
  requiredAssetIds: [F0_CANONICAL_REFERENCE_ASSET_ID]
};

const holdScene: ScenePlan = {
  schemaVersion: SCHEMA_VERSION,
  sceneId: 'f0-cocoon-hold-scene-v1',
  index: 1,
  role: 'HOOK',
  durationSeconds: 8,
  aspectRatio: '9:16',
  primaryObjective: 'One right hand maintains a stable, natural upright hold of the closed serum bottle.',
  dialogue: neutralBenchmarkDialogue,
  startState: { productState: { dropper: 'ATTACHED', cap: 'CLOSED' }, propState: {}, heldBy: 'RIGHT_HAND', productOrientation: 'FRONT_LABEL_GENERALLY_VISIBLE', productPosition: 'CENTERED_IN_FRAME' },
  actions: [{ action: 'HOLD', objective: 'Maintain a stable one-hand hold with only natural micro-motion.', complexity: 1 }],
  endState: { productState: { dropper: 'ATTACHED', cap: 'CLOSED' }, propState: {}, heldBy: 'RIGHT_HAND', productOrientation: 'UPRIGHT', productPosition: 'CENTERED_IN_FRAME' },
  requiredAssetIds: [F0_CANONICAL_REFERENCE_ASSET_ID]
};

const rotateSlowScene: ScenePlan = {
  schemaVersion: SCHEMA_VERSION,
  sceneId: 'f0-cocoon-rotate-slow-scene-v1',
  index: 1,
  role: 'HOOK',
  durationSeconds: 8,
  aspectRatio: '9:16',
  primaryObjective: 'One right hand slowly rotates the closed serum bottle around its vertical axis.',
  dialogue: neutralBenchmarkDialogue,
  startState: { productState: { dropper: 'ATTACHED', cap: 'CLOSED' }, propState: {}, heldBy: 'RIGHT_HAND', productOrientation: 'FRONT_LABEL_TOWARD_CAMERA', productPosition: 'CENTERED_IN_FRAME' },
  actions: [{ action: 'ROTATE_SLOW', objective: 'Rotate the bottle body 30 to 45 degrees without twisting the attached dropper cap.', complexity: 1 }],
  endState: { productState: { dropper: 'ATTACHED', cap: 'CLOSED' }, propState: {}, heldBy: 'RIGHT_HAND', productOrientation: 'THREE_QUARTER_SIDE', productPosition: 'CENTERED_IN_FRAME' },
  requiredAssetIds: [F0_CANONICAL_REFERENCE_ASSET_ID]
};

export const f0BaselineScenePlans: readonly ScenePlan[] = [pickUpScene, holdScene, rotateSlowScene];

export const f0BaselineBenchmarkCases: readonly BenchmarkCase[] = [
  { schemaVersion: SCHEMA_VERSION, benchmarkCaseId: 'f0-cocoon-pick-up-v1', fixtureId: F0_CANOONICAL_FIXTURE_ID, actionId: 'PICK_UP', sceneContractId: pickUpScene.sceneId, providerTarget: 'GOOGLE_FLOW', modelTarget: 'OMNI_FLASH_1_1', expectedInvariants: [...commonInvariants, 'PICK_UP reaches a complete stable one-hand hold clear of the tabletop'], attemptNumber: 1 },
  { schemaVersion: SCHEMA_VERSION, benchmarkCaseId: 'f0-cocoon-hold-v1', fixtureId: F0_CANOONICAL_FIXTURE_ID, actionId: 'HOLD', sceneContractId: holdScene.sceneId, providerTarget: 'GOOGLE_FLOW', modelTarget: 'OMNI_FLASH_1_1', expectedInvariants: [...commonInvariants, 'HOLD ends in the same stable upright one-hand hold'], attemptNumber: 1 },
  { schemaVersion: SCHEMA_VERSION, benchmarkCaseId: 'f0-cocoon-rotate-slow-v1', fixtureId: F0_CANOONICAL_FIXTURE_ID, actionId: 'ROTATE_SLOW', sceneContractId: rotateSlowScene.sceneId, providerTarget: 'GOOGLE_FLOW', modelTarget: 'OMNI_FLASH_1_1', expectedInvariants: [...commonInvariants, 'ROTATE_SLOW ends with an upright identifiable three-quarter side orientation'], attemptNumber: 1 }
];
