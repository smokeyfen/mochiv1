import assert from 'node:assert/strict';
import test from 'node:test';
import type { VoiceSynthesisRequest } from './voice.ts';
import { SaydiBrowserVoiceProvider, createSaydiVoiceBindingRegistry, type SaydiBrowserDriver, type SaydiVoiceBinding } from './saydi-browser-voice.ts';
import { VoiceProviderError, validateVoiceSynthesisRequest } from './voice.ts';

const binding: SaydiVoiceBinding = {
  voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1',
  providerVoiceId: 'unbound-test-voice',
  providerVoiceName: 'test-only',
  language: 'vi-VN',
  voiceGender: 'FEMALE',
  voiceRegion: 'SOUTH',
  voiceStyle: 'review',
  synthesisSettings: { speed: 1 }
};
const request: VoiceSynthesisRequest = {
  text: 'Sản phẩm này có thiết kế nhỏ gọn.',
  voiceIdentityId: binding.voiceIdentityId,
  language: 'vi-VN',
  voiceGender: 'FEMALE',
  voiceRegion: 'SOUTH',
  voiceStyle: 'review'
};

function validDriver(calls: { value: number }): SaydiBrowserDriver {
  return { async synthesize() { calls.value += 1; return { audioFormat: 'WAV', measuredDurationMs: 1234, sha256: 'a'.repeat(64), runtimeArtifactRef: 'runtime://test.wav' }; } };
}

test('generic voice request has no Saydi-specific field and validates provider-neutral identity metadata', () => {
  assert.equal('providerVoiceId' in request, false);
  assert.equal('browserSelector' in request, false);
  assert.doesNotThrow(() => validateVoiceSynthesisRequest(request));
  assert.throws(() => validateVoiceSynthesisRequest({ ...request, voiceIdentityId: '' }), (error: unknown) => error instanceof VoiceProviderError && error.code === 'INVALID_REQUEST');
  for (const retired of [
    { ...request, voiceIdentityId: 'VN_FEMALE_NORTH_REVIEW_V1', voiceRegion: 'NORTH' as const },
    { ...request, voiceIdentityId: 'VN_MALE_NORTH_REVIEW_V1', voiceGender: 'MALE' as const, voiceRegion: 'NORTH' as const },
    { ...request, voiceStyle: 'warm' }
  ]) assert.throws(() => validateVoiceSynthesisRequest(retired), (error: unknown) => error instanceof VoiceProviderError && error.code === 'INVALID_REQUEST');
});

test('Saydi boundary forwards only the explicitly bound voice and returns a generic synthesis result', async () => {
  const calls = { value: 0 };
  const provider = new SaydiBrowserVoiceProvider([binding], validDriver(calls));
  const result = await provider.synthesize(request);
  assert.equal(calls.value, 1);
  assert.deepEqual(result, { voiceIdentityId: request.voiceIdentityId, audioFormat: 'WAV', measuredDurationMs: 1234, sha256: 'a'.repeat(64), runtimeArtifactRef: 'runtime://test.wav' });
  assert.equal('providerVoiceId' in result, false);
});

test('Saydi binding registry rejects unsupported and contradictory V1 identity metadata before any driver call', () => {
  const calls = { value: 0 };
  const driver = validDriver(calls);
  for (const inconsistent of [
    { ...binding, voiceIdentityId: 'VN_UNKNOWN_REVIEW_V1' },
    { ...binding, voiceGender: 'MALE' as const },
    { ...binding, voiceRegion: 'NORTH' as const },
    { ...binding, voiceStyle: 'warm' },
    { ...binding, providerVoiceId: '' }
  ]) assert.throws(() => new SaydiBrowserVoiceProvider([inconsistent], driver), (error: unknown) => error instanceof VoiceProviderError && error.code === 'VOICE_IDENTITY_UNSUPPORTED');
  assert.throws(() => createSaydiVoiceBindingRegistry([binding, { ...binding, providerVoiceId: 'changed-physical-voice' }]), (error: unknown) => error instanceof VoiceProviderError && error.code === 'VOICE_IDENTITY_UNSUPPORTED');
  assert.equal(calls.value, 0);
});

test('unknown and retired V1 requests fail before the browser driver is invoked', async () => {
  const calls = { value: 0 };
  const provider = new SaydiBrowserVoiceProvider([binding], validDriver(calls));
  await assert.rejects(() => provider.synthesize({ ...request, voiceIdentityId: 'VN_MALE_SOUTH_REVIEW_V1', voiceGender: 'MALE' }), (error: unknown) => error instanceof VoiceProviderError && error.code === 'VOICE_BINDING_MISSING');
  await assert.rejects(() => provider.synthesize({ ...request, voiceIdentityId: 'VN_FEMALE_NORTH_REVIEW_V1', voiceRegion: 'NORTH' }), (error: unknown) => error instanceof VoiceProviderError && error.code === 'INVALID_REQUEST');
  assert.equal(calls.value, 0);
});

test('malformed driver audio output fails closed, including non-SHA-256 values', async () => {
  for (const sha256 of ['a'.repeat(63), 'g'.repeat(64), '']) {
    const provider = new SaydiBrowserVoiceProvider([binding], { async synthesize() { return { audioFormat: 'WAV', measuredDurationMs: 1234, sha256, runtimeArtifactRef: 'runtime://malformed.wav' }; } });
    await assert.rejects(() => provider.synthesize(request), (error: unknown) => error instanceof VoiceProviderError && error.code === 'INVALID_AUDIO_RESULT');
  }
  const malformed = new SaydiBrowserVoiceProvider([binding], { async synthesize() { return { audioFormat: 'MP3' as any, measuredDurationMs: 0, sha256: 'a'.repeat(64), runtimeArtifactRef: '' }; } });
  await assert.rejects(() => malformed.synthesize(request), (error: unknown) => error instanceof VoiceProviderError && error.code === 'INVALID_AUDIO_RESULT');
});

test('browser failures are normalized without provider runtime detail', async () => {
  const failure = new SaydiBrowserVoiceProvider([binding], { async synthesize() { throw new Error('secret transport detail'); } });
  await assert.rejects(() => failure.synthesize(request), (error: unknown) => error instanceof VoiceProviderError && error.code === 'SYNTHESIS_FAILED' && !error.message.includes('secret'));
});
