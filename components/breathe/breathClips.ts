import type { AudioSource } from 'expo-audio';

/** Pre-recorded Emo clips — same ElevenLabs voice as Voice Talk. Regenerate with `npm run generate:breath-clips`. */
export const BREATH_CLIPS = {
  intro: require('../../assets/audio/breathe/intro.mp3') as AudioSource,
  phaseInhale: require('../../assets/audio/breathe/phase-breathe-in.mp3') as AudioSource,
  phaseHold: require('../../assets/audio/breathe/phase-hold.mp3') as AudioSource,
  phaseExhale: require('../../assets/audio/breathe/phase-breathe-out.mp3') as AudioSource,
  phaseRest: require('../../assets/audio/breathe/phase-rest.mp3') as AudioSource,
  count1: require('../../assets/audio/breathe/count-1.mp3') as AudioSource,
  count2: require('../../assets/audio/breathe/count-2.mp3') as AudioSource,
  count3: require('../../assets/audio/breathe/count-3.mp3') as AudioSource,
  count4: require('../../assets/audio/breathe/count-4.mp3') as AudioSource,
  count5: require('../../assets/audio/breathe/count-5.mp3') as AudioSource,
  count6: require('../../assets/audio/breathe/count-6.mp3') as AudioSource,
  count7: require('../../assets/audio/breathe/count-7.mp3') as AudioSource,
  count8: require('../../assets/audio/breathe/count-8.mp3') as AudioSource,
  wellDone: require('../../assets/audio/breathe/well-done.mp3') as AudioSource,
} as const;

const COUNT_CLIPS = [
  null,
  BREATH_CLIPS.count1,
  BREATH_CLIPS.count2,
  BREATH_CLIPS.count3,
  BREATH_CLIPS.count4,
  BREATH_CLIPS.count5,
  BREATH_CLIPS.count6,
  BREATH_CLIPS.count7,
  BREATH_CLIPS.count8,
] as const;

export function breathPhaseClip(phaseKind: 'inhale' | 'hold' | 'exhale' | 'holdAfter'): AudioSource {
  switch (phaseKind) {
    case 'inhale':
      return BREATH_CLIPS.phaseInhale;
    case 'hold':
      return BREATH_CLIPS.phaseHold;
    case 'exhale':
      return BREATH_CLIPS.phaseExhale;
    case 'holdAfter':
      return BREATH_CLIPS.phaseRest;
  }
}

export function breathCountClip(count: number): AudioSource | null {
  if (count < 1 || count > 8) return null;
  return COUNT_CLIPS[count];
}
