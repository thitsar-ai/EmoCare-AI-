import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  BREATH_SCALE,
  BREATH_TECHNIQUES,
  breathPhaseToUniform,
} from '../../utils/breathPatterns';
import {
  hapticBreathTransition,
  runBreathHapticRamp,
  runBreathHoldAmbient,
  runBreathHoldRipple,
} from '../../utils/breathHaptics';

const EASE = Easing.bezier(0.45, 0.05, 0.25, 1);

type BreathPhaseKind = 'idle' | 'inhale' | 'hold' | 'exhale' | 'holdAfter';

export function useBreathEngine(techniqueKey: string, onFlowChange: (active: boolean) => void) {
  const scale = useSharedValue(BREATH_SCALE.idle);
  const progress = useSharedValue(0);
  const phaseUniform = useSharedValue(0);
  const [phaseKind, setPhaseKind] = useState<BreathPhaseKind>('idle');
  const [flowActive, setFlowActive] = useState(false);

  const stepIndexRef = useRef(0);
  const hapticCleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  const flowActiveRef = useRef(false);

  const clearHaptics = useCallback(() => {
    hapticCleanupRef.current?.();
    hapticCleanupRef.current = null;
  }, []);

  const endSession = useCallback(() => {
    clearHaptics();
    cancelAnimation(progress);
    cancelAnimation(scale);
    stepIndexRef.current = 0;
    flowActiveRef.current = false;
    setFlowActive(false);
    setPhaseKind('idle');
    onFlowChange(false);
    progress.value = 0;
    phaseUniform.value = 0;
    scale.value = withTiming(BREATH_SCALE.idle, { duration: 600, easing: EASE });
  }, [clearHaptics, onFlowChange, phaseUniform, progress, scale]);

  const runStep = useCallback(
    (step: { phase: BreathPhaseKind; durationMs: number }, index: number, steps: typeof step[]) => {
      if (!mountedRef.current || !flowActiveRef.current) return;

      clearHaptics();
      setPhaseKind(step.phase);
      phaseUniform.value = breathPhaseToUniform(step.phase);
      progress.value = 0;

      const targetScale = BREATH_SCALE[step.phase as keyof typeof BREATH_SCALE] ?? BREATH_SCALE.idle;
      scale.value = withTiming(targetScale, {
        duration: step.durationMs,
        easing: EASE,
      });
      progress.value = withTiming(
        1,
        { duration: step.durationMs, easing: Easing.linear },
        (finished) => {
          if (!finished || !mountedRef.current || !flowActiveRef.current) return;
          runOnJS(hapticBreathTransition)();
          const next = (index + 1) % steps.length;
          stepIndexRef.current = next;
          runOnJS(runStep)(steps[next], next, steps);
        },
      );

      if (step.phase === 'inhale' || step.phase === 'exhale') {
        hapticCleanupRef.current = runBreathHapticRamp(step.phase, step.durationMs);
      } else if (step.phase === 'hold') {
        hapticCleanupRef.current = runBreathHoldAmbient();
      } else if (step.phase === 'holdAfter') {
        hapticCleanupRef.current = runBreathHoldRipple();
      }
    },
    [clearHaptics, phaseUniform, progress, scale],
  );

  const startSession = useCallback(() => {
    const technique = BREATH_TECHNIQUES[techniqueKey] ?? BREATH_TECHNIQUES.Box;
    if (!technique.steps.length) return;

    flowActiveRef.current = true;
    setFlowActive(true);
    onFlowChange(true);
    stepIndexRef.current = 0;
    void hapticBreathTransition();
    runStep(technique.steps[0], 0, technique.steps);
  }, [onFlowChange, runStep, techniqueKey]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      flowActiveRef.current = false;
      clearHaptics();
      cancelAnimation(progress);
      cancelAnimation(scale);
      onFlowChange(false);
    };
  }, [clearHaptics, onFlowChange, progress, scale]);

  return {
    scale,
    progress,
    phaseUniform,
    phaseKind,
    flowActive,
    startSession,
    endSession,
  };
}
