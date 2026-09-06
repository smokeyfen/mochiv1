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

test('generic voice request has no Saydi-specific field and validates provider-neutral identity metadata', () => {
  assert.equal('providerVoiceId' in request, false);
  assert.equal('browserSelector' in request, false);
  assert.doesNotThrow(() => validateVoiceSynthesisRequest(request));
  assert.throws(() => validateVoiceSynthesisRequest({ ...request, voiceIdentityId: '' }), (error: unknown) => error instanceof VoiceProviderError && error.code === 'INVALID_REQUEST');
});

test('Saydi boundary forwards only the explicitly bound voice and returns a generic synthesis result', async () => {
  let calls = 0;
  const driver: SaydiBrowserDriver = { async synthesize(receivedBinding, text) {
    calls += 1;
    assert.equal(receivedBinding.providerVoiceId, binding.providerVoiceId);
    assert.equal(text, request.text);
    return { audioFormat: 'WAV', measuredDurationMs: 1234, sha256: 'a'.repeat(64), runtimeArtifactRef: 'runtime://test.wav' };
  } };
  const provider = new SaydiBrowserVoiceProvider([binding], driver);
  const result = await provider.synthesize(request);
  assert.equal(calls, 1);
  assert.deepEqual(result, { voiceIdentityId: request.voiceIdentityId, audioFormat: 'WAV', measuredDurationMs: 1234, sha256: 'a'.repeat(64), runtimeArtifactRef: 'runtime://test.wav' });
  assert.equal('providerVoiceId' in result, false);
});

test('Saydi binding registry fails closed for unsupported, malformed, and duplicate physical bindings', () => {
  assert.throws(() => createSaydiVoiceBindingRegistry([{ ...binding, voiceIdentityId: 'VN_UNKNOWN_REVIEW_V1' }]), (error: unknown) => error instanceof VoiceProviderError && error.code === 'VOICE_IDENTITY_UNSUPPORTED');
  assert.throws(() => createSaydiVoiceBindingRegistry([{ ...binding, providerVoiceId: '' }]), (error: unknown) => error instanceof VoiceProviderError && error.code === 'VOICE_IDENTITY_UNSUPPORTED');
  assert.throws(() => createSaydiVoiceBindingRegistry([binding, { ...binding, providerVoiceId: 'changed-physical-voice' }]), (error: unknown) => error instanceof VoiceProviderError && error.code === 'VOICE_IDENTITY_UNSUPPORTED');
});

test('unknown and mismatched requests fail before the browser driver is invoked', async () => {
  let calls = 0;
  const driver: SaydiBrowserDriver = { async synthesize() { calls += 1; return { audioFormat: 'WAV', measuredDurationMs: 1000, sha256: 'b'.repeat(64), runtimeArtifactRef: 'runtime://unused.wav' }; } };
  const provider = new SaydiBrowserVoiceProvider([binding], driver);
  await assert.rejects(() => provider.synthesize({ ...request, voiceIdentityId: 'VN_MALE_SOUTH_REVIEW_V1', voiceGender: 'MALE' }), (error: unknown) => error instanceof VoiceProviderError && error.code === 'VOICE_BINDING_MISSING');
  await assert.rejects(() => provider.synthesize({ ...request, voiceRegion: 'NORTH' }), (error: unknown) => error instanceof VoiceProviderError && error.code === 'VOICE_BINDING_MISMATCH');
  assert.equal(calls, 0);
});

test('browser failures and malformed driver output are normalized without provider runtime detail', async () => {
  const failure = new SaydiBrowserVoiceProvider([binding], { async synthesize() { throw new Error('secret transport detail'); } });
  await assert.rejects(() => failure.synthesize(request), (error: unknown) => error instanceof VoiceProviderError && error.code === 'SYNTHESIS_FAILED' && !error.message.includes('secret'));
  const malformed = new SaydiBrowserVoiceProvider([binding], { async synthesize() { return { audioFormat: 'WAV', measuredDurationMs: 0, sha256: '', runtimeArtifactRef: '' }; } });
  await assert.rejects(() => malformed.synthesize(request), (error: unknown) => error instanceof VoiceProviderError && error.code === 'INVALID_AUDIO_RESULT');
});
