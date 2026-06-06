import { useEffect, useRef } from 'react';
import {
  speakBreathPhase,
  stopBreathVoice,
  warmBreathVoice,
} from './breathVoice';

type PhaseKind = 'inhale' | 'hold' | 'exhale' | 'holdAfter' | 'idle';

export function useBreathVoiceGuide(
  enabled: boolean,
  flowActive: boolean,
  phaseKind: PhaseKind,
  phaseCountdown: number,
  phaseTotalSeconds: number,
  phaseSequence: number,
) {
  const lastVoiceSeqRef = useRef(0);

  useEffect(() => {
    if (enabled && flowActive) {
      warmBreathVoice();
    }
  }, [enabled, flowActive]);

  useEffect(() => {
    if (!enabled || !flowActive || phaseKind === 'idle' || phaseCountdown <= 0) return;
    if (phaseCountdown !== phaseTotalSeconds) return;
    if (phaseSequence === 0 || lastVoiceSeqRef.current === phaseSequence) return;

    lastVoiceSeqRef.current = phaseSequence;
    const leadMs = phaseSequence === 1 ? 520 : 380;
    const timer = setTimeout(() => {
      speakBreathPhase(phaseKind as 'inhale' | 'hold' | 'exhale' | 'holdAfter');
    }, leadMs);

    return () => clearTimeout(timer);
  }, [enabled, flowActive, phaseKind, phaseCountdown, phaseTotalSeconds, phaseSequence]);

  useEffect(() => {
    if (!flowActive) {
      lastVoiceSeqRef.current = 0;
      stopBreathVoice();
    }
  }, [flowActive]);

  useEffect(
    () => () => {
      stopBreathVoice();
    },
    [],
  );
}

export function stopBreathVoiceGuide() {
  stopBreathVoice();
}
