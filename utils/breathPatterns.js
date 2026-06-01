/** @typedef {'inhale' | 'hold' | 'exhale' | 'holdAfter'} BreathPhaseKind */

/**
 * @typedef {{ phase: BreathPhaseKind; durationMs: number }} BreathStep
 * @typedef {{ label: string; subtitle: string; steps: BreathStep[] }} BreathTechnique
 */

/** @type {Record<string, BreathTechnique>} */
export const BREATH_TECHNIQUES = {
  Box: {
    label: 'Box',
    subtitle: 'Inhale · 4  ·  Hold · 4  ·  Exhale · 4  ·  Hold · 4',
    steps: [
      { phase: 'inhale', durationMs: 4000 },
      { phase: 'hold', durationMs: 4000 },
      { phase: 'exhale', durationMs: 4000 },
      { phase: 'holdAfter', durationMs: 4000 },
    ],
  },
  '4-7-8': {
    label: '4-7-8',
    subtitle: 'Inhale · 4  ·  Hold · 7  ·  Exhale · 8',
    steps: [
      { phase: 'inhale', durationMs: 4000 },
      { phase: 'hold', durationMs: 7000 },
      { phase: 'exhale', durationMs: 8000 },
    ],
  },
  Calm: {
    label: 'Calm',
    subtitle: 'Inhale · 4  ·  Hold · 2  ·  Exhale · 6  ·  Rest · 2',
    steps: [
      { phase: 'inhale', durationMs: 4000 },
      { phase: 'hold', durationMs: 2000 },
      { phase: 'exhale', durationMs: 6000 },
      { phase: 'holdAfter', durationMs: 2000 },
    ],
  },
};

/** @type {Record<BreathPhaseKind | 'idle', string>} */
export const BREATH_COPY = {
  idle: 'Tap to begin',
  inhale: 'Fill your lungs...',
  hold: 'Rest in stillness...',
  exhale: 'Let it all go...',
  holdAfter: 'Rest in stillness...',
};

/** Target scale multipliers for the morphing core. */
export const BREATH_SCALE = {
  idle: 0.88,
  inhale: 1.2,
  hold: 1.2,
  exhale: 0.7,
  holdAfter: 0.7,
};

/** Curated presets for the breathe screen carousel. */
export const BREATH_PRESETS = [
  {
    id: 'calm-reset',
    title: 'Calm reset',
    subtitle: 'Gentle rhythm to settle your nervous system',
    techniqueKey: 'Calm',
    gradient: ['#5B4B8A', '#3D6B7A'],
  },
  {
    id: 'anxiety-relief',
    title: 'Anxiety relief',
    subtitle: 'Extended exhale to quiet racing thoughts',
    techniqueKey: '4-7-8',
    gradient: ['#6B52A8', '#4A6FA5'],
  },
  {
    id: 'sleep',
    title: 'Sleep',
    subtitle: 'Slow breaths to drift toward rest',
    techniqueKey: '4-7-8',
    gradient: ['#3D3560', '#2A4A6B'],
  },
  {
    id: 'panic-grounding',
    title: 'Panic grounding',
    subtitle: 'Steady box rhythm to anchor the moment',
    techniqueKey: 'Box',
    gradient: ['#7A5C9E', '#4E5A8A'],
  },
];

/** Skia phase uniform: 0 inhale, 1 hold, 2 exhale, 3 holdAfter */
export function breathPhaseToUniform(phase) {
  switch (phase) {
    case 'inhale':
      return 0;
    case 'hold':
      return 1;
    case 'exhale':
      return 2;
    case 'holdAfter':
      return 3;
    default:
      return 0;
  }
}
