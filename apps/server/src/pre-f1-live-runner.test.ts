import assert from 'node:assert/strict';
import test from 'node:test';
import { createUntestedActionCapabilityMap } from '@mochi/core';
import { runPreF1Live } from './pre-f1-live-runner.ts';

const configuredEnvironment: NodeJS.ProcessEnv = {
  PRE_F1_LIVE: '1',
  PRE_F1_LIVE_MANIFEST: 'explicit-manifest.json',
  PRE_F1_SNAPSHOT_STORAGE_ROOT: 'explicit-snapshot-root',
  GEMINI_API_KEY: 'configured-but-never-read'
};

test('PRE_F1_LIVE absent is NOT_RUN without consulting a capability or provider source', async () => {
  let capabilityReads = 0;
  let providerCreations = 0;
  const result = await runPreF1Live({
    environment: {},
    getTrustedCapabilityMap: () => { capabilityReads += 1; return createUntestedActionCapabilityMap(); },
    createIntelligence: () => { providerCreations += 1; throw new Error('must not compose'); }
  });
  assert.deepEqual(result, { status: 'NOT_RUN' });
  assert.equal(capabilityReads, 0);
  assert.equal(providerCreations, 0);
});

test('configured current all-UNTESTED capability state is BLOCKED before media, Gemini, runtime, or P0', async () => {
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
    loadManifest: async () => { manifestReads += 1; throw new Error('must not read'); },
    prepareMedia: async () => { mediaBuilds += 1; throw new Error('must not read media'); },
    createIntelligence: () => { providerCreations += 1; throw new Error('must not create Gemini'); },
    createSnapshotStore: () => { storeCreations += 1; throw new Error('must not construct P0'); },
    createRuntime: () => { runtimeCreations += 1; throw new Error('must not construct runtime'); }
  });
  assert.deepEqual(result, { status: 'BLOCKED' });
  assert.equal(manifestReads, 0);
  assert.equal(mediaBuilds, 0);
  assert.equal(providerCreations, 0);
  assert.equal(storeCreations, 0);
  assert.equal(runtimeCreations, 0);
  assert.deepEqual(capabilityMap, before);
});

test('a manual capability environment value cannot override the trusted all-UNTESTED map', async () => {
  let providerCreations = 0;
  const result = await runPreF1Live({
    environment: { ...configuredEnvironment, PRE_F1_ACTION_CAPABILITY_MAP: '{"PICK_UP":"SAFE"}' },
    createIntelligence: () => { providerCreations += 1; throw new Error('must not compose'); }
  });
  assert.deepEqual(result, { status: 'BLOCKED' });
  assert.equal(providerCreations, 0);
});
