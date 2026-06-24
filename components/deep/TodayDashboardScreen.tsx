import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  setTaskStatus,
  type EnergyCategoryId,
} from '../../utils/todayTriage';
import { loadLatestMoodLabel } from '../../utils/insightsData';
import { ScreenNavChrome, type MainScreenKey } from '../navigation/AppNavigation';
import { hapticLight } from '../../utils/haptics';
import {
  pressCardStyle,
  pressChipStyle,
  pressDotStyle,
  pressLinkStyle,
} from '../../utils/pressFeedback';

const NAV_CONTENT_HEIGHT = 72;
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
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
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
  const heroInsight = buildTodayHeroInsight(tasks, moodLabel);
  const gentleGrowth = buildTodayGentleGrowth(tasks);
  const emoReflection = buildEmoDailyNote(tasks, moodLabel);
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const inferredCategory = newTitle.trim() ? inferTaskCategory(newTitle) : null;
  const labelAccent = getSanctuaryLabelAccent(theme);
  const hasTasks = tasks.length > 0;

  const scrollMinHeight = useMemo(() => {
    const reserved = insets.top + insets.bottom + NAV_CONTENT_HEIGHT + 168;
    return Math.max(windowHeight - reserved, 420);
  }, [windowHeight, insets.top, insets.bottom]);

  const toggleDone = (taskId: string, current: string) => {
    void hapticLight();
    const next = current === 'done' ? 'pending' : 'done';
    void setTaskStatus(taskId, next).then(refresh);
  };

  const handleDeleteTask = (task: TaskRow) => {
    Alert.alert('Remove intention?', `Remove “${task.title}” from today?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
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
      Alert.alert('Could not save', 'Your intention was not saved. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
        <View style={styles.chromeWrap}>
          <ScreenNavChrome theme={theme} title="Today" />
        </View>

        <View style={styles.headerBlock}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Your day ahead</Text>
          <View style={styles.subtitleRow}>
            <Text style={[styles.subtitle, { color: theme.mutedText }]}>
              Intentions, not pressure — planning at your pace.
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

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: NAV_CONTENT_HEIGHT + insets.bottom + 28, minHeight: scrollMinHeight },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero — Gentle note for today */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.heroCard}>
            <SectionEyebrow icon="💜" label="Gentle Note" color={tokens.text.primary} />
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
                <Text style={[styles.moodLabel, { color: theme.text }]}>{moodLabel}</Text>
              </View>
            ) : null}
          </CircadianGlassCard>

          {/* Today's intentions */}
          {hasTasks ? (
            <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.intentionsCard}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Intentions</Text>
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
                                <Text style={[styles.beginLink, { color: theme.accent }]}>Begin →</Text>
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
          ) : (
            <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.intentionsCard}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Intentions</Text>
              <Text style={[styles.emptyCopy, { color: theme.mutedText }]}>
                Nothing on your list yet — add one small intention below, or let the day stay open.
              </Text>
            </CircadianGlassCard>
          )}

          {/* Add intention */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
            <SectionEyebrow icon="✨" label="Add an Intention" color={labelAccent} />
            <TextInput
              style={[
                styles.addInput,
                {
                  color: theme.text,
                  borderColor: inputHighlight ? theme.accent : tokens.border.standard,
                  backgroundColor: inputHighlight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.5)',
                },
                inputHighlight && styles.addInputHighlight,
              ]}
              placeholder="What matters today?"
              placeholderTextColor={theme.mutedText}
              value={newTitle}
              onChangeText={setNewTitle}
              returnKeyType="done"
              onSubmitEditing={() => void handleAddTask()}
            />
            <Text style={[styles.categoryPickLabel, { color: theme.mutedText }]}>
              Activity{inferredCategory && !categoryTouched ? ' · suggested' : ''}
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
                    <Text style={[styles.categoryChipText, { color: cat.accent }]}>{cat.shortLabel}</Text>
                  </Pressable>
                );
              })}
            </View>
          </CircadianGlassCard>

          {/* Gentle growth */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.card}>
            <SectionEyebrow icon="✨" label="Gentle Growth" color={labelAccent} />
            <Text style={[styles.growthLine1, { color: theme.text }]}>{gentleGrowth.line1}</Text>
            <Text style={[styles.growthLine2, { color: theme.secondaryText }]}>{gentleGrowth.line2}</Text>
          </CircadianGlassCard>

          {/* Emo's reflection */}
          <CircadianGlassCard theme={theme} variant="todayInsights" style={styles.cardLast}>
            <SectionEyebrow icon="💜" label="Emo's Reflection" color={tokens.text.primary} />
            <Text style={[styles.reflectionQuote, { color: theme.text }]}>{emoReflection}</Text>
          </CircadianGlassCard>

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
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
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
