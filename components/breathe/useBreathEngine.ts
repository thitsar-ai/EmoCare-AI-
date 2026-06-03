import { useCallback, useEffect, useRef, useState } from 'react';
import { BREATH_TECHNIQUES } from '../../utils/breathPatterns';

type BreathPhaseKind = 'idle' | 'inhale' | 'hold' | 'exhale' | 'holdAfter';
type BreathStep = { phase: BreathPhaseKind; durationMs: number };

const PROGRESS_TICK_MS = 250;

export function useBreathEngine(
  techniqueKey: string,
  sessionDurationSec: number,
  onFlowChange: (active: boolean) => void,
) {
  const [ringProgress, setRingProgress] = useState(0);
  const [phaseKind, setPhaseKind] = useState<BreathPhaseKind>('idle');
  const [flowActive, setFlowActive] = useState(false);
  const [phaseCountdown, setPhaseCountdown] = useState(0);
  const [phaseTotalSeconds, setPhaseTotalSeconds] = useState(0);
  const [phaseSequence, setPhaseSequence] = useState(0);
  const [sessionRemainingSec, setSessionRemainingSec] = useState(sessionDurationSec);

  const stepIndexRef = useRef(0);
  const phaseCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const flowActiveRef = useRef(false);
  const sessionDurationRef = useRef(sessionDurationSec);
  const runStepRef = useRef<(step: BreathStep, index: number, steps: BreathStep[]) => void>(() => {});

  sessionDurationRef.current = sessionDurationSec;

  const clearTimers = useCallback(() => {
    if (phaseCountdownRef.current) {
      clearInterval(phaseCountdownRef.current);
      phaseCountdownRef.current = null;
    }
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (progressTickRef.current) {
      clearInterval(progressTickRef.current);
      progressTickRef.current = null;
    }
    if (phaseTimeoutRef.current) {
      clearTimeout(phaseTimeoutRef.current);
      phaseTimeoutRef.current = null;
    }
  }, []);

  const advanceStep = useCallback((index: number, steps: BreathStep[]) => {
    if (!mountedRef.current || !flowActiveRef.current) return;
    const next = (index + 1) % steps.length;
    stepIndexRef.current = next;
    runStepRef.current(steps[next], next, steps);
  }, []);

  const advanceStepRef = useRef(advanceStep);
  advanceStepRef.current = advanceStep;

  const runStep = useCallback(
    (step: BreathStep, index: number, steps: BreathStep[]) => {
      if (!mountedRef.current || !flowActiveRef.current) return;

      if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
      if (progressTickRef.current) clearInterval(progressTickRef.current);
      if (phaseCountdownRef.current) clearInterval(phaseCountdownRef.current);
      phaseTimeoutRef.current = null;
      progressTickRef.current = null;
      phaseCountdownRef.current = null;

      const totalCycleMs = steps.reduce((sum, s) => sum + s.durationMs, 0);
      const startMs = steps.slice(0, index).reduce((sum, s) => sum + s.durationMs, 0);
      const endMs = startMs + step.durationMs;
      const startProgress = startMs / totalCycleMs;
      const endProgress = endMs / totalCycleMs;
      const span = endProgress - startProgress;

      const totalSec = Math.max(1, Math.round(step.durationMs / 1000));
      const startedAt = Date.now();

      setPhaseKind(step.phase);
      setPhaseSequence((n) => n + 1);
      setPhaseTotalSeconds(totalSec);
      setPhaseCountdown(totalSec);
      setRingProgress(startProgress);

      progressTickRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const t = Math.min(1, elapsed / step.durationMs);
        setRingProgress(startProgress + span * t);
      }, PROGRESS_TICK_MS);

      phaseTimeoutRef.current = setTimeout(() => {
        if (progressTickRef.current) {
          clearInterval(progressTickRef.current);
          progressTickRef.current = null;
        }
        setRingProgress(endProgress);
        advanceStepRef.current(index, steps);
      }, step.durationMs);

      let remaining = totalSec;
      phaseCountdownRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining >= 1) {
          setPhaseCountdown(remaining);
          return;
        }
        if (phaseCountdownRef.current) {
          clearInterval(phaseCountdownRef.current);
          phaseCountdownRef.current = null;
        }
        setPhaseCountdown(0);
      }, 1000);
    },
    [],
  );

  runStepRef.current = runStep;

  const endSession = useCallback(() => {
    clearTimers();
    stepIndexRef.current = 0;
    flowActiveRef.current = false;
    setFlowActive(false);
    setPhaseKind('idle');
    setPhaseCountdown(0);
    setPhaseTotalSeconds(0);
    setPhaseSequence(0);
    setRingProgress(0);
    setSessionRemainingSec(0);
    onFlowChange(false);
  }, [clearTimers, onFlowChange]);

  const startSession = useCallback(() => {
    const technique = BREATH_TECHNIQUES[techniqueKey] ?? BREATH_TECHNIQUES.Box;
    if (!technique.steps.length) return;

    clearTimers();
    flowActiveRef.current = true;
    setFlowActive(true);
    setSessionRemainingSec(sessionDurationRef.current);
    onFlowChange(true);
    stepIndexRef.current = 0;

    sessionTimerRef.current = setInterval(() => {
      setSessionRemainingSec((prev) => {
        if (prev <= 1) {
          if (sessionTimerRef.current) {
            clearInterval(sessionTimerRef.current);
            sessionTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    runStep(technique.steps[0], 0, technique.steps);
  }, [clearTimers, onFlowChange, runStep, techniqueKey]);

  const onFlowChangeRef = useRef(onFlowChange);
  onFlowChangeRef.current = onFlowChange;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      flowActiveRef.current = false;
      clearTimers();
      onFlowChangeRef.current(false);
    };
  }, [clearTimers]);

  return {
    ringProgress,
    phaseKind,
    phaseCountdown,
    phaseTotalSeconds,
    phaseSequence,
    sessionRemainingSec,
    flowActive,
    startSession,
    endSession,
  };
}
