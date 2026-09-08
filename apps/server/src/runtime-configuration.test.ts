import assert from 'node:assert/strict';
import test from 'node:test';
import { RuntimeConfiguration } from './runtime-configuration.ts';

test('runtime configuration exposes only safe Gemini status and clears the in-memory provider', () => {
  const runtime = new RuntimeConfiguration();
  assert.equal(runtime.status(), 'GEMINI_NOT_CONFIGURED');
  assert.equal(Object.keys(runtime).length, 0);
  assert.equal(runtime.connect('browser-only-secret'), 'GEMINI_READY');
  assert.equal(runtime.status(), 'GEMINI_READY');
  assert.equal(runtime.provider()?.id, 'gemini-3-5-flash-lite-intelligence');
  assert.equal(JSON.stringify({ status: runtime.status() }).includes('browser-only-secret'), false);
  assert.equal(runtime.disconnect(), 'GEMINI_NOT_CONFIGURED');
  assert.equal(runtime.provider(), undefined);
});
