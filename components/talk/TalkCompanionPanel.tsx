import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import {
  buildTalkHeroLines,
  TALK_CONVERSATION_STARTERS,
  TALK_CONVERSATION_SURFACE,
} from '../../constants/brandCopy';
import { tokens } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import { CircadianGlassCard, SERIF } from '../shared/CircadianHeroGlow';
import { TalkHeroEmo } from './TalkHeroEmo';

type LastCheckIn = {
  label: string | null;
  emoji: string | null;
  relativeTime: string;
};

type Props = {
  theme: CircadianTheme;
  userName: string;
  lastCheckIn: LastCheckIn | null;
  onStarterPress: (text: string) => void;
};

export function TalkCompanionPanel({ theme, userName, lastCheckIn, onStarterPress }: Props) {
  const hero = buildTalkHeroLines(userName);

  return (
    <View style={styles.panel}>
      <View style={styles.heroOrbBlock}>
        <TalkHeroEmo theme={theme} />
      </View>

      <View style={styles.welcomeBlock} accessibilityRole="header">
        <Text style={[styles.welcomeLine1, { color: theme.text }]}>{hero.greeting}</Text>
        <Text style={[styles.welcomeLineWelcome, { color: theme.secondaryText }]}>{hero.welcomeBack}</Text>
        <Text style={[styles.welcomeLine2, { color: theme.text }]}>{hero.presence}</Text>
        <Text style={[styles.welcomeLine3, { color: theme.secondaryText }]}>{hero.prompt}</Text>
      </View>

      {lastCheckIn?.label ? (
        <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.checkInCard}>
          <Text style={[styles.checkInEyebrow, { color: theme.secondaryText }]}>💜 Last Check-In</Text>
          <Text style={[styles.checkInLine, { color: theme.text }]}>
            {lastCheckIn.emoji ? `${lastCheckIn.emoji} ` : ''}
            {lastCheckIn.label}
            {lastCheckIn.relativeTime ? ` • ${lastCheckIn.relativeTime}` : ''}
          </Text>
        </CircadianGlassCard>
      ) : null}

      <Text style={[styles.starterEyebrow, { color: theme.secondaryText }]}>Start with one of these</Text>
      <View style={styles.starterCloud}>
        {TALK_CONVERSATION_STARTERS.map((starter) => (
          <Pressable
            key={starter.text}
            onPress={() => {
              void hapticLight();
              onStarterPress(starter.text);
            }}
            style={({ pressed }) => [
              styles.starterChip,
              {
                borderColor: tokens.border.standard,
                backgroundColor: TALK_CONVERSATION_SURFACE,
              },
              pressed && { opacity: 0.88 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={starter.text}
          >
            <Text style={styles.starterIcon}>{starter.icon}</Text>
            <Text style={[styles.starterText, { color: theme.text }]}>{starter.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingBottom: 16,
  },
  heroOrbBlock: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    overflow: 'visible',
    paddingTop: 10,
    paddingBottom: 6,
  },
  welcomeBlock: {
    alignItems: 'center',
    paddingHorizontal: 28,
    marginBottom: 22,
    gap: 10,
  },
  welcomeLine1: {
    fontFamily: SERIF,
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
  },
  welcomeLineWelcome: {
    fontFamily: SERIF,
    fontSize: 17,
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  welcomeLine2: {
    fontFamily: SERIF,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
  welcomeLine3: {
    fontFamily: SERIF,
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
  },
  checkInCard: {
    marginBottom: 22,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  checkInEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  checkInLine: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  starterEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  starterCloud: {
    gap: 8,
  },
  starterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  starterIcon: {
    fontSize: 16,
  },
  starterText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
