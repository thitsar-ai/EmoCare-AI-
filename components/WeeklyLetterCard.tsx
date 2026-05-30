import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export interface WeeklyLetter {
  weekKey: string;
  generatedAt: string;
  weekLabel: string;
  paragraphs: string[];
  fullText: string;
}

export interface WeeklyLetterCardProps {
  letter: WeeklyLetter | null;
  loading?: boolean;
  userName?: string;
}

export function WeeklyLetterCard({ letter, loading = false, userName }: WeeklyLetterCardProps) {
  const displayName = userName?.trim() || 'friend';

  return (
    <View style={styles.outer}>
      <BlurView intensity={52} tint="light" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.62)',
          'rgba(251,233,210,0.28)',
          'rgba(232,223,255,0.38)',
          'rgba(255,255,255,0.48)',
        ]}
        locations={[0, 0.25, 0.62, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.champagneEdge} pointerEvents="none" />

      <View style={styles.inner}>
        <Text style={styles.eyebrow}>The Emo Letter · Sunday</Text>
        <Text style={styles.headline}>For {displayName}, with care</Text>
        {letter?.weekLabel ? (
          <Text style={styles.weekLabel}>{letter.weekLabel}</Text>
        ) : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#6B4FA8" size="small" />
            <Text style={styles.loadingText}>Emo is weaving your week into words…</Text>
          </View>
        ) : letter?.paragraphs?.length ? (
          <View style={styles.body}>
            {letter.paragraphs.map((paragraph, index) => (
              <Text
                key={`${letter.weekKey}-p-${index}`}
                style={[styles.paragraph, index === 0 && styles.paragraphLead]}
              >
                {paragraph}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.placeholder}>
            Your letter is still forming. Check in, journal, or explore with Oracle this week — Emo will gather the threads by Sunday.
          </Text>
        )}

        <Text style={styles.signOff}>Intelligence with Soul · Emo 💜</Text>
      </View>
    </View>
  );
}

const CHAMPAGNE_GOLD = 'rgba(251, 214, 168, 0.72)';

const styles = StyleSheet.create({
  outer: {
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: CHAMPAGNE_GOLD,
    shadowColor: '#C4A8F8',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  champagneEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(251, 233, 210, 0.55)',
  },
  inner: {
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(61,40,88,0.48)',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  headline: {
    fontFamily: SERIF,
    fontSize: 26,
    lineHeight: 32,
    color: '#3D2858',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  weekLabel: {
    fontSize: 12,
    color: 'rgba(61,40,88,0.52)',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  body: {
    gap: 16,
  },
  paragraph: {
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(61,40,88,0.82)',
    letterSpacing: 0.15,
  },
  paragraphLead: {
    fontSize: 17,
    lineHeight: 27,
    color: '#3D2858',
  },
  placeholder: {
    fontFamily: SERIF,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(61,40,88,0.62)',
    fontStyle: 'italic',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(61,40,88,0.55)',
    fontStyle: 'italic',
  },
  signOff: {
    marginTop: 18,
    fontSize: 11,
    color: 'rgba(107,79,168,0.72)',
    letterSpacing: 0.6,
    fontStyle: 'italic',
  },
});
