import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { OB_MOODS, type Mood } from '../../constants/obMoods';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { moodCheckInCardShadow, moodCheckInGlass, selectableLabelColor } from '../../theme/glassSurfaces';
import { rgba } from '../../theme/tokens';
import { MoodIconBadge } from './MoodIcon';
import { hapticLight } from '../../utils/haptics';

const SCREEN_W = Dimensions.get('window').width;
const SELECT_DURATION = 250;

type MoodPickerProps = {
  theme: CircadianTheme;
  selected: Mood | null;
  onSelect: (mood: Mood) => void;
  /** checkin = Check-In tab; onboarding = Tell Me About You — same glass styling. */
  variant?: 'checkin' | 'onboarding';
  /** Horizontal screen padding used to size the 2-column grid. */
  horizontalPadding?: number;
  /** Animate selected card scale (Check-In ritual). */
  animateSelection?: boolean;
};

function moodSelectionGlowStyle(accent: string, selected: boolean): ViewStyle {
  if (!selected) return {};
  return Platform.select({
    ios: {
      shadowColor: accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.72,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  }) as ViewStyle;
}

function MoodCheckInGlassCard({
  mood,
  selected,
  onPress,
  width,
  theme,
  animateSelection,
  showSelectionGlow,
}: {
  mood: Mood;
  selected: boolean;
  onPress: () => void;
  width: number;
  theme: CircadianTheme;
  animateSelection: boolean;
  showSelectionGlow: boolean;
}) {
  const useBlur = Platform.OS === 'ios';
  const accent = mood.accentColor ?? mood.iconColor ?? '#A78BFA';
  const scale = useRef(new Animated.Value(selected && animateSelection ? 1.02 : 1)).current;

  useEffect(() => {
    if (!animateSelection) return;
    Animated.timing(scale, {
      toValue: selected ? 1.02 : 1,
      duration: SELECT_DURATION,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [animateSelection, selected, scale]);

  const shell = (
    <View
      style={[
        styles.shell,
        moodCheckInCardShadow(selected),
        moodSelectionGlowStyle(accent, selected && showSelectionGlow),
        {
          borderColor: selected
            ? showSelectionGlow
              ? accent
              : moodCheckInGlass.borderSelected
            : moodCheckInGlass.border,
          borderWidth: selected && showSelectionGlow ? 2 : 1,
        },
      ]}
    >
      {useBlur ? (
        <BlurView
          intensity={moodCheckInGlass.blurIntensity}
          tint="light"
          style={StyleSheet.absoluteFillObject}
        />
      ) : null}
      {selected && showSelectionGlow ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            styles.selectionGlowFill,
            { backgroundColor: rgba(accent, theme.isDark ? 0.28 : 0.2) },
          ]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: selected
              ? showSelectionGlow
                ? rgba(accent, theme.isDark ? 0.14 : 0.1)
                : moodCheckInGlass.backgroundSelected
              : moodCheckInGlass.background,
          },
        ]}
      />
      <View style={styles.content}>
        <MoodIconBadge mood={mood} variant="full" active={selected} />
        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: selectableLabelColor(selected, theme.text) }]}>
            {mood.label}
          </Text>
          <Text style={[styles.cardDesc, { color: theme.mutedText }]}>{mood.desc}</Text>
        </View>
      </View>
    </View>
  );

  const cardBody = (
    <View style={styles.cardWrap}>
      {selected && showSelectionGlow ? (
        <View
          pointerEvents="none"
          style={[
            styles.selectionGlowRing,
            {
              borderColor: rgba(accent, 0.55),
              shadowColor: accent,
            },
            moodSelectionGlowStyle(accent, true),
          ]}
        />
      ) : null}
      {animateSelection ? (
        <Animated.View style={{ transform: [{ scale }] }}>{shell}</Animated.View>
      ) : (
        shell
      )}
    </View>
  );

  return (
    <Pressable
      style={({ pressed }) => [
        { width, flexBasis: width, flexGrow: 0, flexShrink: 0 },
        pressed && !selected && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${mood.label}. ${mood.desc}`}
    >
      {cardBody}
    </Pressable>
  );
}

export function MoodPicker({
  theme,
  selected,
  onSelect,
  variant = 'checkin',
  horizontalPadding = 28,
  animateSelection = false,
}: MoodPickerProps) {
  const cardWidth = (SCREEN_W - horizontalPadding * 2 - 14) / 2;
  const shouldAnimate = animateSelection || variant === 'checkin';
  const showSelectionGlow = variant === 'checkin';

  return (
    <View style={[styles.grid, variant === 'onboarding' ? styles.gridOnboarding : styles.gridCheckin]}>
      {OB_MOODS.map((m) => {
        const isSelected = selected?.label === m.label;
        return (
          <MoodCheckInGlassCard
            key={m.label}
            mood={m}
            selected={isSelected}
            width={cardWidth}
            theme={theme}
            animateSelection={shouldAnimate}
            showSelectionGlow={showSelectionGlow}
            onPress={() => {
              void hapticLight();
              onSelect(m);
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    width: '100%',
  },
  gridCheckin: {
    marginBottom: 20,
  },
  gridOnboarding: {
    marginBottom: 22,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  cardWrap: {
    position: 'relative',
  },
  selectionGlowRing: {
    ...StyleSheet.absoluteFillObject,
    margin: -5,
    borderRadius: moodCheckInGlass.radius + 5,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 10,
  },
  selectionGlowFill: {
    borderRadius: moodCheckInGlass.radius,
  },
  shell: {
    borderRadius: moodCheckInGlass.radius,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 74,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 11,
    gap: 10,
    zIndex: 1,
  },
  cardText: { flex: 1, paddingTop: 3 },
  cardTitle: { fontSize: 12, fontWeight: '700', marginBottom: 5, lineHeight: 16 },
  cardDesc: { fontSize: 11, lineHeight: 16 },
});
