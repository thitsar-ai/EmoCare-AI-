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
  Resonance: {
    label: '5-5',
    subtitle: 'Inhale · 5  ·  Exhale · 5',
    steps: [
      { phase: 'inhale', durationMs: 5000 },
      { phase: 'exhale', durationMs: 5000 },
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

/** Short labels for countdown UI and voice cues. */
export const BREATH_PHASE_LABELS = {
  inhale: 'Breathe in',
  hold: 'Hold',
  exhale: 'Breathe out',
  holdAfter: 'Rest',
};

/** Target scale multipliers for the morphing core. */
export const BREATH_SCALE = {
  idle: 0.88,
  inhale: 1.2,
  hold: 1.2,
  exhale: 0.7,
  holdAfter: 0.7,
};

/**
 * Outcome-led session presets (intent over clinical labels).
 * Patterns follow evidence-backed protocols: extended exhale (parasympathetic),
 * box breathing (grounding/focus), 4-7-8 (Weil relaxation), 5-5 resonance (HRV).
 */
export const BREATH_PRESETS = [
  {
    id: 'settle',
    title: 'Settle',
    subtitle: 'Long exhale to soften tension',
    patternLabel: '4 · 2 · 6 · 2',
    durationLabel: '~4 min',
    techniqueKey: 'Calm',
    accent: '#9B8AE8',
  },
  {
    id: 'release',
    title: 'Release',
    subtitle: 'Slow the breath, quiet racing thoughts',
    patternLabel: '4 · 7 · 8',
    durationLabel: '~5 min',
    techniqueKey: '4-7-8',
    accent: '#6ECFC0',
  },
  {
    id: 'drift',
    title: 'Drift',
    subtitle: 'Wind down toward restful sleep',
    patternLabel: '4 · 7 · 8',
    durationLabel: '~5 min',
    techniqueKey: '4-7-8',
    accent: '#7B9FD4',
  },
  {
    id: 'anchor',
    title: 'Anchor',
    subtitle: 'Steady rhythm when you feel overwhelmed',
    patternLabel: '4 · 4 · 4 · 4',
    durationLabel: '~5 min',
    techniqueKey: 'Box',
    accent: '#B79DFF',
  },
  {
    id: 'balance',
    title: 'Balance',
    subtitle: 'Even rhythm for focus and calm clarity',
    patternLabel: '5 · 5',
    durationLabel: '~4 min',
    techniqueKey: 'Resonance',
    accent: '#C4A8FF',
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
