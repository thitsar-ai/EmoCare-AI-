import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { BREATH_PHASE_LABELS } from '../../utils/breathPatterns';
import { speakAloud, stopSpeaking } from '../voice/voiceTts';
import { breathPhaseClip } from './breathClips';
import {
  playBreathClip,
  prepareBreathVoice,
  releaseBreathVoice,
  stopBreathClips,
} from './breathClipPlayer';

type BreathPhase = keyof typeof BREATH_PHASE_LABELS;

function isIosSimulator(): boolean {
  return Platform.OS === 'ios' && Constants.isDevice === false;
}

export function warmBreathVoice(): void {
  void prepareBreathVoice();
}

/**
 * Pre-recorded Emo clips — same voice as Voice Talk, no live fetch per cue.
 * Live ElevenLabs is only used as fallback if a clip fails to load.
 */
export function speakBreathPhase(phase: BreathPhase): void {
  if (Platform.OS === 'web') return;

  const text = BREATH_PHASE_LABELS[phase];
  if (!text) return;

  let liveFallbackUsed = false;
  const tryLiveEmo = () => {
    if (liveFallbackUsed || isIosSimulator()) return;
    liveFallbackUsed = true;
    void speakAloud(text, { restoreRecordMode: false, sanctuarySession: true });
  };

  void playBreathClip(breathPhaseClip(phase)).catch((err) => {
    if (__DEV__) console.warn('[Breath voice] clip failed, trying live Emo:', err);
    tryLiveEmo();
  });
}

export function stopBreathVoice(): void {
  stopBreathClips();
  stopSpeaking();
}

export function releaseBreathVoiceSession(): void {
  releaseBreathVoice();
  stopSpeaking();
}
