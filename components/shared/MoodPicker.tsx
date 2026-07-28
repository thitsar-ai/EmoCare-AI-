import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Check } from 'lucide-react-native';
import { OB_MOODS, type Mood } from '../../constants/obMoods';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { moodCheckInCardShadow, moodCheckInGlass, selectableLabelColor } from '../../theme/glassSurfaces';
import { rgba } from '../../theme/tokens';
import { MoodIconBadge } from './MoodIcon';
import { hapticLight } from '../../utils/haptics';
import { useUiCopy } from '../i18n/UiCopyProvider';

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
      shadowOpacity: 0.45,
      shadowRadius: 10,
    },
    android: { elevation: 5 },
    default: {},
  }) as ViewStyle;
}

const MOOD_CARD_HEIGHT = 92;
const MOOD_CARD_HEIGHT_MYANMAR = 112;

function MoodCheckInGlassCard({
  mood,
  selected,
  onPress,
  width,
  theme,
  animateSelection,
  showSelectionGlow,
  vividSelection,
}: {
  mood: Mood;
  selected: boolean;
  onPress: () => void;
  width: number;
  theme: CircadianTheme;
  animateSelection: boolean;
  showSelectionGlow: boolean;
  vividSelection?: boolean;
}) {
  const { t, locale } = useUiCopy();
  const myanmar = locale === 'my';
  const cardHeight = myanmar ? MOOD_CARD_HEIGHT_MYANMAR : MOOD_CARD_HEIGHT;
  const useBlur = Platform.OS === 'ios';
  const accent = mood.accentColor ?? mood.iconColor ?? '#A78BFA';
  const moodKey = `mood.${mood.label.toLowerCase()}`;
  const localizedLabel = t(moodKey);
  const displayLabel = localizedLabel === moodKey ? mood.label : localizedLabel;
  const descKey = `mood.desc.${mood.label.toLowerCase()}`;
  const localizedDesc = t(descKey);
  const displayDesc = localizedDesc === descKey ? mood.desc : localizedDesc;
  const selectionFillAlpha = vividSelection
    ? theme.isDark
      ? 0.28
      : 0.2
    : theme.isDark
      ? 0.22
      : 0.14;
  const selectionBgAlpha = vividSelection
    ? theme.isDark
      ? 0.16
      : 0.12
    : theme.isDark
      ? 0.12
      : 0.08;
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
        { height: cardHeight, minHeight: cardHeight, overflow: myanmar ? 'visible' : 'hidden' },
        moodCheckInCardShadow(selected),
        moodSelectionGlowStyle(accent, selected && showSelectionGlow),
        {
          borderColor: selected ? accent : moodCheckInGlass.border,
          borderWidth: selected ? 2 : 1,
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
      {selected ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            styles.selectionGlowFill,
            { backgroundColor: rgba(accent, selectionFillAlpha) },
          ]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: selected
              ? rgba(accent, selectionBgAlpha)
              : moodCheckInGlass.background,
          },
        ]}
      />
      <View style={[styles.content, { height: cardHeight }, myanmar && styles.contentMyanmar]}>
        <MoodIconBadge mood={mood} variant="full" active={selected} />
        <View style={[styles.cardText, myanmar && styles.cardTextMyanmar]}>
          <Text
            style={[
              styles.cardTitle,
              myanmar && styles.cardTitleMyanmar,
              { color: selectableLabelColor(selected, theme.text) },
            ]}
            numberOfLines={myanmar ? 2 : 1}
          >
            {displayLabel}
          </Text>
          <Text
            style={[styles.cardDesc, myanmar && styles.cardDescMyanmar, { color: theme.mutedText }]}
            numberOfLines={2}
          >
            {displayDesc}
          </Text>
        </View>
        {selected ? (
          <View style={[styles.checkBadge, { backgroundColor: accent }]} accessibilityElementsHidden>
            <Check size={11} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : null}
      </View>
    </View>
  );

  const cardBody = animateSelection ? (
    <Animated.View style={{ transform: [{ scale }] }}>{shell}</Animated.View>
  ) : (
    shell
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
      accessibilityLabel={`${displayLabel}. ${displayDesc}`}
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
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = (windowWidth - horizontalPadding * 2 - 14) / 2;
  const shouldAnimate = animateSelection || variant === 'checkin';
  // Onboarding: single accent border + soft tint + checkmark (no glow ring).
  const showSelectionGlow = variant === 'checkin';
  const vividSelection = variant === 'onboarding';

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
            vividSelection={vividSelection}
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
    marginBottom: 28,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  selectionGlowFill: {
    borderRadius: moodCheckInGlass.radius,
  },
  shell: {
    borderRadius: moodCheckInGlass.radius,
    borderWidth: 1,
    overflow: 'hidden',
    height: MOOD_CARD_HEIGHT,
    minHeight: MOOD_CARD_HEIGHT,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 11,
    gap: 10,
    zIndex: 1,
    height: MOOD_CARD_HEIGHT,
  },
  contentMyanmar: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingRight: 22,
  },
  cardText: { flex: 1, minWidth: 0, paddingTop: 3 },
  cardTextMyanmar: { paddingTop: 5 },
  cardTitle: { fontSize: 12, fontWeight: '700', marginBottom: 5, lineHeight: 16, flexShrink: 1 },
  cardTitleMyanmar: {
    fontSize: 12,
    lineHeight: 22,
    paddingTop: 3,
    marginBottom: 4,
    fontFamily: undefined,
  },
  cardDesc: { fontSize: 11, lineHeight: 16, flexShrink: 1 },
  cardDescMyanmar: { lineHeight: 20, fontFamily: undefined },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
