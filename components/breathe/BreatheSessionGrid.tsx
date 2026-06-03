import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ChevronRight, Droplets, Leaf, Moon, Sparkles, Sun, Wind } from 'lucide-react-native';
import { BREATHE_COLORS, BREATHE_SERIF } from './breatheTypography';
import { hapticLight } from '../../utils/haptics';
import { pressChipStyle } from '../../utils/pressFeedback';

const SESSION_DATA = [
  {
    id: 'calm-reset',
    title: 'Calm reset',
    desc: 'Release tension and soften your mind.',
    descBold: 'tension',
    duration: '~4 min',
    technique: 'Box',
    IconComponent: Leaf,
    iconColor: '#8B6ED4',
    iconBg: '#EDE8F8',
    techniqueKey: 'Box',
  },
  {
    id: 'anxiety-relief',
    title: 'Anxiety relief',
    desc: 'Ease worry and find grounding.',
    descBold: 'worry',
    duration: '~5 min',
    technique: '4-7-8',
    IconComponent: Sun,
    iconColor: '#D4A843',
    iconBg: '#F8EED8',
    techniqueKey: '4-7-8',
  },
  {
    id: 'sleep',
    title: 'Sleep',
    desc: 'Prepare your body for deep rest.',
    duration: '~8 min',
    technique: 'Calm',
    IconComponent: Moon,
    iconColor: '#6B8ED4',
    iconBg: '#E8EDF8',
    techniqueKey: 'Calm',
  },
  {
    id: 'release',
    title: 'Release',
    desc: 'Let go of stress and racing thoughts.',
    duration: '~5 min',
    technique: '4-7-8',
    IconComponent: Wind,
    iconColor: '#43B4A8',
    iconBg: '#D8F4F2',
    techniqueKey: '4-7-8',
  },
  {
    id: 'drift',
    title: 'Drift',
    desc: 'Slow down and drift toward rest.',
    duration: '~5 min',
    technique: 'Calm',
    IconComponent: Droplets,
    iconColor: '#6B9ED4',
    iconBg: '#DDE8F5',
    techniqueKey: 'Calm',
  },
  {
    id: 'balance',
    title: 'Balance',
    desc: 'Find even rhythm and inner clarity.',
    duration: '~4 min',
    technique: '5-5',
    IconComponent: Sparkles,
    iconColor: '#D468B4',
    iconBg: '#F8D8F0',
    techniqueKey: 'Resonance',
  },
] as const;

export const SESSIONS = SESSION_DATA;

export type BreatheSession = (typeof SESSIONS)[number];

function SessionDesc({ desc, boldWord }: { desc: string; boldWord?: string }) {
  if (!boldWord || !desc.includes(boldWord)) {
    return <Text style={styles.cardDesc}>{desc}</Text>;
  }

  const [before, after] = desc.split(boldWord);
  return (
    <Text style={styles.cardDesc}>
      {before}
      <Text style={styles.descBold}>{boldWord}</Text>
      {after}
    </Text>
  );
}

export function BreatheSessionGrid({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect: (session: BreatheSession) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 18 * 2 - 10 * 2) / 3;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>CHOOSE A SESSION</Text>
      <View style={styles.grid}>
        {SESSIONS.map((session) => {
          const active = selectedId === session.id;
          const Icon = session.IconComponent;
          const boldWord = 'descBold' in session ? session.descBold : undefined;
          return (
            <Pressable
              key={session.id}
              onPress={() => {
                void hapticLight();
                onSelect(session);
              }}
              style={({ pressed }) => [
                styles.card,
                { width: cardWidth },
                active && styles.cardActive,
                pressChipStyle(session.iconColor, pressed),
              ]}
            >
              <View style={styles.iconRow}>
                <View style={[styles.iconCircle, { backgroundColor: session.iconBg }]}>
                  <Icon size={15} color={session.iconColor} strokeWidth={2} />
                </View>
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {session.title}
              </Text>
              <SessionDesc desc={session.desc} boldWord={boldWord} />
              <View style={styles.cardFooter}>
                <Text style={styles.cardMeta}>
                  {session.duration} • {session.technique}
                </Text>
                <ChevronRight size={10} color={BREATHE_COLORS.meta} strokeWidth={2} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2.2,
    textAlign: 'left',
    color: BREATHE_COLORS.label,
    marginBottom: 8,
    paddingHorizontal: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 18,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BREATHE_COLORS.cardBorder,
    shadowColor: '#7B5CFF',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    minHeight: 148,
    alignItems: 'center',
  },
  cardActive: {
    borderColor: BREATHE_COLORS.accentBorder,
    borderWidth: 1.5,
  },
  iconRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: BREATHE_SERIF,
    color: BREATHE_COLORS.plumTitle,
    marginBottom: 4,
    textAlign: 'center',
    width: '100%',
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: BREATHE_COLORS.plumMuted,
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  descBold: {
    fontWeight: '700',
    color: BREATHE_COLORS.plumBody,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: '100%',
  },
  cardMeta: {
    fontSize: 10,
    color: BREATHE_COLORS.meta,
    fontWeight: '500',
  },
});
