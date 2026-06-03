import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCircadianTheme } from '../../theme/circadianTheme';
import { BREATH_PRESETS } from '../../utils/breathPatterns';

const SESSION_COLORS: [string, string][] = [
  ['#0d3848', '#071e30'], // deep teal — calm
  ['#281255', '#150928'], // soft violet — anxiety
  ['#0a1840', '#050c22'], // midnight navy — sleep
  ['#1a2d5c', '#0c1535'], // deep blue — grounding
];

const SESSION_SUBTITLES = [
  'Gentle waves of calm',
  'Release what you carry',
  'Drift into stillness',
  'Return to your center',
];

const CARD_WIDTH = 160;
const CARD_GAP = 16;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

type Preset = (typeof BREATH_PRESETS)[number];

export function HorizontalCarousel({
  selectedId,
  onSelect,
  labelColor,
}: {
  selectedId?: string | null;
  onSelect: (preset: Preset) => void;
  labelColor?: string;
}) {
  const theme = useCircadianTheme();
  const sectionColor = labelColor ?? theme.secondaryText;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: sectionColor }]}>Choose your breath</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
      >
        {BREATH_PRESETS.slice(0, 4).map((card, index) => {
          const active = selectedId === card.id;
          const gradient = SESSION_COLORS[index] ?? SESSION_COLORS[0];
          const subtitle = SESSION_SUBTITLES[index] ?? SESSION_SUBTITLES[0];
          return (
            <Pressable
              key={card.id}
              onPress={() => onSelect(card)}
              style={({ pressed }) => [styles.cardOuter, pressed && styles.cardPressed]}
            >
              <LinearGradient
                colors={[gradient[0], gradient[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.card,
                  active && styles.cardActive,
                  { borderColor: active ? theme.accent : 'rgba(255,255,255,0.08)' },
                ]}
              >
                <View style={styles.cardOverlay} />
                <Text style={styles.cardText}>{card.title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  carouselContainer: {
    paddingHorizontal: 24,
    gap: CARD_GAP,
    height: 192,
  },
  cardOuter: {
    width: CARD_WIDTH,
    height: 184,
    borderRadius: 20,
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'flex-start',
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardActive: {
    borderWidth: 1.5,
    shadowColor: '#9473FF',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 8, 28, 0.38)',
    borderRadius: 20,
  },
  cardText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    zIndex: 1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    opacity: 0.65,
    marginTop: 6,
    color: '#fff',
    zIndex: 1,
    lineHeight: 16,
  },
});
