import assert from 'node:assert/strict';
import test from 'node:test';
import { createUntestedActionCapabilityMap } from '@mochi/core';
import { getCurrentTrustedCapabilityMap, getCurrentTrustedProductionEligibilityPolicy, runPreF1Live } from './pre-f1-live-runner.ts';

const configuredEnvironment: NodeJS.ProcessEnv = {
  PRE_F1_LIVE: '1',
  PRE_F1_LIVE_MANIFEST: 'explicit-manifest.json',
  PRE_F1_SNAPSHOT_STORAGE_ROOT: 'explicit-snapshot-root',
  GEMINI_API_KEY: 'configured-but-never-read'
};

test('current PRE-F1 trust sources keep empirical UNTESTED distinct from V1 production authorization', () => {
  assert.deepEqual(getCurrentTrustedCapabilityMap(), createUntestedActionCapabilityMap());
  assert.deepEqual(getCurrentTrustedProductionEligibilityPolicy().authorizedActionIds, ['PICK_UP', 'HOLD', 'ROTATE_SLOW']);
});

test('missing live prerequisites block by environment without consulting a capability or provider source', async () => {
  let capabilityReads = 0;
  let providerCreations = 0;
  const result = await runPreF1Live({
    environment: {},
    getTrustedCapabilityMap: () => { capabilityReads += 1; return createUntestedActionCapabilityMap(); },
    createIntelligence: () => { providerCreations += 1; throw new Error('must not compose'); }
  });
  assert.deepEqual(result, { status: 'BLOCKED_BY_ENVIRONMENT', missingPrerequisites: ['PRE_F1_LIVE=1', 'GEMINI_API_KEY', 'PRE_F1_LIVE_MANIFEST', 'PRE_F1_SNAPSHOT_STORAGE_ROOT'] });
  assert.equal(capabilityReads, 0);
  assert.equal(providerCreations, 0);
});

test('configured all-UNTESTED empirical state proceeds to the trusted fast-track runtime path', async () => {
  const capabilityMap = createUntestedActionCapabilityMap();
  const before = structuredClone(capabilityMap);
  let manifestReads = 0;
  let mediaBuilds = 0;
  let providerCreations = 0;
  let storeCreations = 0;
  let runtimeCreations = 0;
  const result = await runPreF1Live({
    environment: configuredEnvironment,
    getTrustedCapabilityMap: () => capabilityMap,
    loadManifest: async () => { manifestReads += 1; throw new Error('expected test stop'); },
    prepareMedia: async () => { mediaBuilds += 1; throw new Error('must not build after manifest failure'); },
    createIntelligence: () => { providerCreations += 1; throw new Error('must not create Gemini'); },
    createSnapshotStore: () => { storeCreations += 1; throw new Error('must not construct P0'); },
    createRuntime: () => { runtimeCreations += 1; throw new Error('must not construct runtime'); }
  });
  assert.deepEqual(result, { status: 'FAIL', category: 'INPUT_OR_CONFIGURATION' });
  assert.equal(manifestReads, 1);
  assert.equal(mediaBuilds, 0);
  assert.equal(providerCreations, 0);
  assert.equal(storeCreations, 0);
  assert.equal(runtimeCreations, 0);
  assert.deepEqual(capabilityMap, before);
});

test('a manual capability environment value cannot replace the trusted empirical source', async () => {
  let providerCreations = 0;
  const result = await runPreF1Live({
    environment: { ...configuredEnvironment, PRE_F1_ACTION_CAPABILITY_MAP: '{"PICK_UP":"SAFE"}' },
    createIntelligence: () => { providerCreations += 1; throw new Error('must not compose'); }
  });
  assert.deepEqual(result, { status: 'FAIL', category: 'INPUT_OR_CONFIGURATION' });
  assert.equal(providerCreations, 0);
});
