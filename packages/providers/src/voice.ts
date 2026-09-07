import { isCanonicalV1ReviewVoiceKey } from '@mochi/core';
import type { VoiceGender, VoiceIdentityId, VoiceRegion } from '@mochi/contracts';
export interface VoiceSynthesisRequest { readonly text:string; readonly voiceIdentityId:VoiceIdentityId; readonly language:'vi-VN'; readonly voiceGender:VoiceGender; readonly voiceRegion:VoiceRegion; readonly voiceStyle:string; }
export interface VoiceSynthesisResult { readonly voiceIdentityId:VoiceIdentityId; readonly audioFormat:'WAV'; readonly measuredDurationMs:number; readonly sha256:string; readonly runtimeArtifactRef:string; }
export interface VoiceProvider { readonly id:string; synthesize(request:VoiceSynthesisRequest):Promise<VoiceSynthesisResult>; }
export type VoiceProviderErrorCode='INVALID_REQUEST'|'VOICE_IDENTITY_UNSUPPORTED'|'VOICE_BINDING_MISSING'|'VOICE_BINDING_MISMATCH'|'SYNTHESIS_FAILED'|'INVALID_AUDIO_RESULT';
export class VoiceProviderError extends Error { readonly code:VoiceProviderErrorCode; constructor(code:VoiceProviderErrorCode){super(`VOICE_PROVIDER_ERROR:${code}`);this.code=code;} }
export function validateVoiceSynthesisRequest(request:VoiceSynthesisRequest):void{if(!request.text.trim()||!isCanonicalV1ReviewVoiceKey(request))throw new VoiceProviderError('INVALID_REQUEST');}
