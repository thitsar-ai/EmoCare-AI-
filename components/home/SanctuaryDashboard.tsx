import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  Heart,
  RefreshCw,
  Sparkles,
  Sun,
  Wind,
} from 'lucide-react-native';
import { EmoOrb } from '../shared/EmoOrb';
import { MoodIconBadge } from '../shared/MoodIcon';
import { CrisisFooter } from '../shared/CrisisFooter';
import { OB_MOODS } from '../../constants/obMoods';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { useLayoutInsets } from '../../utils/safeAreaInsets';
import type { MainScreenKey } from '../navigation/AppNavigation';
import { NavChromeBtn, ScreenNavChrome } from '../navigation/AppNavigation';
import { useCircadianTheme, type CircadianTheme } from '../../theme/circadianTheme';
import {
  getSanctuaryTalkGradient,
  isSanctuaryDayArt,
} from '../../theme/sanctuaryHeroArt';
import { getSanctuaryIconAccent, getSanctuaryIconLink, getSanctuaryLabelAccent } from '../../theme/sanctuaryBrand';
import { hapticLight } from '../../utils/haptics';
import {
  pressCardStyle,
  pressChipStyle,
  pressHeroCardStyle,
  pressLinkStyle,
} from '../../utils/pressFeedback';
import {
  buildWeekMoodStrip,
  countWeekCheckIns,
  greetingForCircadianTimezone,
  resolveTimezoneId,
  SANCTUARY_REMINDERS,
} from '../../utils/sanctuaryHome';
import { NotificationSheet } from './NotificationSheet';
import { loadSettings } from '../../utils/settingsStorage';
import { SanctuaryScenicBackdrop } from './SanctuaryScenicBackdrop';

const SERIF = 'Georgia';
const NAV_CONTENT_HEIGHT = 72;

type CheckInRow = {
  date: string;
  mood?: { emoji?: string; label?: string };
};

function resolveWeekMood(day: { moodLabel: string | null; moodEmoji: string | null }) {
  if (day.moodLabel) {
    const byLabel = OB_MOODS.find((m) => m.label === day.moodLabel);
    if (byLabel) return byLabel;
  }
  if (day.moodEmoji) {
    return OB_MOODS.find((m) => m.emoji === day.moodEmoji) ?? null;
  }
  return null;
}

function WeekMoodDot({
  day,
  theme,
}: {
  day: {
    isToday: boolean;
    checked: boolean;
    moodLabel: string | null;
    moodEmoji: string | null;
  };
  theme: CircadianTheme;
}) {
  const mood = day.checked ? resolveWeekMood(day) : null;
  const active = day.isToday;

  if (day.checked && mood) {
    return <MoodIconBadge mood={mood} variant="week" active={active} />;
  }

  return (
    <View
      style={[
        styles.moodDot,
        {
          borderColor: active ? theme.accent : `${theme.accent}40`,
          backgroundColor: active ? `${theme.accent}10` : theme.card,
          borderWidth: active ? 1.5 : 1,
        },
      ]}
    >
      <Text style={[styles.moodPlus, { color: active ? theme.accent : getSanctuaryIconLink(theme) }]}>+</Text>
    </View>
  );
}

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

const HERO_H_PAD = 18;
const SCREEN_W = Dimensions.get('window').width;

function SanctuaryHero({
  theme,
  greeting,
  displayName,
}: {
  theme: CircadianTheme;
  greeting: string;
  displayName: string;
}) {
  const dayArt = isSanctuaryDayArt(theme.phase);
  const scrimStrong = dayArt ? 'rgba(237,229,245,0.82)' : 'rgba(10,5,32,0.88)';
  const scrimMid = dayArt ? 'rgba(237,229,245,0.38)' : 'rgba(10,5,32,0.42)';
  const scrimClear = dayArt ? 'rgba(237,229,245,0)' : 'rgba(10,5,32,0)';

  return (
    <View style={styles.heroSection}>
      <LinearGradient
        colors={
          dayArt
            ? ['rgba(237,229,245,0.55)', 'rgba(237,229,245,0.18)', 'transparent']
            : ['rgba(10,5,32,0.72)', 'rgba(10,5,32,0.24)', 'transparent']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[scrimStrong, scrimMid, scrimClear]}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0.75, y: 0.65 }}
        style={styles.heroVignette}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', dayArt ? 'rgba(237,229,245,0.2)' : 'rgba(10,5,32,0.22)']}
        start={{ x: 0.5, y: 0.65 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.heroBottomFade}
        pointerEvents="none"
      />

      <View style={styles.heroInner}>
        <View style={styles.heroBrandHeader}>
          <Text style={[styles.sanctuaryEyebrow, { color: theme.accent }]}>SANCTUARY</Text>
          <Text style={[styles.sanctuaryTaglineOnHero, { color: theme.mutedText }]}>
            Intelligence with Soul.
          </Text>
        </View>

        <View style={styles.heroMainRow}>
          <View style={styles.heroGreetingCol}>
            <Text style={[styles.greetingTitle, { color: theme.text }]}>
              {greeting},{'\n'}
              {displayName} 💜
            </Text>
            <Text style={[styles.greetingSub, { color: theme.secondaryText }]}>
              This is your sanctuary. ♡
            </Text>
          </View>
          <View style={styles.heroOrbCol} pointerEvents="none">
            <EmoOrb theme={theme} scale={0.91} faceScale={1.22} />
          </View>
        </View>
      </View>

      <LinearGradient
        colors={
          dayArt
            ? ['rgba(237,229,245,0.35)', 'rgba(237,229,245,0)']
            : ['rgba(26,16,53,0.3)', 'rgba(26,16,53,0)']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.heroFeather}
        pointerEvents="none"
      />
    </View>
  );
}

function SanctuaryTalkCard({
  theme,
  onPress,
}: {
  theme: CircadianTheme;
  onPress: () => void;
}) {
  const dayArt = isSanctuaryDayArt(theme.phase);
  const talkGradient = getSanctuaryTalkGradient(theme.phase);
  const scrimLeft = dayArt
    ? (['rgba(110,88,196,0.95)', 'rgba(110,88,196,0.68)', 'rgba(110,88,196,0)'] as const)
    : (['rgba(46,32,88,0.95)', 'rgba(46,32,88,0.68)', 'rgba(46,32,88,0)'] as const);

  return (
    <Pressable
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      style={({ pressed }) => [styles.talkHeroWrap, pressHeroCardStyle(pressed)]}
    >
      <LinearGradient
        colors={talkGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.talkHero}
      >
        <View style={styles.talkOrbWrap} pointerEvents="none">
          <View style={[styles.talkOrbPlate, { backgroundColor: `${theme.accent}18` }]}>
            <EmoOrb theme={theme} scale={0.52} pulse={false} />
          </View>
        </View>
        <LinearGradient
          colors={scrimLeft}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 0.6, y: 0.5 }}
          style={styles.heroVignette}
          pointerEvents="none"
        />
        <LinearGradient
          colors={
            dayArt
              ? ['transparent', 'rgba(139,110,212,0.28)']
              : ['transparent', 'rgba(69,53,117,0.28)']
          }
          start={{ x: 0.5, y: 0.68 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.talkHeroBottomFade}
          pointerEvents="none"
        />
        <View style={styles.talkHeroCopy}>
          <Text style={styles.talkHeroTitle}>Talk to Emo 💜</Text>
          <Text style={styles.talkHeroBody}>
            Your private companion who listens, understands, and supports you — always. Whatever is on
            your heart, we can begin there.
          </Text>
          <View style={styles.talkHeroBtn}>
            <Text style={styles.talkHeroBtnText}>Start Conversation</Text>
            <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.4} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function QuickActionCard({
  theme,
  icon: Icon,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  theme: CircadianTheme;
  icon: typeof Heart;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.quickCard,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressCardStyle(theme, pressed, iconColor),
      ]}
    >
      <View style={[styles.quickIconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Icon size={18} color={iconColor} strokeWidth={2.2} />
      </View>
      <Text style={[styles.quickTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.quickSub, { color: theme.mutedText }]} numberOfLines={2}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

function SanctuaryListRow({
  theme,
  icon: Icon,
  iconColor,
  title,
  body,
  linkLabel,
  badge,
  onPress,
  linkColor,
}: {
  theme: CircadianTheme;
  icon: typeof Sparkles;
  iconColor: string;
  title: string;
  body: string;
  linkLabel: string;
  badge?: string;
  onPress: () => void;
  linkColor: string;
}) {
  return (
    <Pressable
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.listRow,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressCardStyle(theme, pressed, iconColor),
      ]}
    >
      <View style={[styles.listIconWrap, { backgroundColor: `${iconColor}16` }]}>
        <Icon size={18} color={iconColor} strokeWidth={2.2} />
      </View>
      <View style={styles.listBody}>
        <View style={styles.listTitleRow}>
          <Text style={[styles.listTitle, { color: theme.text }]}>{title}</Text>
          {badge ? (
            <View style={[styles.listBadge, { backgroundColor: `${linkColor}22` }]}>
              <Text style={[styles.listBadgeText, { color: linkColor }]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.listCopy, { color: theme.mutedText }]}>{body}</Text>
      </View>
      <View style={styles.listLinkCol}>
        <Text style={[styles.listLink, { color: linkColor }]}>{linkLabel}</Text>
        <ChevronRight size={14} color={linkColor} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

export function SanctuaryDashboard({
  userName,
  onNav,
}: {
  userName: string;
  onNav: (key: MainScreenKey) => void;
}) {
  const theme = useCircadianTheme();
  const { bottom: bottomInset } = useLayoutInsets();
  const displayName = userName.trim() || 'friend';
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [reminderIdx, setReminderIdx] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [timezoneId, setTimezoneId] = useState('America/New_York');
  const [localHour, setLocalHour] = useState(new Date().getHours());

  const greeting = useMemo(
    () => greetingForCircadianTimezone(timezoneId),
    [timezoneId, localHour],
  );

  const weekStrip = useMemo(() => buildWeekMoodStrip(checkIns), [checkIns]);
  const weekCount = useMemo(() => countWeekCheckIns(checkIns), [checkIns]);
  const showEveningReflection = localHour >= 17;
  const iconAccent = getSanctuaryIconAccent(theme);
  const iconLink = getSanctuaryIconLink(theme);
  const labelAccent = getSanctuaryLabelAccent(theme);

  useEffect(() => {
    AsyncStorage.getItem('checkIns')
      .then((raw) => {
        if (raw) setCheckIns(JSON.parse(raw));
      })
      .catch(() => {});
    void loadSettings().then((s) => {
      setNotificationsOn(s.notificationsEnabled !== false);
      const tz = resolveTimezoneId(s.timezone);
      setTimezoneId(tz);
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: 'numeric',
          hour12: false,
        }).formatToParts(new Date());
        const hourPart = parts.find((p) => p.type === 'hour');
        if (hourPart) setLocalHour(Number.parseInt(hourPart.value, 10) % 24);
      } catch {
        setLocalHour(new Date().getHours());
      }
    });
  }, []);

  useEffect(() => {
    const tick = () => {
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: timezoneId,
          hour: 'numeric',
          hour12: false,
        }).formatToParts(new Date());
        const hourPart = parts.find((p) => p.type === 'hour');
        if (hourPart) setLocalHour(Number.parseInt(hourPart.value, 10) % 24);
      } catch {
        setLocalHour(new Date().getHours());
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [timezoneId]);

  return (
    <View style={styles.flex}>
      <SanctuaryScenicBackdrop theme={theme} />
      <ScreenSafeArea extraTop={0}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            paddingBottom: NAV_CONTENT_HEIGHT + bottomInset + 64,
            paddingHorizontal: 18,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.chromeWrap}>
            <ScreenNavChrome
              theme={theme}
              title=""
              compact
              actionsBeforeNav={
                <NavChromeBtn
                  theme={theme}
                  onPress={() => setNotificationsOpen(true)}
                  accessibilityLabel="Notification settings"
                >
                  <Bell size={17} color={theme.secondaryText} strokeWidth={2.2} />
                  {notificationsOn ? (
                    <View
                      style={[styles.notifDot, { backgroundColor: theme.accent, borderColor: theme.card }]}
                    />
                  ) : null}
                </NavChromeBtn>
              }
            />
          </View>

          <SanctuaryHero theme={theme} greeting={greeting} displayName={displayName} />

          <SanctuaryGlassCard theme={theme} style={styles.moodCard}>
            <View style={styles.moodHeader}>
              <Text style={[styles.cardTitleSerif, { color: theme.text }]}>
                How are you feeling today?
              </Text>
              <Pressable
                onPress={() => {
                  void hapticLight();
                  onNav('checkin');
                }}
                hitSlop={8}
                style={({ pressed }) => pressLinkStyle(theme, pressed)}
              >
                <Text style={[styles.editLink, { color: theme.accent }]}>Edit</Text>
              </Pressable>
            </View>
            <View style={styles.moodRow}>
              {weekStrip.map((day, i) => {
                const active = day.isToday;
                return (
                  <Pressable
                    key={`${day.label}-${i}`}
                    onPress={() => {
                      void hapticLight();
                      onNav('checkin');
                    }}
                    style={({ pressed }) => [styles.moodCol, pressChipStyle(theme.accent, pressed)]}
                  >
                    <WeekMoodDot day={day} theme={theme} />
                    <Text style={[styles.moodDayLabel, { color: active ? theme.accent : iconLink }]}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SanctuaryGlassCard>

          <SanctuaryTalkCard theme={theme} onPress={() => onNav('talk')} />

          <Text style={[styles.sectionEyebrow, { color: labelAccent }]}>QUICK ACTIONS</Text>
          <View style={styles.quickRow}>
            <QuickActionCard
              theme={theme}
              icon={Heart}
              iconColor="#E97D6A"
              title="Check In"
              subtitle="How are you feeling now?"
              onPress={() => onNav('checkin')}
            />
            <QuickActionCard
              theme={theme}
              icon={BookOpen}
              iconColor={iconAccent}
              title="Journal"
              subtitle="Write your thoughts and reflect"
              onPress={() => onNav('journal')}
            />
            <QuickActionCard
              theme={theme}
              icon={Wind}
              iconColor="#6B7FD7"
              title="Breathe"
              subtitle="Reset your mind and body"
              onPress={() => onNav('breathe')}
            />
          </View>

          <View style={styles.listSection}>
            <SanctuaryListRow
              theme={theme}
              icon={BarChart3}
              iconColor={iconAccent}
              title="Emotional Insights"
              body="Discover patterns and rhythms in your emotional journey."
              linkLabel="View Insights"
              linkColor={iconLink}
              badge={weekCount > 0 ? 'New' : undefined}
              onPress={() => onNav('insights')}
            />
            {showEveningReflection ? (
              <SanctuaryListRow
                theme={theme}
                icon={Sun}
                iconColor="#E89B5C"
                title="Evening Reflection"
                body="As the day comes to a close… What still needs a little kindness today?"
                linkLabel="Reflect in Journal"
                linkColor={iconLink}
                onPress={() => onNav('journal')}
              />
            ) : null}
            <Pressable
              onPress={() => {
                void hapticLight();
                setReminderIdx((i) => (i + 1) % SANCTUARY_REMINDERS.length);
              }}
              style={({ pressed }) => [
                styles.listRow,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressCardStyle(theme, pressed, iconAccent),
              ]}
            >
              <View style={[styles.listIconWrap, { backgroundColor: `${iconAccent}16` }]}>
                <Sparkles size={18} color={iconAccent} strokeWidth={2.2} />
              </View>
              <View style={styles.listBody}>
                <Text style={[styles.listTitle, { color: theme.text }]}>Daily Reflection</Text>
                <Text style={[styles.listCopy, { color: theme.mutedText }]}>
                  A gentle reminder for today — {SANCTUARY_REMINDERS[reminderIdx]}
                </Text>
              </View>
              <View style={styles.listLinkCol}>
                <RefreshCw size={14} color={iconLink} strokeWidth={2.2} />
                <Text style={[styles.listLink, { color: iconLink }]}>Another Reminder</Text>
              </View>
            </Pressable>
          </View>

          {weekCount > 0 ? (
            <Text style={[styles.weekQuiet, { color: theme.mutedText }]}>
              {weekCount} of 7 days checked in this week
            </Text>
          ) : null}

          <Pressable
            onPress={() => {
              void hapticLight();
              onNav('today');
            }}
            hitSlop={10}
            style={({ pressed }) => [styles.todayLinkWrap, pressLinkStyle(theme, pressed)]}
          >
            <Text style={[styles.todayLinkHint, { color: theme.mutedText }]}>
              Tasks & planning live on{' '}
              <Text style={[styles.todayLinkAccent, { color: iconLink }]}>Today →</Text>
            </Text>
          </Pressable>

          <CrisisFooter theme={theme} style={styles.crisisFooterWrap} />
          <View style={{ height: bottomInset > 0 ? 8 : 16 }} />
        </ScrollView>
      </ScreenSafeArea>

      <NotificationSheet
        visible={notificationsOpen}
        theme={theme}
        onClose={() => setNotificationsOpen(false)}
        onSaved={(enabled) => setNotificationsOn(enabled)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chromeWrap: { paddingHorizontal: 8, marginBottom: 6 },
  notifDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  sanctuaryEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  sanctuaryTaglineOnHero: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  heroSection: {
    marginHorizontal: -HERO_H_PAD,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  heroInner: {
    paddingHorizontal: HERO_H_PAD + 6,
    paddingTop: 0,
    paddingBottom: 10,
    zIndex: 2,
  },
  heroBrandHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: -4,
  },
  heroGreetingCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  heroOrbCol: {
    flexShrink: 0,
    marginTop: -8,
    marginRight: -6,
  },
  heroBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
  },
  heroFeather: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 24,
    zIndex: 1,
  },
  greetingTitle: {
    fontFamily: SERIF,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400',
  },
  greetingSub: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    marginTop: 16,
  },
  heroVignette: {
    ...StyleSheet.absoluteFillObject,
  },
  glassCard: {
    borderRadius: 22,
    borderWidth: 0.5,
    padding: 16,
  },
  moodCard: { marginTop: -6, marginBottom: 12, paddingVertical: 18 },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitleSerif: { fontFamily: SERIF, fontSize: 17, fontWeight: '500', flex: 1 },
  editLink: { fontSize: 13, fontWeight: '700' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -2 },
  moodCol: { alignItems: 'center', gap: 6, minWidth: 40 },
  moodDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodPlus: { fontSize: 16, fontWeight: '600' },
  moodDayLabel: { fontSize: 11, fontWeight: '600' },
  talkHeroWrap: { marginBottom: 12, borderRadius: 22, overflow: 'hidden' },
  talkHero: {
    minHeight: 176,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  talkOrbWrap: {
    position: 'absolute',
    right: 10,
    top: 12,
    zIndex: 1,
  },
  talkOrbPlate: {
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  talkHeroBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
  },
  talkHeroCopy: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    maxWidth: '64%',
    zIndex: 2,
  },
  talkHeroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: SERIF,
    marginBottom: 8,
  },
  talkHeroBody: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  talkHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  talkHeroBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 0.5,
    paddingHorizontal: 9,
    paddingVertical: 11,
    minHeight: 108,
  },
  quickIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickTitle: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  quickSub: { fontSize: 9, lineHeight: 12 },
  listSection: { gap: 10, marginBottom: 20 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 0.5,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  listIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBody: { flex: 1, minWidth: 0 },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  listTitle: { fontSize: 14, fontWeight: '700' },
  listBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  listBadgeText: { fontSize: 10, fontWeight: '700' },
  listCopy: { fontSize: 12, lineHeight: 18 },
  listLinkCol: { alignItems: 'flex-end', gap: 2, maxWidth: 96, flexShrink: 0 },
  listLink: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  weekQuiet: { fontSize: 12, textAlign: 'center', marginBottom: 8 },
  todayLinkWrap: { marginBottom: 16 },
  todayLinkHint: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  todayLinkAccent: { fontWeight: '600' },
  crisisFooterWrap: {
    marginTop: 8,
    paddingHorizontal: 6,
  },
});
