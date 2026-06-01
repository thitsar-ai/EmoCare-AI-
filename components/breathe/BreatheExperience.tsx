import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { ScreenNavChrome, useAppNav } from '../navigation/AppNavigation';
import { useCircadianTheme } from '../../theme/circadianTheme';
import { BREATH_COPY, BREATH_PRESETS, BREATH_TECHNIQUES } from '../../utils/breathPatterns';
import { BreathMorphOrb } from './BreathMorphOrb';
import { HorizontalCarousel } from './HorizontalCarousel';
import { useBreathEngine } from './useBreathEngine';

const NAV_CONTENT_HEIGHT = 60;
const FLOW_EASE = Easing.bezier(0.4, 0, 0.2, 1);
const TECHNIQUE_KEYS = ['Box', '4-7-8', 'Calm'] as const;

function FlowCopy({ phaseKind, lightSurface }: { phaseKind: string; lightSurface: boolean }) {
  const copy = BREATH_COPY[phaseKind as keyof typeof BREATH_COPY] ?? BREATH_COPY.idle;
  return (
    <Animated.Text
      key={copy}
      entering={FadeIn.duration(420)}
      style={[styles.flowCopy, lightSurface ? styles.flowCopyLight : styles.flowCopyDark]}
    >
      {copy}
    </Animated.Text>
  );
}

export function BreatheExperience() {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { setImmersiveChromeHidden } = useAppNav();
  const [techniqueKey, setTechniqueKey] = React.useState<string>('Box');
  const [selectedPresetId, setSelectedPresetId] = React.useState<string | null>('panic-grounding');

  const immersive = useSharedValue(0);
  const chromeHide = useSharedValue(0);
  const endReveal = useSharedValue(0);

  const onFlowChange = useCallback(
    (active: boolean) => {
      setImmersiveChromeHidden(active);
      immersive.value = withTiming(active ? 1 : 0, { duration: 800, easing: FLOW_EASE });
      chromeHide.value = withTiming(active ? 1 : 0, { duration: 800, easing: FLOW_EASE });
      endReveal.value = active
        ? withDelay(1200, withTiming(1, { duration: 600, easing: FLOW_EASE }))
        : withTiming(0, { duration: 300 });
    },
    [chromeHide, endReveal, immersive, setImmersiveChromeHidden],
  );

  const { scale, progress, phaseUniform, phaseKind, flowActive, startSession, endSession } =
    useBreathEngine(techniqueKey, onFlowChange);

  const technique = BREATH_TECHNIQUES[techniqueKey] ?? BREATH_TECHNIQUES.Box;

  useEffect(
    () => () => {
      setImmersiveChromeHidden(false);
    },
    [setImmersiveChromeHidden],
  );

  const chromeFadeStyle = useAnimatedStyle(() => ({
    opacity: 1 - chromeHide.value,
    transform: [{ translateY: chromeHide.value * -22 }],
  }));

  const configFadeStyle = useAnimatedStyle(() => ({
    opacity: 1 - immersive.value,
    transform: [{ translateY: immersive.value * 24 }],
  }));

  const endControlStyle = useAnimatedStyle(() => ({
    opacity: endReveal.value * 0.72,
    transform: [{ translateY: (1 - endReveal.value) * 12 }],
  }));

  const stageLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withTiming(immersive.value * -32, { duration: 800, easing: FLOW_EASE }) }],
  }));

  const handleBegin = () => {
    if (flowActive) return;
    startSession();
  };

  const handleOrbPress = () => {
    if (!flowActive) startSession();
  };

  const handleEnd = () => {
    endSession();
  };

  const handleTechnique = (key: string) => {
    if (flowActive) endSession();
    setSelectedPresetId(null);
    setTechniqueKey(key);
  };

  const handlePreset = (preset: (typeof BREATH_PRESETS)[number]) => {
    if (flowActive) endSession();
    setSelectedPresetId(preset.id);
    setTechniqueKey(preset.techniqueKey);
  };

  const techniqueLabel = useMemo(() => {
    const preset = BREATH_PRESETS.find((p) => p.id === selectedPresetId);
    if (preset) return preset.title;
    if (techniqueKey === 'Box') return 'Box breathing';
    if (techniqueKey === '4-7-8') return '4-7-8 breathing';
    return 'Calm breathing';
  }, [selectedPresetId, techniqueKey]);

  const bottomPad = flowActive ? insets.bottom + 28 : NAV_CONTENT_HEIGHT + insets.bottom;
  const endBottom = flowActive ? insets.bottom + 24 : NAV_CONTENT_HEIGHT + 18;
  const immersiveSurface = flowActive || theme.isDark;

  const orbInstruction = flowActive ? (
    <FlowCopy phaseKind={phaseKind} lightSurface={!immersiveSurface} />
  ) : (
    <Text style={[styles.flowCopy, styles.flowCopyLight, { color: theme.mutedText }]}>{BREATH_COPY.idle}</Text>
  );

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: immersiveSurface ? '#0A0618' : theme.gradient[0] },
      ]}
    >
      <View style={[styles.ambientGlow, { backgroundColor: theme.glow }]} pointerEvents="none" />

      <View style={[styles.flex, { paddingTop: insets.top + 4, paddingBottom: bottomPad }]}>
        <Animated.View style={chromeFadeStyle} pointerEvents={flowActive ? 'none' : 'auto'}>
          <ScreenNavChrome theme={theme} title="Breathe" compact />
        </Animated.View>

        <Animated.View style={[styles.flex, configFadeStyle]} pointerEvents={flowActive ? 'none' : 'auto'}>
          <Text style={[styles.eyebrow, { color: theme.secondaryText }]}>Breathing exercise</Text>
          <Text style={[styles.title, { color: theme.text }]}>{techniqueLabel}</Text>
        </Animated.View>

        <Animated.View style={[styles.stage, stageLiftStyle]}>
          <BreathMorphOrb
            scale={scale}
            progress={progress}
            phaseUniform={phaseUniform}
            onPress={handleOrbPress}
            instruction={orbInstruction}
          />

          {!flowActive ? (
            <Text style={[styles.hintBelow, { color: theme.mutedText }]}>{technique.subtitle}</Text>
          ) : null}
        </Animated.View>

        <Animated.View style={[styles.configBlock, configFadeStyle]} pointerEvents={flowActive ? 'none' : 'auto'}>
          <HorizontalCarousel selectedId={selectedPresetId} onSelect={handlePreset} />

          <View style={styles.pillRow}>
            {TECHNIQUE_KEYS.map((key) => {
              const active = techniqueKey === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => handleTechnique(key)}
                  style={[
                    styles.pill,
                    { borderColor: theme.border, backgroundColor: theme.card },
                    active && { borderColor: theme.accent, backgroundColor: `${theme.accent}18` },
                  ]}
                >
                  <Text style={[styles.pillText, { color: active ? theme.accent : theme.mutedText }]}>{key}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={handleBegin} style={styles.beginWrap}>
            <LinearGradient
              colors={theme.isDark ? (['#9473FF', '#6366F1'] as [string, string]) : ([theme.accent, '#7F77DD'] as [string, string])}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.beginBtn}
            >
              <Text style={styles.beginText}>Begin</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.endWrap, { bottom: endBottom }, endControlStyle]} pointerEvents={flowActive ? 'auto' : 'none'}>
          <Pressable onPress={handleEnd} style={styles.endBtn} hitSlop={16}>
            <X size={16} color={immersiveSurface ? 'rgba(255,255,255,0.55)' : theme.mutedText} strokeWidth={2.2} />
            <Text style={[styles.endText, { color: immersiveSurface ? 'rgba(255,255,255,0.55)' : theme.mutedText }]}>
              End Session
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  ambientGlow: {
    position: 'absolute',
    top: '18%',
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.35,
  },
  eyebrow: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: 'Georgia',
    marginTop: 6,
    marginBottom: 8,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  flowCopy: {
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  flowCopyLight: {
    color: '#2D1B4A',
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
  flowCopyDark: {
    color: 'rgba(255,255,255,0.88)',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  hintBelow: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  configBlock: {
    paddingBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 22,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 0.5,
  },
  pillText: { fontSize: 13, fontWeight: '600' },
  beginWrap: { borderRadius: 28, overflow: 'hidden', alignSelf: 'center', marginHorizontal: 22 },
  beginBtn: { paddingVertical: 14, paddingHorizontal: 52, borderRadius: 28 },
  beginText: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  endWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
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
  },
});
