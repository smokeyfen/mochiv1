import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { measureWavDurationMs, SaydiSingleFlight, validateDownloadedWav } from './saydi-playwright-driver.ts';

function wav(dataSize = 16000): Buffer {
  const bytes = Buffer.alloc(44 + dataSize);
  bytes.write('RIFF', 0, 'ascii');
  bytes.writeUInt32LE(36 + dataSize, 4);
  bytes.write('WAVE', 8, 'ascii');
  bytes.write('fmt ', 12, 'ascii');
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24);
  bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36, 'ascii');
  bytes.writeUInt32LE(dataSize, 40);
  return bytes;
}

test('WAV validation measures duration from RIFF structure and calculates a full SHA-256', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mochi-saydi-test-'));
  const path = join(directory, 'valid.wav');
  await writeFile(path, wav());
  const result = await validateDownloadedWav(path);
  assert.equal(result.measuredDurationMs, 1000);
  assert.match(result.sha256, /^[a-f0-9]{64}$/u);
  assert.equal(result.fileSize, 16044);
});

test('invalid and truncated non-WAV data fails closed', () => {
  assert.throws(() => measureWavDurationMs(Buffer.from('not-a-wave')));
  const truncated = wav();
  truncated.writeUInt32LE(999999, 40);
  assert.throws(() => measureWavDurationMs(truncated));
});

test('the browser driver gate rejects parallel work and releases after completion', async () => {
  const gate = new SaydiSingleFlight();
  let resolveFirst: (() => void) | undefined;
  const first = gate.run(() => new Promise<void>(resolve => { resolveFirst = resolve; }));
  await assert.rejects(() => gate.run(async () => undefined), /SAYDI_BROWSER_DRIVER_BUSY/u);
  resolveFirst!();
  await first;
  await assert.doesNotReject(() => gate.run(async () => undefined));
});
