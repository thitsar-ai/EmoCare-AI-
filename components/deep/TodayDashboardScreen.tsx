import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OB_MOODS } from '../../constants/obMoods';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { CircadianGlassCard, CircadianHeroGlow, SERIF } from '../shared/CircadianHeroGlow';
import { useCircadianTheme } from '../../theme/circadianTheme';
import {
  getSanctuaryLabelAccent,
} from '../../theme/sanctuaryBrand';
import { tokens } from '../../theme/tokens';
import {
  ENERGY_CATEGORIES,
  ENERGY_CATEGORY_ORDER,
  addTodayTask,
  buildEmoDailyNote,
  buildTodayGentleGrowth,
  buildTodayHeroInsight,
  categorySubline,
  deleteTodayTask,
  groupTasksByEnergy,
  inferTaskCategory,
  isBreathCareTask,
  loadTodayTasks,
  pickIntentionSuggestions,
  setTaskStatus,
  type EnergyCategoryId,
} from '../../utils/todayTriage';
import { loadLatestMoodLabel } from '../../utils/insightsData';
import { ScreenNavChrome, useAppNav, type MainScreenKey } from '../navigation/AppNavigation';
import { hapticLight } from '../../utils/haptics';
import { useKeyboardBottomInset } from '../../hooks/useKeyboardBottomInset';
import {
  pressCardStyle,
  pressChipStyle,
  pressDotStyle,
  pressLinkStyle,
} from '../../utils/pressFeedback';
import { useUiCopy } from '../i18n/UiCopyProvider';

const NAV_CONTENT_HEIGHT = 80;
const H_PAD = 22;
const TEAL = '#2A9D8F';

type TaskRow = Awaited<ReturnType<typeof loadTodayTasks>>[number];

function SectionEyebrow({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <Text style={[styles.eyebrow, { color }]}>
      {icon} {label}
    </Text>
  );
}

function moodEmoji(label: string) {
  return OB_MOODS.find((m) => m.label === label)?.emoji ?? '💜';
}

function TaskCheckToggle({
  done,
  accent,
  onToggle,
  theme,
}: {
  done: boolean;
  accent: string;
  onToggle: () => void;
  theme: ReturnType<typeof useCircadianTheme>;
}) {
  if (done) {
    return (
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        style={({ pressed }) => [styles.doneBadge, pressDotStyle(theme, pressed, TEAL)]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: true }}
        accessibilityLabel="Mark task as not done"
      >
        <Check size={12} color={TEAL} strokeWidth={2.5} />
        <Text style={[styles.doneText, { color: TEAL }]}>done</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={10}
      style={({ pressed }) => [
        styles.checkRing,
        { borderColor: `${accent}88` },
        pressDotStyle(theme, pressed, accent),
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: false }}
      accessibilityLabel="Mark task as done"
    />
  );
}

export function TodayDashboardScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const { t, locale } = useUiCopy();
  const myanmarUi = locale === 'my';
  const insets = useSafeAreaInsets();
  const { setImmersiveChromeHidden } = useAppNav();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const addCardYRef = useRef(0);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [moodLabel, setMoodLabel] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<EnergyCategoryId>('home');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [adding, setAdding] = useState(false);
  const [inputHighlight, setInputHighlight] = useState(false);

  const refresh = useCallback(async () => {
    const [todayTasks, mood] = await Promise.all([loadTodayTasks(), loadLatestMoodLabel()]);
    setTasks(todayTasks);
    setMoodLabel(mood);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onKeyboardOpenChange = useCallback(
    (open: boolean) => {
      setImmersiveChromeHidden(open);
    },
    [setImmersiveChromeHidden],
  );
  const { keyboardOpen, keyboardHeight } = useKeyboardBottomInset({
    onOpenChange: onKeyboardOpenChange,
  });

  useEffect(() => {
    if (!newTitle.trim()) {
      if (!categoryTouched) setNewCategory('home');
      return;
    }
    if (!categoryTouched) {
      setNewCategory(inferTaskCategory(newTitle));
    }
  }, [newTitle, categoryTouched]);

  const groups = groupTasksByEnergy(tasks);
  const hasTasks = tasks.length > 0;
  const heroInsight = buildTodayHeroInsight(tasks, moodLabel);
  const gentleGrowth = buildTodayGentleGrowth(tasks);
  const emoReflection = buildEmoDailyNote(tasks, moodLabel);
  const suggestions = useMemo(() => {
    const raw = pickIntentionSuggestions(tasks, moodLabel, hasTasks ? 3 : 4);
    if (locale !== 'my') return raw;
    const titleKey: Record<string, string> = {
      'suggest-water': 'today.suggestWater',
      'suggest-breathe': 'today.suggestBreathe',
      'suggest-walk': 'today.suggestWalk',
      'suggest-stretch': 'today.suggestStretch',
    };
    return raw.map((s) => ({
      ...s,
      title: titleKey[s.id] ? t(titleKey[s.id]) : s.title,
    }));
  }, [tasks, moodLabel, hasTasks, locale, t]);
  const todayLabel = new Date().toLocaleDateString(locale === 'my' ? 'my-MM' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const categoryLabel = useCallback(
    (id: EnergyCategoryId) => {
      if (locale !== 'my') return ENERGY_CATEGORIES[id]?.shortLabel || id;
      const map: Record<EnergyCategoryId, string> = {
        work: t('today.catWork'),
        home: t('today.catHome'),
        movement: t('today.catMovement'),
        connect: t('today.catRelationships'),
        care: t('today.catSelfCare'),
        admin: t('today.catProject'),
      };
      return map[id] || ENERGY_CATEGORIES[id]?.shortLabel || id;
    },
    [locale, t],
  );

  const inferredCategory = newTitle.trim() ? inferTaskCategory(newTitle) : null;
  const labelAccent = getSanctuaryLabelAccent(theme);

  const scrollMinHeight = useMemo(() => {
    const reserved = insets.top + insets.bottom + NAV_CONTENT_HEIGHT + 168;
    return Math.max(windowHeight - reserved, 420);
  }, [windowHeight, insets.top, insets.bottom]);

  // Extra keyboardHeight padding so the intention field clears the keyboard (no KAV).
  const scrollPadBottom = keyboardOpen
    ? keyboardHeight + 28
    : NAV_CONTENT_HEIGHT + insets.bottom + 28;

  const onAddCardLayout = useCallback((e: LayoutChangeEvent) => {
    addCardYRef.current = e.nativeEvent.layout.y;
  }, []);

  const scrollInputIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, addCardYRef.current - 24),
        animated: true,
      });
    });
  }, []);

  useEffect(() => {
    if (keyboardOpen && keyboardHeight > 0) {
      const timer = setTimeout(scrollInputIntoView, 80);
      return () => clearTimeout(timer);
    }
  }, [keyboardOpen, keyboardHeight, scrollInputIntoView]);

  const toggleDone = (taskId: string, current: string) => {
    void hapticLight();
    const next = current === 'done' ? 'pending' : 'done';
    void setTaskStatus(taskId, next).then(refresh);
  };

  const handleDeleteTask = (task: TaskRow) => {
    Alert.alert(t('today.removeIntention'), t('today.removeConfirm', { title: task.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('alert.remove'),
        style: 'destructive',
        onPress: () => {
          void hapticLight();
          void deleteTodayTask(task.id).then(refresh);
        },
      },
    ]);
  };

  const handleAddTask = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed || adding) {
      void hapticLight();
      setInputHighlight(true);
      setTimeout(() => setInputHighlight(false), 700);
      return;
    }
    void hapticLight();
    Keyboard.dismiss();
    setAdding(true);
    try {
      await addTodayTask({
        title: trimmed,
        energyCategory: newCategory,
        deadline: 'flexible',
        autoCategory: false,
      });
      setNewTitle('');
      setCategoryTouched(false);
      setNewCategory('home');
      await refresh();
    } catch {
      Alert.alert(t('common.couldNotSave'), t('common.tryAgain'));
    } finally {
      setAdding(false);
    }
  };

  const handleAddSuggestion = async (suggestion: {
    title: string;
    energyCategory: EnergyCategoryId;
  }) => {
    if (adding) return;
    void hapticLight();
    setAdding(true);
    try {
      await addTodayTask({
        title: suggestion.title,
        energyCategory: suggestion.energyCategory,
        deadline: 'flexible',
        autoCategory: false,
      });
      await refresh();
    } catch {
      Alert.alert(t('common.couldNotSave'), t('common.tryAgain'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4} edges={['top', 'left', 'right']}>
        <View style={styles.chromeWrap}>
          <ScreenNavChrome theme={theme} title={t('today.title')} />
        </View>

        {!keyboardOpen ? (
          <View style={styles.headerBlock}>
            <Text
              style={[styles.headerTitle, myanmarUi && styles.headerTitleMyanmar, { color: theme.text }]}
            >
              {t('today.dayAhead')}
            </Text>
            <View style={styles.subtitleRow}>
              <Text
                style={[styles.subtitle, myanmarUi && styles.subtitleMyanmar, { color: theme.mutedText }]}
              >
                {t('today.subtitle')}
              </Text>
              <View
                style={[
                  styles.datePill,
                  {
                    borderColor: tokens.border.standard,
                    backgroundColor: tokens.bg.card,
                  },
                ]}
              >
                <Text style={[styles.datePillText, { color: theme.secondaryText }]}>{todayLabel}</Text>
              </View>
            </View>
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: scrollPadBottom,
              minHeight: keyboardOpen ? undefined : scrollMinHeight,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Hero — Gentle note for today */}
          {!keyboardOpen ? (
            <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.heroCard}>
              <SectionEyebrow icon="💜" label={t('today.gentleNote')} color={tokens.text.primary} />
              <Text style={[styles.heroQuote, { color: theme.text }]}>{heroInsight}</Text>
              {moodLabel ? (
                <View
                  style={[
                    styles.moodBubble,
                    {
                      borderColor: tokens.border.strong,
                      backgroundColor: tokens.surface.tint,
                    },
                  ]}
                >
                  <Text style={styles.moodEmoji}>{moodEmoji(moodLabel)}</Text>
                  <Text style={[styles.moodLabel, { color: theme.text }]}>
                    {(() => {
                      const key = `mood.${moodLabel.toLowerCase()}`;
                      const localized = t(key);
                      return localized === key ? moodLabel : localized;
                    })()}
                  </Text>
                </View>
              ) : null}
            </CircadianGlassCard>
          ) : null}

          {/* Today's intentions */}
          {!keyboardOpen && hasTasks ? (
            <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.intentionsCard}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('today.intentions')}</Text>
              {groups.map(({ category, tasks: groupTasks }) => (
                <View key={category.id} style={styles.group}>
                  <Text style={[styles.groupLabel, { color: category.accent }]}>{category.label}</Text>
                  {groupTasks.map((task) => {
                    const isDone = task.status === 'done';
                    return (
                      <Pressable
                        key={task.id}
                        onLongPress={() => handleDeleteTask(task)}
                        delayLongPress={450}
                        accessibilityHint="Long press to remove this intention"
                        style={({ pressed }) => pressCardStyle(theme, pressed, category.accent)}
                      >
                        <View style={styles.taskRow}>
                          <View style={styles.taskMain}>
                            <Text
                              style={[
                                styles.taskTitle,
                                { color: theme.text },
                                isDone && styles.taskTitleDone,
                              ]}
                            >
                              {task.title}
                            </Text>
                            <Text style={[styles.taskSub, { color: theme.mutedText }]}>
                              {categorySubline(task)}
                            </Text>
                          </View>
                          <View style={styles.taskActions}>
                            {isBreathCareTask(task) && !isDone ? (
                              <Pressable
                                onPress={() => {
                                  void hapticLight();
                                  onNav('talk');
                                }}
                                hitSlop={8}
                                style={({ pressed }) => pressLinkStyle(theme, pressed)}
                              >
                                <Text style={[styles.beginLink, { color: theme.accent }]}>{t('today.begin')}</Text>
                              </Pressable>
                            ) : null}
                            <TaskCheckToggle
                              done={isDone}
                              accent={category.accent}
                              theme={theme}
                              onToggle={() => toggleDone(task.id, task.status)}
                            />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </CircadianGlassCard>
          ) : null}
          {!keyboardOpen && !hasTasks ? (
            <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.intentionsCard}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('today.intentions')}</Text>
              <Text style={[styles.emptyCopy, { color: theme.mutedText }]}>
                {t('today.emptyIntentions')}
              </Text>
            </CircadianGlassCard>
          ) : null}

          {/* Add intention — kept above keyboard via scroll + keyboard-height padding */}
          <View onLayout={onAddCardLayout}>
            <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
              <SectionEyebrow icon="✨" label={t('today.addIntention')} color={labelAccent} />
              <TextInput
                style={[
                  styles.addInput,
                  {
                    color: theme.text,
                    borderColor: inputHighlight ? theme.accent : tokens.border.standard,
                    backgroundColor: inputHighlight
                      ? 'rgba(255, 255, 255, 0.72)'
                      : 'rgba(255, 255, 255, 0.5)',
                  },
                  inputHighlight && styles.addInputHighlight,
                ]}
                placeholder={t('today.whatMatters')}
                placeholderTextColor={theme.mutedText}
                value={newTitle}
                onChangeText={setNewTitle}
                returnKeyType="done"
                onFocus={scrollInputIntoView}
                onSubmitEditing={() => void handleAddTask()}
              />

              {suggestions.length > 0 && !keyboardOpen ? (
                <View style={styles.suggestBlock}>
                  <Text style={[styles.suggestLabel, { color: labelAccent }]}>
                    {hasTasks ? t('today.moreIdeas') : t('today.tryOne')}
                  </Text>
                  <View style={styles.suggestRow}>
                    {suggestions.map((item) => {
                      const cat = ENERGY_CATEGORIES[item.energyCategory];
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => void handleAddSuggestion(item)}
                          disabled={adding}
                          accessibilityRole="button"
                          accessibilityLabel={`Add intention: ${item.title}`}
                          style={({ pressed }) => [
                            styles.suggestChip,
                            {
                              borderColor: cat.accent,
                              backgroundColor: cat.chipBg,
                            },
                            pressChipStyle(cat.accent, pressed),
                            adding && { opacity: 0.55 },
                          ]}
                        >
                          <Text
                            style={[styles.suggestChipText, { color: theme.text }]}
                            numberOfLines={2}
                          >
                            + {item.title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <Text style={[styles.categoryPickLabel, { color: theme.mutedText }]}>
                {t('today.activityType')}
                {inferredCategory && !categoryTouched && locale !== 'my' ? ' · auto-matched' : ''}
              </Text>
              <Text
                style={[
                  styles.categoryHint,
                  myanmarUi && { letterSpacing: 0, lineHeight: 20 },
                  { color: theme.mutedText },
                ]}
              >
                {t('today.activityHelper')}
              </Text>
              <View style={styles.categoryRow}>
                {ENERGY_CATEGORY_ORDER.map((id) => {
                  const cat = ENERGY_CATEGORIES[id];
                  const selected = newCategory === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => {
                        void hapticLight();
                        setCategoryTouched(true);
                        setNewCategory(id);
                      }}
                      style={({ pressed }) => [
                        styles.categoryChip,
                        {
                          borderColor: cat.accent,
                          backgroundColor: selected ? cat.chipBg : 'transparent',
                        },
                        pressChipStyle(cat.accent, pressed),
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          myanmarUi && { letterSpacing: 0 },
                          { color: cat.accent },
                        ]}
                      >
                        {categoryLabel(id)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </CircadianGlassCard>
          </View>

          {!keyboardOpen ? (
            <>
              {/* Gentle growth */}
              <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
                <SectionEyebrow icon="✨" label={t('today.gentleGrowth')} color={labelAccent} />
                <Text style={[styles.growthLine1, { color: theme.text }]}>{gentleGrowth.line1}</Text>
                <Text style={[styles.growthLine2, { color: theme.secondaryText }]}>
                  {gentleGrowth.line2}
                </Text>
              </CircadianGlassCard>

              {/* Emo's reflection */}
              <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.cardLast}>
                <SectionEyebrow icon="💜" label={t('today.emoReflection')} color={tokens.text.primary} />
                <Text style={[styles.reflectionQuote, { color: theme.text }]}>{emoReflection}</Text>
              </CircadianGlassCard>
            </>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </ScreenSafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chromeWrap: { paddingHorizontal: 8, paddingBottom: 4 },
  headerBlock: {
    paddingHorizontal: 28,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: SERIF,
    fontSize: tokens.typography.pageTitle.fontSize,
    lineHeight: tokens.typography.pageTitle.lineHeight,
    fontWeight: tokens.typography.pageTitle.fontWeight,
    marginBottom: 8,
  },
  headerTitleMyanmar: {
    fontFamily: undefined,
    lineHeight: 44,
    paddingTop: 4,
    marginBottom: 10,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  datePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 0,
    maxWidth: '46%',
    alignSelf: 'flex-start',
  },
  datePillText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  subtitleMyanmar: {
    lineHeight: 24,
    paddingTop: 2,
    paddingBottom: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: H_PAD,
  },
  heroCard: {
    marginBottom: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  card: {
    marginBottom: 18,
  },
  intentionsCard: {
    marginBottom: 18,
    minHeight: 120,
  },
  cardLast: {
    marginBottom: 0,
  },
  bottomSpacer: {
    minHeight: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  heroQuote: {
    fontFamily: SERIF,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '400',
  },
  moodBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  moodEmoji: {
    fontSize: 15,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 16,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 22,
  },
  group: {
    marginBottom: 12,
  },
  groupLabel: {
    fontFamily: SERIF,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.border.standard,
  },
  taskMain: { flex: 1, paddingRight: 8 },
  taskTitle: { fontSize: 16, fontWeight: '600' },
  taskTitleDone: { opacity: 0.55, textDecorationLine: 'line-through' },
  taskSub: { fontSize: 12, marginTop: 4 },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
  },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doneText: { fontSize: 13, fontWeight: '700' },
  beginLink: { fontSize: 14, fontWeight: '700' },
  addInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  categoryPickLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  categoryHint: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  categoryChip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 36,
    justifyContent: 'center',
  },
  categoryChipText: { fontSize: 12, fontWeight: '700' },
  suggestBlock: {
    marginBottom: 14,
  },
  suggestLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  suggestChipText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  addInputHighlight: {
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#9B7BFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  growthLine1: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 8,
  },
  growthLine2: {
    fontSize: 14,
    lineHeight: 22,
  },
  reflectionQuote: {
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
  },
});
