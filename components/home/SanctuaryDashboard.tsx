import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3,
  Bell,
  Brain,
  ChevronRight,
  Heart,
  Sparkles,
  Sun,
} from 'lucide-react-native';
import { BRAND_TAGLINE } from '../../constants/brandCopy';
import { SanctuaryEmoPresence } from '../shared/SanctuaryEmoPresence';
import { SANCTUARY_EMO_HOME_SCALE, SANCTUARY_EMO_STANDARD_SCALE, getSanctuaryEmoStageSize } from '../../theme/sanctuaryEmoFace';
import { SanctuaryMemoryBadge, memoryMoodFromChipLabel } from './SanctuaryMemoryBadge';
import { loadEmoPersonalContext } from '../../utils/emoPersonalContext';
import { MoodIconBadge } from '../shared/MoodIcon';
import { DailyReflectionHero } from './DailyReflectionHero';
import { GentleInsightCard } from './GentleInsightCard';
import { OB_MOODS } from '../../constants/obMoods';
import { ScreenSafeArea, NavChromeShell } from '../shared/ScreenSafeArea';
import { useLayoutInsets } from '../../utils/safeAreaInsets';
import type { MainScreenKey } from '../navigation/AppNavigation';
import { NavChromeBtn, ScreenNavChrome, useAppNav } from '../navigation/AppNavigation';
import { useCircadianTheme, getCircadianIconColor, type CircadianTheme } from '../../theme/circadianTheme';
import {
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
  getTodayCheckIns,
  greetingForCircadianTimezone,
  resolveTimezoneId,
  SANCTUARY_REMINDERS,
} from '../../utils/sanctuaryHome';
import { NotificationSheet } from './NotificationSheet';
import { loadSettings } from '../../utils/settingsStorage';
import { SanctuaryScenicBackdrop } from './SanctuaryScenicBackdrop';
import { SanctuaryGlassSurface } from '../shared/SanctuaryGlassSurface';
import { CrisisFooter } from '../shared/CrisisFooter';
import { BRAND_CTA_GRADIENT, tokens } from '../../theme/tokens';
import { primaryButtonInner, primaryButtonLabel } from '../../theme/primaryButton';
import type { GlassSurfaceVariant } from '../../theme/glassSurfaces';
import { isNarrowPhone } from '../../utils/layoutBreakpoints';

const SERIF = 'Georgia';
const NAV_CONTENT_HEIGHT = 72;

type CheckInRow = {
  id?: number;
  date: string;
  partOfDay?: string;
  mood?: { emoji?: string; label?: string };
  note?: string;
};

function formatJourneyTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

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
          backgroundColor: active ? `${theme.accent}10` : theme.cardElevated,
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
  variant = 'primary',
}: {
  theme: CircadianTheme;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassSurfaceVariant;
}) {
  return (
    <SanctuaryGlassSurface variant={variant} style={[styles.glassCard, style]}>
      {children}
    </SanctuaryGlassSurface>
  );
}

const HERO_H_PAD = 18;
const HERO_ORB_STAGE_HEIGHT = getSanctuaryEmoStageSize(SANCTUARY_EMO_HOME_SCALE);

function SanctuaryHero({
  theme,
  greeting,
  displayName,
  memoryMood,
  onMemoryPress,
}: {
  theme: CircadianTheme;
  greeting: string;
  displayName: string;
  memoryMood: string | null;
  onMemoryPress?: () => void;
}) {
  const dayArt = isSanctuaryDayArt(theme.phase);
  const scrimStrong = dayArt ? 'rgba(237,229,245,0.82)' : 'rgba(10,5,32,0.88)';
  const scrimMid = dayArt ? 'rgba(237,229,245,0.38)' : 'rgba(10,5,32,0.42)';
  const scrimClear = dayArt ? 'rgba(237,229,245,0)' : 'rgba(10,5,32,0)';

  return (
    <View style={[styles.heroSection]}>
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
        <View style={styles.heroGreetingCol}>
          <Text style={[styles.greetingTitle, { color: theme.text }]}>
            {greeting},{'\n'}
            {displayName} 💜
          </Text>
          {memoryMood ? (
            <SanctuaryMemoryBadge
              theme={theme}
              moodLabel={memoryMood}
              onPress={onMemoryPress}
            />
          ) : null}
          <Text style={[styles.greetingSub, { color: theme.secondaryText }]}>
            This is your sanctuary. ♡
          </Text>
        </View>

        <View style={styles.heroOrbCenter} pointerEvents="none">
          <LinearGradient
            colors={['rgba(246,232,193,0.32)', 'rgba(183,157,255,0.14)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.emoCrownGlow}
            pointerEvents="none"
          />
          <View style={styles.emoOrbLayer}>
            <SanctuaryEmoPresence theme={theme} scale={SANCTUARY_EMO_HOME_SCALE} />
          </View>
        </View>

        <Text style={[styles.heroBrandTagline, { color: theme.secondaryText }]}>{BRAND_TAGLINE}</Text>
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
  narrow,
}: {
  theme: CircadianTheme;
  onPress: () => void;
  narrow: boolean;
}) {
  const orbScale = narrow ? SANCTUARY_EMO_STANDARD_SCALE * 0.72 : SANCTUARY_EMO_STANDARD_SCALE;
  return (
    <Pressable
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      style={({ pressed }) => [styles.talkHeroWrap, pressHeroCardStyle(pressed)]}
    >
      <SanctuaryGlassSurface variant="lavender" style={styles.talkHeroGlass}>
        <View style={[styles.talkHeroRow, narrow && styles.talkHeroRowNarrow]}>
          <View style={styles.talkHeroCopy}>
            <Text style={[styles.talkHeroTitle, { color: theme.text }]}>Talk to Emo 💜</Text>
            <Text style={[styles.talkHeroBody, { color: theme.secondaryText }]}>
              Whatever is on your heart, we can begin there.
            </Text>
          </View>
          {!narrow ? (
            <View style={styles.talkOrbWrap} pointerEvents="none">
              <SanctuaryEmoPresence theme={theme} scale={orbScale} />
            </View>
          ) : null}
        </View>
        {narrow ? (
          <View style={styles.talkOrbWrapNarrow} pointerEvents="none">
            <SanctuaryEmoPresence theme={theme} scale={orbScale} />
          </View>
        ) : null}
        <LinearGradient
          colors={[...BRAND_CTA_GRADIENT]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[primaryButtonInner, styles.talkHeroBtn]}
        >
          <Text
            style={[primaryButtonLabel, styles.talkHeroBtnText]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.88}
          >
            Start Conversation
          </Text>
          <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.4} style={styles.talkHeroBtnIcon} />
        </LinearGradient>
      </SanctuaryGlassSurface>
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
      style={({ pressed }) => [styles.quickCardWrap, pressCardStyle(theme, pressed, iconColor)]}
    >
      <SanctuaryGlassSurface variant="lavender" style={styles.quickCard}>
        <View style={[styles.quickIconWrap, { backgroundColor: `${iconColor}18` }]}>
          <Icon size={18} color={iconColor} strokeWidth={2.2} />
        </View>
        <Text style={[styles.quickTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.quickSub, { color: theme.secondaryText }]}>
          {subtitle}
        </Text>
      </SanctuaryGlassSurface>
    </Pressable>
  );
}

function SanctuaryHeaderBar({
  theme,
  notificationsOn,
  onOpenNotifications,
}: {
  theme: CircadianTheme;
  notificationsOn: boolean;
  onOpenNotifications: () => void;
}) {
  return (
    <ScreenNavChrome
      theme={theme}
      title="Sanctuary"
      showForward={false}
      actionsBeforeNav={
        <NavChromeBtn
          theme={theme}
          onPress={onOpenNotifications}
          accessibilityLabel="Notification settings"
        >
          <Bell size={16} color={theme.text} strokeWidth={2.2} />
          {notificationsOn ? (
            <View
              style={[styles.notifDot, { backgroundColor: theme.accent, borderColor: theme.card }]}
            />
          ) : null}
        </NavChromeBtn>
      }
    />
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
      style={({ pressed }) => [styles.listRowWrap, pressCardStyle(theme, pressed, iconColor)]}
    >
      <SanctuaryGlassSurface variant="primary" style={styles.listRowOuter}>
        <View style={styles.listRow}>
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
            <Text style={[styles.listCopy, { color: theme.secondaryText }]}>{body}</Text>
            <View style={styles.listLinkRow}>
              <Text style={[styles.listLink, { color: linkColor }]}>{linkLabel}</Text>
              <ChevronRight size={14} color={linkColor} strokeWidth={2.4} />
            </View>
          </View>
        </View>
      </SanctuaryGlassSurface>
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
  const { width: windowWidth } = useWindowDimensions();
  const narrow = isNarrowPhone(windowWidth);
  const { bottom: bottomInset, top: topInset } = useLayoutInsets();
  const topPad = topInset + 4;
  const { navigateToCheckIn } = useAppNav();
  const displayName = userName.trim() || 'friend';
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [timezoneId, setTimezoneId] = useState('America/New_York');
  const [localHour, setLocalHour] = useState(new Date().getHours());
  const [memoryMood, setMemoryMood] = useState<string | null>(null);

  const greeting = useMemo(
    () => greetingForCircadianTimezone(timezoneId),
    [timezoneId, localHour],
  );

  const weekStrip = useMemo(() => buildWeekMoodStrip(checkIns), [checkIns]);
  const todayJourney = useMemo(() => getTodayCheckIns(checkIns), [checkIns]);
  const weekCount = useMemo(() => countWeekCheckIns(checkIns), [checkIns]);
  const todayCheckedIn = todayJourney.length > 0;
  const showEveningReflection = localHour >= 17;
  const iconAccent = getSanctuaryIconAccent(theme);
  const iconLink = getSanctuaryIconLink(theme);
  const labelAccent = getSanctuaryLabelAccent(theme);

  useEffect(() => {
    void loadEmoPersonalContext(userName).then(({ active, chipLabel }) => {
      if (!active) {
        setMemoryMood(null);
        return;
      }
      setMemoryMood(memoryMoodFromChipLabel(chipLabel));
    });
  }, [userName, checkIns]);

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
        <NavChromeShell style={styles.chromeWrap}>
          <SanctuaryGlassCard theme={theme} style={styles.sanctuaryNavCard}>
            <SanctuaryHeaderBar
              theme={theme}
              notificationsOn={notificationsOn}
              onOpenNotifications={() => setNotificationsOpen(true)}
            />
          </SanctuaryGlassCard>
        </NavChromeShell>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={{
            paddingTop: topPad + 8,
            paddingBottom: NAV_CONTENT_HEIGHT + bottomInset + 64,
            paddingHorizontal: 18,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SanctuaryHero
            theme={theme}
            greeting={greeting}
            displayName={displayName}
            memoryMood={memoryMood}
            onMemoryPress={() => onNav('memoryledger')}
          />

          <DailyReflectionHero theme={theme} />

          <SanctuaryGlassCard theme={theme} variant="lavender" style={styles.moodCard}>
            <View style={styles.moodHeader}>
              <Text style={[styles.cardTitleSerif, { color: theme.text }]}>
                {todayCheckedIn ? "Today's Journey" : 'How are you feeling today?'}
              </Text>
              <Pressable
                onPress={() => {
                  void hapticLight();
                  navigateToCheckIn(false);
                }}
                hitSlop={8}
                style={({ pressed }) => pressLinkStyle(theme, pressed)}
              >
                <Text style={[styles.editLink, { color: theme.accent }]}>Check in</Text>
              </Pressable>
            </View>

            {todayJourney.length > 0 ? (
              <View style={styles.journeyRow}>
                {todayJourney.map((entry: { id?: string; date: string; mood?: { label?: string; emoji?: string } }) => {
                  const mood = resolveWeekMood({
                    moodLabel: entry.mood?.label ?? null,
                    moodEmoji: entry.mood?.emoji ?? null,
                  });
                  return (
                    <View key={entry.id ?? entry.date} style={styles.journeyChip}>
                      {mood ? <MoodIconBadge mood={mood} variant="week" active /> : null}
                      <Text style={[styles.journeyMood, { color: theme.text }]}>
                        {entry.mood?.label ?? 'Check-in'}
                      </Text>
                      <Text style={[styles.journeyTime, { color: theme.mutedText }]}>
                        {formatJourneyTime(entry.date)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.moodRow}>
              {weekStrip.map((day, i) => {
                const active = day.isToday;
                return (
                  <Pressable
                    key={`${day.label}-${i}`}
                    onPress={() => {
                      void hapticLight();
                      navigateToCheckIn(false);
                    }}
                    style={({ pressed }) => [styles.moodCol, pressChipStyle(theme.accent, pressed)]}
                  >
                    <WeekMoodDot day={day} theme={theme} />
                    <Text style={[styles.moodDayLabel, { color: active ? theme.accent : theme.secondaryText }]}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SanctuaryGlassCard>

          <SanctuaryTalkCard theme={theme} narrow={narrow} onPress={() => onNav('talk')} />

          <Text style={[styles.sectionEyebrow, { color: labelAccent }]}>QUICK ACTIONS</Text>
          <View style={styles.quickRow}>
            <QuickActionCard
              theme={theme}
              icon={Heart}
              iconColor="#E97D6A"
              title="Check In"
              subtitle="How are you feeling?"
              onPress={() => navigateToCheckIn(false)}
            />
            <QuickActionCard
              theme={theme}
              icon={Sparkles}
              iconColor={tokens.oracle.accent}
              title="Oracle"
              subtitle="Ask Emo anything"
              onPress={() => onNav('oracle')}
            />
          </View>

          <GentleInsightCard
            theme={theme}
            refreshKey={checkIns.length}
            onExploreInsights={() => onNav('insights')}
          />

          <View style={styles.listSection}>
            <SanctuaryListRow
              theme={theme}
              icon={BarChart3}
              iconColor={iconAccent}
              title="Emotional Insights"
              body="Discover patterns and rhythms in your emotional journey."
              linkLabel="View Insights"
              linkColor={iconLink}
              badge={weekCount >= 3 ? 'New' : undefined}
              onPress={() => onNav('insights')}
            />
            <SanctuaryListRow
              theme={theme}
              icon={Brain}
              iconColor="#C4A35A"
              title="Memory Ledger"
              body="What Emo holds on this device — personal context, milestones, and how memory is used."
              linkLabel="Open Ledger"
              linkColor={iconLink}
              onPress={() => onNav('memoryledger')}
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
          </View>

          <CrisisFooter theme={theme} variant="home" style={styles.crisisFooter} />

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
  chromeWrap: { paddingHorizontal: 0 },
  sanctuaryNavCard: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: 0,
  },
  notifDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  heroWelcomeLine: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  heroBrandTagline: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
    textAlign: 'center',
    alignSelf: 'center',
  },
  heroSection: {
    marginHorizontal: -HERO_H_PAD,
    marginBottom: 12,
    position: 'relative',
    overflow: 'visible',
  },
  heroInner: {
    paddingHorizontal: HERO_H_PAD + 6,
    paddingTop: 6,
    paddingBottom: 10,
    zIndex: 2,
  },
  heroOrbCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 8,
    overflow: 'visible',
    minHeight: HERO_ORB_STAGE_HEIGHT + 16,
    paddingTop: 18,
  },
  emoCrownGlow: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    width: 210,
    height: 130,
    borderRadius: 105,
    zIndex: 0,
  },
  emoOrbLayer: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  heroGreetingCol: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    paddingHorizontal: 2,
    marginBottom: 4,
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
    textAlign: 'left',
    flexShrink: 1,
  },
  greetingSub: {
    fontFamily: SERIF,
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    marginTop: 10,
    textAlign: 'left',
  },
  heroVignette: {
    ...StyleSheet.absoluteFillObject,
  },
  glassCard: {
    padding: 16,
  },
  moodCard: { marginTop: -6, marginBottom: 12, paddingVertical: 18 },
  journeyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  journeyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(123,77,255,0.08)',
    maxWidth: '100%',
  },
  journeyMood: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  journeyTime: { fontSize: 11, fontWeight: '500' },
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
  talkHeroWrap: { marginBottom: 12 },
  talkHeroGlass: {
    minHeight: 200,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  talkHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  talkHeroRowNarrow: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  talkOrbWrap: {
    flexShrink: 0,
    marginLeft: 4,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  talkOrbWrapNarrow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    overflow: 'visible',
    paddingTop: 6,
  },
  talkHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  talkHeroTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: SERIF,
    marginBottom: 6,
  },
  talkHeroBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 0,
  },
  talkHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 6,
    marginTop: 14,
  },
  talkHeroBtnText: {
    fontSize: 15,
    flexShrink: 1,
  },
  talkHeroBtnIcon: {
    flexShrink: 0,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickCardWrap: { flex: 1 },
  quickCard: {
    flex: 1,
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
  quickSub: { fontSize: 10, lineHeight: 14, fontWeight: '500' },
  listSection: { gap: 10, marginBottom: 20 },
  listRowWrap: {},
  listRowOuter: {},
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
  listLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 10,
  },
  listLink: { fontSize: 12, fontWeight: '700' },
  crisisFooter: { marginTop: 8, paddingHorizontal: 8 },
});
