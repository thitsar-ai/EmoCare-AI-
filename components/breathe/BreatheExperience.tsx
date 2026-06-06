import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import Svg, { Path } from 'react-native-svg';
import { Box, Leaf, Shield, Volume2, VolumeX, X } from 'lucide-react-native';
import { ScreenNavChrome, useAppNav, TAB_BAR_HEIGHT } from '../navigation/AppNavigation';
import { useCircadianTheme } from '../../theme/circadianTheme';
import { BREATH_COPY, BREATH_PHASE_LABELS, BREATH_TECHNIQUES } from '../../utils/breathPatterns';
import { hapticLight } from '../../utils/haptics';
import { pressChipStyle } from '../../utils/pressFeedback';
import { LotusOrb } from './LotusOrb';
import { BreatheSessionGrid, SESSIONS, type BreatheSession } from './BreatheSessionGrid';
import { BREATHE_COLORS, BREATHE_GRADIENT, BREATHE_SERIF, getBreatheChromeTheme } from './breatheTypography';
import { useBreathEngine } from './useBreathEngine';
import { stopBreathVoiceGuide, useBreathVoiceGuide } from './useBreathVoiceGuide';

const FLOW_EASE = Easing.bezier(0.4, 0, 0.2, 1);
const TECHNIQUE_KEYS = ['Box', '4-7-8', 'Calm'] as const;

const TECHNIQUE_CONFIG: Record<
  (typeof TECHNIQUE_KEYS)[number],
  { techniqueKey: string; Icon: typeof Box; label: string }
> = {
  Box: { techniqueKey: 'Box', Icon: Box, label: 'Box' },
  '4-7-8': { techniqueKey: '4-7-8', Icon: Box, label: '4-7-8' },
  Calm: { techniqueKey: 'Calm', Icon: Leaf, label: 'Calm' },
};

function formatSessionTimer(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function resolveSessionDurationSeconds(selectedPresetId: string | null, techniqueKey: string): number {
  if (selectedPresetId) {
    const session = SESSIONS.find((item) => item.id === selectedPresetId);
    const match = session?.duration.match(/(\d+)/);
    if (match) return Number.parseInt(match[1], 10) * 60;
  }

  switch (techniqueKey) {
    case '4-7-8':
      return 5 * 60;
    case 'Calm':
      return 4 * 60;
    case 'Resonance':
      return 4 * 60;
    case 'Box':
    default:
      return 5 * 60;
  }
}

function resolveSessionName(selectedPresetId: string | null, techniqueKey: string): string {
  if (selectedPresetId) {
    const session = SESSIONS.find((item) => item.id === selectedPresetId);
    if (session) return session.title;
  }

  switch (techniqueKey) {
    case 'Box':
      return 'Box breathing';
    case '4-7-8':
      return '4-7-8 breath';
    case 'Calm':
      return 'Calm breath';
    case 'Resonance':
      return 'Balanced breath';
    default:
      return BREATH_TECHNIQUES[techniqueKey]?.label ?? 'Breath session';
  }
}

function resolveTechniquePattern(techniqueKey: string): string {
  const technique = BREATH_TECHNIQUES[techniqueKey];
  if (!technique?.subtitle) return '';
  return technique.subtitle.replace(/\s+/g, ' ').trim();
}

const BreathSessionHeader = memo(function BreathSessionHeader({
  sessionName,
  patternLabel,
  countdown,
}: {
  sessionName: string;
  patternLabel: string;
  countdown: number;
}) {
  return (
    <View style={styles.sessionHeader}>
      <Text style={styles.sessionName}>{sessionName}</Text>
      {patternLabel ? <Text style={styles.sessionPattern}>{patternLabel}</Text> : null}
      <Text style={styles.sessionTimer}>{formatSessionTimer(countdown)}</Text>
    </View>
  );
});

const BreathLotusCore = memo(function BreathLotusCore({
  ringProgress,
  onOrbPress,
  flowActive,
}: {
  ringProgress: number;
  onOrbPress: () => void;
  flowActive: boolean;
}) {
  const orbInstruction = flowActive ? undefined : (
    <Text style={styles.orbInstruction}>{BREATH_COPY.idle}</Text>
  );

  return (
    <LotusOrb
      ringProgress={ringProgress}
      onPress={onOrbPress}
      instruction={orbInstruction}
    />
  );
});

function BreathFlowInstruction({ phaseKind }: { phaseKind: string }) {
  const label = BREATH_PHASE_LABELS[phaseKind as keyof typeof BREATH_PHASE_LABELS] ?? '';
  const copy = BREATH_COPY[phaseKind as keyof typeof BREATH_COPY] ?? BREATH_COPY.idle;

  return (
    <View style={styles.flowInstruction}>
      <Text style={styles.flowPhaseLabel}>{label}</Text>
      <Text style={styles.flowCopy}>{copy}</Text>
    </View>
  );
}

const BreathStage = memo(function BreathStage({
  flowActive,
  ringProgress,
  onOrbPress,
  phaseKind,
  sessionRemainingSec,
  sessionName,
  patternLabel,
}: {
  flowActive: boolean;
  ringProgress: number;
  onOrbPress: () => void;
  phaseKind: string;
  sessionRemainingSec: number;
  sessionName: string;
  patternLabel: string;
}) {
  return (
    <View style={styles.stage}>
      {flowActive ? (
        <BreathSessionHeader
          sessionName={sessionName}
          patternLabel={patternLabel}
          countdown={sessionRemainingSec}
        />
      ) : null}

      <BreathLotusCore ringProgress={ringProgress} onOrbPress={onOrbPress} flowActive={flowActive} />

      {flowActive ? (
        <BreathFlowInstruction phaseKind={phaseKind} />
      ) : (
        <View style={styles.safePill}>
          <Text style={styles.safeText}>You're safe here. Take your time. ♡</Text>
        </View>
      )}
    </View>
  );
});

function ActiveBreathSession({
  techniqueKey,
  sessionDurationSec,
  sessionName,
  patternLabel,
  voiceGuideEnabled,
  onVoiceGuideChange,
  endBottom,
  onExit,
  onImmersiveChange,
}: {
  techniqueKey: string;
  sessionDurationSec: number;
  sessionName: string;
  patternLabel: string;
  voiceGuideEnabled: boolean;
  onVoiceGuideChange: (enabled: boolean) => void;
  endBottom: number;
  onExit: () => void;
  onImmersiveChange: (active: boolean) => void;
}) {
  const endReveal = useSharedValue(0);
  const exitingRef = useRef(false);

  const onFlowChange = useCallback(
    (active: boolean) => {
      onImmersiveChange(active);
      endReveal.value = active ? withDelay(400, withTiming(1, { duration: 400, easing: FLOW_EASE })) : 0;
    },
    [endReveal, onImmersiveChange],
  );

  const { ringProgress, phaseKind, phaseCountdown, phaseTotalSeconds, phaseSequence, sessionRemainingSec, startSession, endSession } =
    useBreathEngine(techniqueKey, sessionDurationSec, onFlowChange);

  useBreathVoiceGuide(voiceGuideEnabled, true, phaseKind, phaseCountdown, phaseTotalSeconds, phaseSequence);

  useEffect(() => {
    startSession();
    return () => {
      stopBreathVoiceGuide();
      endSession();
      onImmersiveChange(false);
    };
    // Mount once — engine owns timers for this session instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endControlStyle = useAnimatedStyle(() => ({
    opacity: endReveal.value * 0.72,
  }));

  useEffect(() => {
    if (sessionRemainingSec !== 0) return;
    if (exitingRef.current) return;
    exitingRef.current = true;
    stopBreathVoiceGuide();
    endSession();
    onExit();
  }, [endSession, onExit, sessionRemainingSec]);

  const handleEnd = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    stopBreathVoiceGuide();
    endSession();
    onExit();
  };

  return (
    <>
      <View style={styles.flowLayer}>
        <BreathStage
          flowActive
          ringProgress={ringProgress}
          onOrbPress={() => {}}
          phaseKind={phaseKind}
          sessionRemainingSec={sessionRemainingSec}
          sessionName={sessionName}
          patternLabel={patternLabel}
        />
      </View>

      <Animated.View style={[styles.endWrap, { bottom: endBottom }, endControlStyle]}>
        <Pressable
          onPress={() => onVoiceGuideChange(!voiceGuideEnabled)}
          style={styles.voiceToggle}
          hitSlop={12}
        >
          {voiceGuideEnabled ? (
            <Volume2 size={15} color={BREATHE_COLORS.plumSoft} strokeWidth={2} />
          ) : (
            <VolumeX size={15} color={BREATHE_COLORS.plumSoft} strokeWidth={2} />
          )}
          <Text style={styles.voiceToggleText}>{voiceGuideEnabled ? 'Emo guides' : 'Silent'}</Text>
        </Pressable>
        <Pressable onPress={handleEnd} style={styles.endBtn} hitSlop={16}>
          <X size={16} color={BREATHE_COLORS.plumSoft} strokeWidth={2.2} />
          <Text style={styles.endText}>End Session</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

export function BreatheExperience() {
  const theme = useCircadianTheme();
  const chromeTheme = useMemo(() => getBreatheChromeTheme(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { setImmersiveChromeHidden } = useAppNav();
  const [techniqueKey, setTechniqueKey] = React.useState<string>('Box');
  const [selectedPresetId, setSelectedPresetId] = React.useState<string | null>(null);
  const [voiceGuideEnabled, setVoiceGuideEnabled] = React.useState(true);
  const [flowSessionKey, setFlowSessionKey] = React.useState<number | null>(null);

  const immersive = useSharedValue(0);
  const chromeHide = useSharedValue(0);

  const onImmersiveChange = useCallback(
    (active: boolean) => {
      setImmersiveChromeHidden(active);
      immersive.value = active ? 1 : 0;
      chromeHide.value = active ? 1 : 0;
    },
    [chromeHide, immersive, setImmersiveChromeHidden],
  );

  const flowActive = flowSessionKey !== null;

  useEffect(
    () => () => {
      setImmersiveChromeHidden(false);
    },
    [setImmersiveChromeHidden],
  );

  const chromeFadeStyle = useAnimatedStyle(() => ({
    opacity: 1 - chromeHide.value,
  }));

  const configFadeStyle = useAnimatedStyle(() => ({
    opacity: 1 - immersive.value,
  }));

  const beginFlow = useCallback(() => {
    setFlowSessionKey(Date.now());
  }, []);

  const handleBegin = useCallback(() => {
    if (flowActive) return;
    beginFlow();
  }, [beginFlow, flowActive]);

  const handleOrbPress = useCallback(() => {
    if (!flowActive) beginFlow();
  }, [beginFlow, flowActive]);

  const handleEndFlow = useCallback(() => {
    setFlowSessionKey(null);
  }, []);

  const handleTechnique = (key: (typeof TECHNIQUE_KEYS)[number]) => {
    if (flowActive) setFlowSessionKey(null);
    setSelectedPresetId(null);
    setTechniqueKey(TECHNIQUE_CONFIG[key].techniqueKey);
  };

  const handlePreset = (session: BreatheSession) => {
    if (flowActive) setFlowSessionKey(null);
    setSelectedPresetId(session.id);
    setTechniqueKey(session.techniqueKey);
  };

  const bottomPad = flowActive ? insets.bottom + 28 : TAB_BAR_HEIGHT + insets.bottom;
  const endBottom = flowActive ? insets.bottom + 24 : TAB_BAR_HEIGHT + 18;

  const sessionName = resolveSessionName(selectedPresetId, techniqueKey);
  const patternLabel = resolveTechniquePattern(techniqueKey);
  const sessionDurationSec = resolveSessionDurationSeconds(selectedPresetId, techniqueKey);

  return (
    <LinearGradient
      colors={['#ddd5f0', '#ede5f5', '#f5e0ee', '#faf0f8', '#f8f4fc']}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.root}
    >
      {!flowActive ? (
        <>
          <Svg
            width={55}
            height={200}
            style={{ position: 'absolute', left: 0, bottom: 160, opacity: 0.55 }}
            pointerEvents="none"
          >
            <Path
              d="M28,200 Q26,175 30,155 Q36,132 26,110 Q20,92 28,72 Q34,55 26,32"
              stroke="#b8a8d8"
              strokeWidth="1.5"
              fill="none"
            />
            <Path
              d="M28,158 Q12,148 8,132 Q6,120 18,117"
              stroke="#b8a8d8"
              strokeWidth="1.2"
              fill="rgba(196,176,228,0.18)"
            />
            <Path
              d="M28,128 Q44,118 48,102 Q50,90 38,88"
              stroke="#b8a8d8"
              strokeWidth="1.2"
              fill="rgba(196,176,228,0.18)"
            />
            <Path
              d="M28,98 Q14,86 10,70 Q8,58 20,56"
              stroke="#b8a8d8"
              strokeWidth="1.2"
              fill="rgba(196,176,228,0.18)"
            />
          </Svg>
          <Svg
            width={55}
            height={200}
            style={{ position: 'absolute', right: 0, bottom: 160, opacity: 0.55 }}
            pointerEvents="none"
          >
            <Path
              d="M27,200 Q29,175 25,155 Q19,132 29,110 Q35,92 27,72 Q21,55 29,32"
              stroke="#b8a8d8"
              strokeWidth="1.5"
              fill="none"
            />
            <Path
              d="M27,158 Q43,148 47,132 Q49,120 37,117"
              stroke="#b8a8d8"
              strokeWidth="1.2"
              fill="rgba(196,176,228,0.18)"
            />
            <Path
              d="M27,128 Q11,118 7,102 Q5,90 17,88"
              stroke="#b8a8d8"
              strokeWidth="1.2"
              fill="rgba(196,176,228,0.18)"
            />
            <Path
              d="M27,98 Q41,86 45,70 Q47,58 35,56"
              stroke="#b8a8d8"
              strokeWidth="1.2"
              fill="rgba(196,176,228,0.18)"
            />
          </Svg>
        </>
      ) : null}

      <StatusBar style="dark" />
      <ScreenSafeArea style={{ paddingBottom: bottomPad }} extraTop={4}>
        {!flowActive ? (
          <>
            <Animated.View style={[chromeFadeStyle, styles.chromeWrap]}>
              <ScreenNavChrome
                theme={chromeTheme}
                title="Breathe"
                titleFontSize={15}
                titleColor={BREATHE_COLORS.plumTitle}
              />
            </Animated.View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Animated.View style={configFadeStyle}>
                <Text style={styles.eyebrow}>BREATHING EXERCISE</Text>
                <Text style={styles.title}>
                  Welcome home to{'\n'}your calm.
                </Text>
                <Text style={styles.subtitle}>
                  A gentle space to pause, breathe, and{'\n'}come back to yourself.
                </Text>
              </Animated.View>

              <BreathStage
                flowActive={false}
                ringProgress={0}
                onOrbPress={handleOrbPress}
                phaseKind="idle"
                sessionRemainingSec={sessionDurationSec}
                sessionName={sessionName}
                patternLabel={patternLabel}
              />

              <Animated.View style={configFadeStyle}>
                <BreatheSessionGrid selectedId={selectedPresetId} onSelect={handlePreset} />

            <View style={styles.sectionDividerRow}>
              <View style={styles.sectionLine} />
              <Text style={styles.pillSectionLabel}>CHOOSE YOUR BREATH STYLE</Text>
              <View style={styles.sectionLine} />
            </View>

            <View style={styles.pillRow}>
              {TECHNIQUE_KEYS.map((key) => {
                const active = techniqueKey === TECHNIQUE_CONFIG[key].techniqueKey;
                const { Icon, label } = TECHNIQUE_CONFIG[key];
                const iconColor = active ? BREATHE_COLORS.accent : BREATHE_COLORS.plumSoft;
                return (
                  <Pressable
                    key={key}
                    onPress={() => handleTechnique(key)}
                    style={({ pressed }) => [
                      styles.pill,
                      active ? styles.pillActive : styles.pillIdle,
                      pressChipStyle(BREATHE_COLORS.accent, pressed),
                    ]}
                  >
                    {key === '4-7-8' ? (
                      <View style={styles.pillIconWrap}>
                        <Text style={[styles.pillSymbol, { color: iconColor }]}>≋</Text>
                      </View>
                    ) : (
                      <View style={styles.pillIconWrap}>
                        <Icon size={14} color={iconColor} strokeWidth={2} />
                      </View>
                    )}
                    <Text style={[styles.pillText, { color: active ? BREATHE_COLORS.accent : BREATHE_COLORS.plumSoft }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                void hapticLight();
                handleBegin();
              }}
              style={({ pressed }) => [
                styles.beginWrap,
                pressChipStyle(BREATHE_COLORS.accent, pressed),
              ]}
            >
              <LinearGradient
                colors={BREATHE_GRADIENT.begin}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.beginBtn}
              >
                <Text style={styles.beginText}>Begin your breath journey</Text>
              </LinearGradient>
            </Pressable>

            <View style={styles.safetyRow}>
              <Shield size={12} color={BREATHE_COLORS.plumSoft} strokeWidth={2} />
              <Text style={styles.safetyNotice}>
                You're in control. You can pause or stop anytime.
              </Text>
            </View>
              </Animated.View>
            </ScrollView>
          </>
        ) : (
          <ActiveBreathSession
            key={flowSessionKey}
            techniqueKey={techniqueKey}
            sessionDurationSec={sessionDurationSec}
            sessionName={sessionName}
            patternLabel={patternLabel}
            voiceGuideEnabled={voiceGuideEnabled}
            onVoiceGuideChange={setVoiceGuideEnabled}
            endBottom={endBottom}
            onExit={handleEndFlow}
            onImmersiveChange={onImmersiveChange}
          />
        )}
      </ScreenSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  chromeWrap: { paddingHorizontal: 8, paddingBottom: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12 },
  flowLayer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  navSide: {
    width: 84,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navSideRight: {
    justifyContent: 'flex-end',
    gap: 6,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0.5,
    borderColor: 'rgba(123,92,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.45 },
  navBtnPressed: { opacity: 0.82 },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: BREATHE_SERIF,
    color: BREATHE_COLORS.plumTitle,
  },
  eyebrow: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.4,
    marginTop: 6,
    color: BREATHE_COLORS.label,
  },
  title: {
    textAlign: 'center',
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '600',
    fontFamily: BREATHE_SERIF,
    color: '#3D2E58',
    marginTop: 10,
    paddingHorizontal: 32,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
    color: '#6E6388',
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 36,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  orbInstruction: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
    textAlign: 'center',
    color: BREATHE_COLORS.orbInstruction,
  },
  sessionHeader: {
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 28,
    minHeight: 96,
  },
  sessionName: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    fontFamily: BREATHE_SERIF,
    color: BREATHE_COLORS.plumTitle,
    textAlign: 'center',
  },
  sessionPattern: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    color: BREATHE_COLORS.plumMuted,
    textAlign: 'center',
  },
  sessionTimer: {
    marginTop: 2,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    fontFamily: BREATHE_SERIF,
    color: BREATHE_COLORS.plumTitle,
    textAlign: 'center',
  },
  flowInstruction: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  flowPhaseLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: BREATHE_COLORS.plumTitle,
    textAlign: 'center',
  },
  flowCopy: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '400',
    color: BREATHE_COLORS.plumMuted,
    textAlign: 'center',
  },
  safePill: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: BREATHE_COLORS.safePillBg,
  },
  safeText: {
    fontSize: 13,
    fontWeight: '400',
    color: BREATHE_COLORS.plumMuted,
    textAlign: 'center',
  },
  sectionDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 22,
  },
  sectionLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(123,92,255,0.18)',
  },
  pillSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    color: BREATHE_COLORS.labelFaint,
  },
  pillIconWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
    paddingHorizontal: 22,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.88)',
    minWidth: 96,
  },
  pillIdle: {
    borderColor: BREATHE_COLORS.pillBorder,
  },
  pillActive: {
    borderColor: BREATHE_COLORS.accentBorder,
    backgroundColor: BREATHE_COLORS.pillActiveBg,
  },
  pillText: { fontSize: 13, fontWeight: '600' },
  pillSymbol: { fontSize: 15, fontWeight: '500', lineHeight: 15, textAlign: 'center', width: 16 },
  beginWrap: {
    borderRadius: 28,
    overflow: 'hidden',
    alignSelf: 'stretch',
    marginHorizontal: 22,
    marginTop: 4,
    marginBottom: 4,
  },
  beginBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: 'center',
  },
  beginText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 28,
  },
  safetyNotice: {
    fontSize: 11.5,
    color: BREATHE_COLORS.plumSoft,
    textAlign: 'center',
  },
  endWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  voiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  voiceToggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: BREATHE_COLORS.plumSoft,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  endText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    color: BREATHE_COLORS.plumSoft,
  },
});
