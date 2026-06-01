import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  BookOpen,
  ChevronRight,
  Heart,
  Lock,
  Menu,
  RefreshCw,
  Search,
  Sparkles,
  Wind,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainScreenKey } from '../navigation/AppNavigation';
import { useCircadianTheme, type CircadianTheme } from '../../theme/circadianTheme';
import {
  buildWeekMoodStrip,
  countWeekCheckIns,
  getTodayCheckIn,
  greetingForHour,
  SANCTUARY_REMINDERS,
} from '../../utils/sanctuaryHome';

const PENDING_TALK_QUERY_KEY = 'pendingTalkQuery';
const SERIF = 'Georgia';
const PEACH_A = '#F6B27E';
const PEACH_B = '#E97D6A';
const NAV_CONTENT_HEIGHT = 72;

type CheckInRow = {
  date: string;
  mood?: { emoji?: string; label?: string };
};

function SanctuaryGlassCard({
  theme,
  children,
  style,
}: {
  theme: CircadianTheme;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View
      style={[
        styles.glassCard,
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SanctuaryOrb({ theme, size = 132 }: { theme: CircadianTheme; size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = useState(false);
  const ringSize = size + 10;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.75] });

  return (
    <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size * 1.35,
          height: size * 1.35,
          borderRadius: size * 0.675,
          backgroundColor: theme.glow,
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
        }}
      />
      <LinearGradient
        colors={[...theme.ringGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: ringSize, height: ringSize, borderRadius: ringSize / 2, position: 'absolute' }}
      />
      <View
        style={{
          width: ringSize - 4,
          height: ringSize - 4,
          borderRadius: (ringSize - 4) / 2,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {failed ? (
          <Text style={{ fontSize: size * 0.42 }}>🌿</Text>
        ) : (
          <Image
            source={theme.emoFace}
            onError={() => setFailed(true)}
            resizeMode="contain"
            style={{ width: size, height: size }}
          />
        )}
      </View>
    </View>
  );
}

function SectionLabel({ children, color }: { children: string; color: string }) {
  return <Text style={[styles.sectionLabel, { color }]}>{children}</Text>;
}

export function SanctuaryDashboard({
  userName,
  onNav,
  onOpenMenu,
}: {
  userName: string;
  onNav: (key: MainScreenKey) => void;
  onOpenMenu: () => void;
}) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const displayName = userName.trim() || 'friend';
  const [oracleQuery, setOracleQuery] = useState('');
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [reminderIdx, setReminderIdx] = useState(0);

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const weekStrip = useMemo(() => buildWeekMoodStrip(checkIns), [checkIns]);
  const todayEntry = useMemo(() => getTodayCheckIn(checkIns), [checkIns]);
  const weekCount = useMemo(() => countWeekCheckIns(checkIns), [checkIns]);

  useEffect(() => {
    AsyncStorage.getItem('checkIns')
      .then((raw) => {
        if (raw) setCheckIns(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const submitOracleQuery = async () => {
    const trimmed = oracleQuery.trim();
    if (trimmed) {
      try {
        await AsyncStorage.setItem(PENDING_TALK_QUERY_KEY, trimmed);
      } catch {}
    }
    onNav('talk');
  };

  const emoNotice = todayEntry
    ? `Emo noticed you checked in today, ${displayName}. I'm here whenever you're ready.`
    : `${displayName}, this is your sanctuary — take your time. I'm here when you're ready.`;

  const moodInsight = todayEntry?.mood?.label
    ? `You checked in as ${todayEntry.mood.label} today. What you write stays private here — but it helps this space feel truly yours.`
    : 'When you check in, this space learns your rhythm — gently, privately, on your device only.';

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: NAV_CONTENT_HEIGHT + insets.bottom + 28,
        paddingHorizontal: 18,
      }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topRow}>
        <Pressable onPress={onOpenMenu} style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Menu size={18} color={theme.secondaryText} strokeWidth={2.2} />
        </Pressable>
        <Pressable style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Bell size={18} color={theme.secondaryText} strokeWidth={2.2} />
        </Pressable>
      </View>

      <Text style={[styles.sanctuaryEyebrow, { color: theme.accent }]}>SANCTUARY</Text>
      <Text style={[styles.sanctuaryTagline, { color: theme.mutedText }]}>Intelligence with Soul.</Text>

      <Text style={[styles.greetingTitle, { color: theme.text }]}>
        {greeting},{'\n'}
        {displayName} 💜
      </Text>
      <Text style={[styles.greetingSub, { color: theme.secondaryText }]}>This is your sanctuary. ♡</Text>

      <View style={styles.orbWrap}>
        <SanctuaryOrb theme={theme} size={132} />
      </View>

      <View style={[styles.emoBubble, { backgroundColor: `${theme.accent}18`, borderColor: `${theme.accent}30` }]}>
        <Sparkles size={16} color={theme.accent} strokeWidth={2.2} style={{ marginTop: 2 }} />
        <Text style={[styles.emoBubbleText, { color: theme.secondaryText }]}>{emoNotice}</Text>
      </View>

      <SanctuaryGlassCard theme={theme} style={styles.block}>
        <Text style={[styles.cardTitleSerif, { color: theme.text }]}>How are you feeling today?</Text>
        <Text style={[styles.cardSubItalic, { color: theme.mutedText }]}>
          Has your heart been feeling steadier lately?
        </Text>
        <View style={styles.moodRow}>
          {weekStrip.map((day, i) => {
            const active = day.isToday;
            return (
              <TouchableOpacity
                key={`${day.label}-${i}`}
                activeOpacity={0.85}
                onPress={() => onNav('checkin')}
                style={styles.moodCol}
              >
                {active ? (
                  <LinearGradient
                    colors={[PEACH_A, PEACH_B]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.moodDotActive}
                  >
                    <Text style={styles.moodEmoji}>{day.moodEmoji ?? '🙂'}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.moodDot, { borderColor: `${theme.accent}40`, backgroundColor: theme.card }]}>
                    <Text style={styles.moodEmoji}>{day.checked ? day.moodEmoji ?? '✓' : '+'}</Text>
                  </View>
                )}
                <Text style={[styles.moodDayLabel, { color: active ? PEACH_B : theme.mutedText }]}>{day.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SanctuaryGlassCard>

      <View style={styles.actionGrid}>
        <TouchableOpacity activeOpacity={0.88} onPress={() => onNav('checkin')} style={styles.actionFlex}>
          <LinearGradient colors={[PEACH_A, PEACH_B]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionPrimary}>
            <Heart size={20} color="#fff" fill="#fff" strokeWidth={2} />
            <Text style={styles.actionPrimaryText}>Check In</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onNav('journal')}
          style={[styles.actionSecondary, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <BookOpen size={20} color={theme.accent} strokeWidth={2.2} />
          <Text style={[styles.actionSecondaryText, { color: theme.text }]}>Journal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onNav('breathe')}
          style={[styles.actionSecondary, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Wind size={20} color={theme.accent} strokeWidth={2.2} />
          <Text style={[styles.actionSecondaryText, { color: theme.text }]}>Breathe</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => onNav('talk')}
        style={[styles.talkRow, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={[styles.talkOrbMini, { borderColor: `${theme.accent}55` }]}>
          <SanctuaryOrb theme={theme} size={28} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.talkTitle, { color: theme.text }]}>Talk to Emo</Text>
          <Text style={[styles.talkSub, { color: theme.mutedText }]}>Search, analyze, plan — or just be heard.</Text>
        </View>
        <ChevronRight size={20} color={theme.mutedText} strokeWidth={2.2} />
      </TouchableOpacity>

      <View style={[styles.searchRow, { backgroundColor: theme.card, borderColor: `${theme.accent}35` }]}>
        <Search size={16} color={theme.accent} strokeWidth={2.2} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Ask Emo anything… search knowledge or reflect"
          placeholderTextColor={theme.mutedText}
          value={oracleQuery}
          onChangeText={setOracleQuery}
          onSubmitEditing={() => void submitOracleQuery()}
          returnKeyType="search"
        />
      </View>

      <SanctuaryGlassCard theme={theme} style={styles.block}>
        <View style={styles.briefHeader}>
          <Text style={[styles.briefTitle, { color: theme.text }]}>Daily executive briefing</Text>
          <View style={[styles.lifeOsBadge, { backgroundColor: `${theme.accent}22` }]}>
            <Text style={[styles.lifeOsBadgeText, { color: theme.accent }]}>LIFE OS</Text>
          </View>
        </View>
        {[
          'Market trend analysis for Project X complete',
          'Calendar optimized for deep-focus work blocks',
          'Personal resilience milestone reached last week',
        ].map((line, i) => (
          <View key={line} style={[styles.briefLine, i < 2 && styles.briefLineGap]}>
            <Text style={[styles.briefNum, { color: theme.accent }]}>{String(i + 1).padStart(2, '0')}</Text>
            <Text style={[styles.briefCopy, { color: theme.secondaryText }]}>{line}</Text>
          </View>
        ))}
      </SanctuaryGlassCard>

      <SanctuaryGlassCard theme={theme} style={styles.block}>
        <SectionLabel color={theme.accent}>Evening wind-down</SectionLabel>
        <Text style={[styles.windDownTitle, { color: theme.text }]}>
          Let the day settle. What still needs a little gentleness?
        </Text>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onNav('journal')}
          style={[styles.windDownBtn, { backgroundColor: `${theme.accent}22` }]}
        >
          <Text style={[styles.windDownBtnText, { color: theme.accent }]}>Reflect in journal →</Text>
        </TouchableOpacity>
      </SanctuaryGlassCard>

      <SanctuaryGlassCard theme={theme} style={styles.block}>
        <SectionLabel color={theme.accent}>Emotional insight</SectionLabel>
        <Text style={[styles.insightTitle, { color: theme.text }]}>Emo is holding your words</Text>
        <Text style={[styles.insightBody, { color: theme.secondaryText }]}>{moodInsight}</Text>
        <View style={[styles.streakDivider, { borderTopColor: `${theme.accent}25` }]}>
          <View style={styles.streakHeader}>
            <View>
              <Text style={[styles.streakEyebrow, { color: theme.mutedText }]}>THIS WEEK</Text>
              <Text style={[styles.streakSub, { color: theme.secondaryText }]}>
                {weekCount} of 7 days checked in
              </Text>
            </View>
            <TouchableOpacity onPress={() => onNav('checkin')}>
              <Text style={[styles.streakLink, { color: theme.accent }]}>See all →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.streakRow}>
            {weekStrip.map((day, i) => (
              <View key={`streak-${i}`} style={styles.streakCol}>
                {day.checked ? (
                  <LinearGradient
                    colors={[theme.accent, theme.ringGradient[1]]}
                    style={styles.streakDotDone}
                  >
                    <Text style={styles.streakCheck}>✓</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.streakDotEmpty, { borderColor: `${theme.accent}40` }]} />
                )}
                <Text style={[styles.streakDay, { color: theme.mutedText }]}>{day.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </SanctuaryGlassCard>

      <SanctuaryGlassCard theme={theme} style={[styles.block, styles.lockedCard]}>
        <View style={styles.lockedHeader}>
          <Lock size={14} color={theme.mutedText} strokeWidth={2.2} />
          <Text style={[styles.lockedEyebrow, { color: theme.secondaryText }]}>PHASE 3 · LIFE OS</Text>
        </View>
        <Text style={[styles.lockedTitle, { color: theme.text }]}>Today Dashboard coming soon</Text>
        <Text style={[styles.lockedSub, { color: theme.mutedText }]}>
          Deep Focus, Low-Energy Admin, and Restorative triage — arriving in a future release.
        </Text>
      </SanctuaryGlassCard>

      <LinearGradient
        colors={
          theme.isDark
            ? (['#1d1136', '#120a26'] as [string, string])
            : ([`${theme.accent}22`, `${theme.accent}10`] as [string, string])
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.reflectionCard, { borderColor: `${theme.accent}30` }]}
      >
        <View style={styles.reflectionHeader}>
          <Sparkles size={13} color={theme.accent} strokeWidth={2.2} />
          <Text style={[styles.reflectionEyebrow, { color: theme.secondaryText }]}>DAILY REFLECTION</Text>
        </View>
        <Text style={[styles.reflectionQuote, { color: theme.text }]}>“{SANCTUARY_REMINDERS[reminderIdx]}”</Text>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setReminderIdx((i) => (i + 1) % SANCTUARY_REMINDERS.length)}
          style={styles.reflectionBtn}
        >
          <RefreshCw size={13} color={theme.accent} strokeWidth={2.2} />
          <Text style={[styles.reflectionBtnText, { color: theme.accent }]}>Another reminder</Text>
        </TouchableOpacity>
      </LinearGradient>

      <Text style={[styles.crisisFooter, { color: theme.mutedText }]}>
        If you are in crisis or may hurt yourself, please contact local emergency services or a crisis
        helpline immediately. In the US: call or text 988. Sanctuary is a companion — not emergency care.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sanctuaryEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 4,
  },
  sanctuaryTagline: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 13,
    marginBottom: 8,
  },
  greetingTitle: {
    fontFamily: SERIF,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '500',
  },
  greetingSub: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 15,
    marginTop: 6,
    marginBottom: 4,
  },
  orbWrap: { alignItems: 'center', marginVertical: 14 },
  emoBubble: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  emoBubbleText: { flex: 1, fontSize: 13.5, lineHeight: 20 },
  glassCard: {
    borderRadius: 22,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 14,
  },
  block: { marginBottom: 14 },
  cardTitleSerif: { fontFamily: SERIF, fontSize: 19, fontWeight: '500' },
  cardSubItalic: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 14,
  },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodCol: { alignItems: 'center', gap: 6 },
  moodDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodDotActive: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: { fontSize: 18 },
  moodDayLabel: { fontSize: 11, fontWeight: '600' },
  actionGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  actionFlex: { flex: 1.1 },
  actionPrimary: {
    height: 84,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  actionSecondary: {
    flex: 1,
    height: 84,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionSecondaryText: { fontSize: 14, fontWeight: '700' },
  talkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0.5,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  talkOrbMini: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  talkTitle: { fontSize: 16, fontWeight: '700' },
  talkSub: { fontSize: 13, marginTop: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  briefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  briefTitle: { fontSize: 15, fontWeight: '700' },
  lifeOsBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9 },
  lifeOsBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  briefLine: { flexDirection: 'row', gap: 9 },
  briefLineGap: { marginBottom: 8 },
  briefNum: { fontSize: 12, fontWeight: '700', minWidth: 16 },
  briefCopy: { flex: 1, fontSize: 13, lineHeight: 19 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  windDownTitle: { fontFamily: SERIF, fontSize: 19, lineHeight: 25, marginBottom: 14 },
  windDownBtn: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  windDownBtnText: { fontSize: 14, fontWeight: '700' },
  insightTitle: { fontFamily: SERIF, fontSize: 21, fontWeight: '500', marginBottom: 8 },
  insightBody: { fontSize: 14, lineHeight: 22 },
  streakDivider: { borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  streakEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  streakSub: { fontSize: 13, marginTop: 2 },
  streakLink: { fontSize: 13, fontWeight: '700' },
  streakRow: { flexDirection: 'row', justifyContent: 'space-between' },
  streakCol: { alignItems: 'center', gap: 6 },
  streakDotDone: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDotEmpty: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
  },
  streakCheck: { color: '#fff', fontSize: 13, fontWeight: '700' },
  streakDay: { fontSize: 11 },
  lockedCard: { opacity: 0.92 },
  lockedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  lockedEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  lockedTitle: { fontFamily: SERIF, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  lockedSub: { fontSize: 13, lineHeight: 20 },
  reflectionCard: { borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1 },
  reflectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  reflectionEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  reflectionQuote: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 24,
  },
  reflectionBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(157,122,230,0.18)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reflectionBtnText: { fontSize: 13, fontWeight: '600' },
  crisisFooter: {
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingTop: 4,
  },
});
