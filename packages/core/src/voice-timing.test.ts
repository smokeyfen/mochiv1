import assert from 'node:assert/strict';
import test from 'node:test';
import type { VoiceTimingCalibrationKey, VoiceTimingCalibrationPolicy, VoiceTimingObservation } from '@mochi/contracts';
import { assertEmpiricalVoiceTimingProfile, assertVoiceTimingProfileForKey, buildVoiceTimingProfile, countVietnameseSpokenUnits, estimateDialogueDuration, isCanonicalV1ReviewVoiceKey, normalizeVietnameseSpokenText, resolveV1ReviewVoiceIdentity, validateVoiceTimingObservation, VoiceTimingError } from './index.ts';

const key: VoiceTimingCalibrationKey = { language: 'vi-VN', voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', voiceGender: 'FEMALE', voiceRegion: 'SOUTH', voiceStyle: 'review' };
const policy: VoiceTimingCalibrationPolicy = { targetSceneDurationMs: 8000, safetyMarginMs: 1000, minimumObservations: 4 };
const obs = (id: string, text: string, ms: number, calibrationKey = key, provenance: 'SYNTHETIC' | 'EMPIRICAL' = 'SYNTHETIC'): VoiceTimingObservation => ({ observationId: id, calibrationKey, normalizedText: normalizeVietnameseSpokenText(text), spokenUnitCount: countVietnameseSpokenUnits(text), measuredDurationMs: ms, provenance });
const samples = () => [obs('a', 'xin chào bạn', 1000), obs('b', 'xin chào bạn', 1500), obs('c', 'xin chào bạn', 2000), obs('d', 'xin chào bạn', 3000)];

test('Vietnamese spoken-unit normalization is deterministic and punctuation cannot create units', () => {
  const input = '  Xin,   chào!!!  bạn... ';
  assert.equal(normalizeVietnameseSpokenText(input), 'Xin chào bạn');
  assert.equal(normalizeVietnameseSpokenText(input), normalizeVietnameseSpokenText(input));
  assert.equal(countVietnameseSpokenUnits(input), 3);
  assert.equal(countVietnameseSpokenUnits('  ... !!!  '), 0);
});

test('T0 observation validation fails closed for invalid fields and duplicate IDs', () => {
  const invalid = { ...obs('', 'xin chào', 1000), spokenUnitCount: 99 };
  assert.throws(() => buildVoiceTimingProfile([invalid, obs('b', 'xin chào', 1000), obs('c', 'xin chào', 1000), obs('d', 'xin chào', 1000)], policy), (error: unknown) => error instanceof VoiceTimingError && error.code === 'INVALID_OBSERVATION');
  const duplicate = [obs('a', 'xin chào', 1000), obs('a', 'xin chào', 1100), obs('c', 'xin chào', 1200), obs('d', 'xin chào', 1300)];
  assert.throws(() => buildVoiceTimingProfile(duplicate, policy));
});

test('VOICE_TIMING_V2 requires a nonblank voice identity at runtime', () => {
  const missingIdentity = { ...key, voiceIdentityId: '' };
  const data = samples().map(item => ({ ...item, calibrationKey: missingIdentity }));
  assert.throws(() => buildVoiceTimingProfile(data, policy), (error: unknown) => error instanceof VoiceTimingError && error.code === 'INVALID_OBSERVATION');
});

test('T0 rejects mixed exact voice identity, language, insufficient samples, and invalid margins', () => {
  for (const changed of [{ ...key, voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V2' }, { ...key, voiceGender: 'MALE' as const }, { ...key, voiceRegion: 'NORTH' as const }, { ...key, voiceStyle: 'formal' }, { ...key, language: 'en-US' as any }]) {
    const data = samples();
    data[3] = { ...data[3]!, calibrationKey: changed };
    assert.throws(() => buildVoiceTimingProfile(data, policy), (error: unknown) => error instanceof VoiceTimingError);
  }
  assert.throws(() => buildVoiceTimingProfile(samples().slice(0, 3), policy));
  assert.throws(() => buildVoiceTimingProfile(samples(), { ...policy, safetyMarginMs: 8000 }));
});

test('T0 profile uses deterministic median and lower-quartile conservative rate', () => {
  const profile = buildVoiceTimingProfile(samples(), policy);
  assert.equal(profile.calibrationVersion, 'VOICE_TIMING_V2');
  assert.equal(profile.targetSceneDurationMs, 8000);
  assert.equal(profile.usableSpeechDurationMs, 7000);
  assert.equal(profile.medianUnitsPerSecond, 1.5);
  assert.equal(profile.conservativeUnitsPerSecond, 1);
  assert.equal(profile.recommendedMaxSpokenUnits, 7);
  assert.deepEqual(buildVoiceTimingProfile(samples(), policy), profile);
  assert.equal(profile.calibrationKey.voiceIdentityId, key.voiceIdentityId);
  assert.equal(['providerId', 'providerVoiceId', 'media', 'dataBase64', 'credential', 'executablePath'].some(field => field in profile), false);
});

test('T0 duration estimator preserves text and has deterministic FITS/TOO_LONG boundary', () => {
  const profile = buildVoiceTimingProfile(samples(), policy);
  const fits = estimateDialogueDuration('xin chào bạn bạn bạn bạn bạn', profile);
  const long = estimateDialogueDuration('xin chào bạn bạn bạn bạn bạn bạn', profile);
  assert.equal(fits.status, 'FITS');
  assert.equal(long.status, 'TOO_LONG');
  assert.equal(fits.normalizedText, 'xin chào bạn bạn bạn bạn bạn');
});

test('the four exact V1 review identities resolve deterministically and unsupported styles fail closed', () => {
  assert.equal(resolveV1ReviewVoiceIdentity('vi-VN', 'FEMALE', 'SOUTH', 'review'), 'VN_FEMALE_SOUTH_REVIEW_V1');
  assert.equal(resolveV1ReviewVoiceIdentity('vi-VN', 'FEMALE', 'NORTH', 'review'), 'VN_FEMALE_NORTH_REVIEW_V1');
  assert.equal(resolveV1ReviewVoiceIdentity('vi-VN', 'MALE', 'SOUTH', 'review'), 'VN_MALE_SOUTH_REVIEW_V1');
  assert.equal(resolveV1ReviewVoiceIdentity('vi-VN', 'MALE', 'NORTH', 'review'), 'VN_MALE_NORTH_REVIEW_V1');
  assert.throws(() => resolveV1ReviewVoiceIdentity('vi-VN', 'FEMALE', 'SOUTH', 'warm'), (error: unknown) => error instanceof VoiceTimingError && error.code === 'INVALID_POLICY');
});

test('canonical V1 voice keys require identity and metadata to correspond exactly', () => {
  const canonicalKeys: readonly VoiceTimingCalibrationKey[] = [
    { language: 'vi-VN', voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V1', voiceGender: 'FEMALE', voiceRegion: 'SOUTH', voiceStyle: 'review' },
    { language: 'vi-VN', voiceIdentityId: 'VN_FEMALE_NORTH_REVIEW_V1', voiceGender: 'FEMALE', voiceRegion: 'NORTH', voiceStyle: 'review' },
    { language: 'vi-VN', voiceIdentityId: 'VN_MALE_SOUTH_REVIEW_V1', voiceGender: 'MALE', voiceRegion: 'SOUTH', voiceStyle: 'review' },
    { language: 'vi-VN', voiceIdentityId: 'VN_MALE_NORTH_REVIEW_V1', voiceGender: 'MALE', voiceRegion: 'NORTH', voiceStyle: 'review' }
  ];
  for (const canonicalKey of canonicalKeys) assert.equal(isCanonicalV1ReviewVoiceKey(canonicalKey), true);
  for (const inconsistent of [
    { ...key, voiceIdentityId: 'VN_UNKNOWN_REVIEW_V1' },
    { ...key, voiceGender: 'MALE' as const },
    { ...key, voiceRegion: 'NORTH' as const },
    { ...key, voiceStyle: 'warm' },
    { ...key, language: 'en-US' as any }
  ]) {
    assert.equal(isCanonicalV1ReviewVoiceKey(inconsistent), false);
    assert.ok(validateVoiceTimingObservation(obs('inconsistent', 'xin chào bạn', 1000, inconsistent)).includes('voice_identity'));
  }
});
test('an empirical timing profile is bound to its exact immutable voice identity', () => {
  const empirical = buildVoiceTimingProfile(samples().map(item => ({ ...item, provenance: 'EMPIRICAL' as const })), policy);
  assert.doesNotThrow(() => assertEmpiricalVoiceTimingProfile(empirical));
  assert.doesNotThrow(() => assertVoiceTimingProfileForKey(empirical, key));
  assert.throws(() => assertVoiceTimingProfileForKey(empirical, { ...key, voiceIdentityId: 'VN_FEMALE_SOUTH_REVIEW_V2' }), (error: unknown) => error instanceof VoiceTimingError && error.code === 'INVALID_POLICY');
  assert.throws(() => assertEmpiricalVoiceTimingProfile({ ...empirical, calibrationKey: { ...empirical.calibrationKey, voiceIdentityId: '' } }), (error: unknown) => error instanceof VoiceTimingError && error.code === 'INVALID_POLICY');
  assert.throws(() => assertEmpiricalVoiceTimingProfile({ ...empirical, calibrationKey: { ...empirical.calibrationKey, voiceRegion: 'NORTH' } }), (error: unknown) => error instanceof VoiceTimingError && error.code === 'INVALID_POLICY');
});

test('synthetic profiles remain non-empirical for each V1 gender and region combination', () => {
  for (const gender of ['MALE', 'FEMALE'] as const) for (const region of ['SOUTH', 'NORTH'] as const) {
    const identity = resolveV1ReviewVoiceIdentity('vi-VN', gender, region, 'review');
    const profile = buildVoiceTimingProfile(samples().map(item => ({ ...item, calibrationKey: { ...key, voiceIdentityId: identity, voiceGender: gender, voiceRegion: region } })), policy);
    assert.equal(profile.calibrationKey.voiceGender, gender);
    assert.equal(profile.calibrationKey.voiceRegion, region);
    assert.throws(() => assertEmpiricalVoiceTimingProfile(profile), (error: unknown) => error instanceof VoiceTimingError && error.code === 'NOT_EMPIRICAL');
  }
});
