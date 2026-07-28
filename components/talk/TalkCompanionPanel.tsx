import React, { useMemo } from 'react';
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
import { useUiCopy } from '../i18n/UiCopyProvider';

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

const STARTER_KEYS = [
  'talk.starter1',
  'talk.starter2',
  'talk.starter3',
  'talk.starter4',
  'talk.starter5',
  'talk.starter6',
] as const;

export function TalkCompanionPanel({ theme, userName, lastCheckIn, onStarterPress }: Props) {
  const { t, locale } = useUiCopy();
  const myanmar = locale === 'my';
  const hero = useMemo(() => {
    if (!myanmar) return buildTalkHeroLines(userName);
    const name = userName.trim() || 'သူငယ်ချင်း';
    return {
      greeting: t('talk.helloNamed', { name }),
      welcomeBack: t('talk.welcomeBack'),
      presence: t('talk.emoWithYou'),
      prompt: t('talk.whatsOnHeartToday'),
    };
  }, [myanmar, t, userName]);

  const starters = useMemo(() => {
    if (!myanmar) return TALK_CONVERSATION_STARTERS.map((s) => ({ icon: s.icon, text: s.text }));
    return STARTER_KEYS.map((key, i) => ({
      icon: TALK_CONVERSATION_STARTERS[i]?.icon || '💭',
      text: t(key),
    }));
  }, [myanmar, t]);

  return (
    <View style={styles.panel}>
      <View style={styles.heroOrbBlock}>
        <TalkHeroEmo theme={theme} />
      </View>

      <View style={styles.welcomeBlock} accessibilityRole="header">
        <Text
          style={[
            styles.welcomeLine1,
            myanmar && styles.welcomeMy,
            { color: theme.text },
          ]}
        >
          {hero.greeting}
        </Text>
        <Text
          style={[
            styles.welcomeLineWelcome,
            myanmar && styles.welcomeMy,
            { color: theme.secondaryText },
          ]}
        >
          {hero.welcomeBack}
        </Text>
        <Text
          style={[
            styles.welcomeLine2,
            myanmar && styles.welcomeMy,
            { color: theme.text },
          ]}
        >
          {hero.presence}
        </Text>
        <Text
          style={[
            styles.welcomeLine3,
            myanmar && styles.welcomeMy,
            { color: theme.secondaryText },
          ]}
        >
          {hero.prompt}
        </Text>
      </View>

      {lastCheckIn?.label ? (
        <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.checkInCard}>
          <Text style={[styles.checkInEyebrow, myanmar && styles.welcomeMy, { color: theme.secondaryText }]}>
            💜 {t('talk.lastCheckIn')}
          </Text>
          <Text style={[styles.checkInLine, myanmar && styles.welcomeMy, { color: theme.text }]}>
            {lastCheckIn.emoji ? `${lastCheckIn.emoji} ` : ''}
            {lastCheckIn.label}
            {lastCheckIn.relativeTime ? ` • ${lastCheckIn.relativeTime}` : ''}
          </Text>
        </CircadianGlassCard>
      ) : null}

      <Text style={[styles.starterEyebrow, myanmar && styles.welcomeMy, { color: theme.secondaryText }]}>
        {t('talk.starterTitle')}
      </Text>
      <View style={styles.starterCloud}>
        {starters.map((starter) => (
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
            <Text style={[styles.starterText, myanmar && styles.welcomeMy, { color: theme.text }]}>
              {starter.text}
            </Text>
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
    marginTop: 4,
    marginBottom: 4,
    overflow: 'visible',
    paddingTop: 14,
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
    lineHeight: 24,
    textAlign: 'center',
  },
  welcomeMy: {
    letterSpacing: 0,
    fontFamily: undefined,
    fontStyle: 'normal',
    lineHeight: 30,
  },
  checkInCard: {
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 14,
  },
  checkInEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  checkInLine: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  starterEyebrow: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  starterCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  starterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: '100%',
  },
  starterIcon: {
    fontSize: 14,
  },
  starterText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
});
