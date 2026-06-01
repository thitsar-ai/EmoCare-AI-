import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCircadianTheme } from '../../theme/circadianTheme';
import { BREATH_PRESETS } from '../../utils/breathPatterns';

const CARD_WIDTH = 140;
const CARD_GAP = 16;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

type Preset = (typeof BREATH_PRESETS)[number];

export function HorizontalCarousel({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect: (preset: Preset) => void;
}) {
  const theme = useCircadianTheme();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>Choose a session</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
      >
        {BREATH_PRESETS.map((card) => {
          const active = selectedId === card.id;
          return (
            <Pressable
              key={card.id}
              onPress={() => onSelect(card)}
              style={({ pressed }) => [styles.cardOuter, pressed && styles.cardPressed]}
            >
              <LinearGradient
                colors={[card.gradient[0], card.gradient[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, active && styles.cardActive, { borderColor: active ? theme.accent : 'rgba(255,255,255,0.08)' }]}
              >
                <View style={styles.cardOverlay} />
                <Text style={styles.cardText}>{card.title}</Text>
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
    height: 168,
  },
  cardOuter: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: 16,
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
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
    borderRadius: 16,
  },
  cardText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    zIndex: 1,
  },
});
