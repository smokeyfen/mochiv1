import type { GoldenProductFixture, ProductArchetype } from '@mochi/contracts';
import { SCHEMA_VERSION } from '@mochi/contracts';

const archetypes: readonly ProductArchetype[] = ['BOTTLE', 'TUBE', 'BOX', 'DEVICE', 'SOFT_PACKAGE'];

export const pendingGoldenFixtures: readonly GoldenProductFixture[] = archetypes.map(archetype => ({
  schemaVersion: SCHEMA_VERSION,
  fixtureId: `pending-${archetype.toLowerCase().replace('_', '-')}`,
  archetype,
  productTruth: {
    verificationStatus: 'PENDING_REAL_REFERENCES',
    allowedClaims: [],
    prohibitedInferences: ['Do not infer any product claim until real references and truth metadata are verified.']
  },
  expectedReferenceRoles: ['PRODUCT_REFERENCE'],
  referenceAssets: [],
  physicalRiskNotes: ['Physical interaction capability remains UNTESTED until real video evidence is reviewed.']
}));
