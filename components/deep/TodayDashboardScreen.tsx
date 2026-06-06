import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { CircadianGlassCard, CircadianHeroGlow, SERIF } from '../shared/CircadianHeroGlow';
import { useCircadianTheme } from '../../theme/circadianTheme';
import {
  getSanctuaryButtonGradient,
  getSanctuaryButtonGradientDisabled,
  getSanctuaryLabelAccent,
} from '../../theme/sanctuaryBrand';
import {
  ENERGY_CATEGORIES,
  ENERGY_CATEGORY_ORDER,
  addTodayTask,
  buildEmoDailyNote,
  categorySubline,
  deleteTodayTask,
  groupTasksByEnergy,
  inferTaskCategory,
  isBreathCareTask,
  loadTodayTasks,
  setTaskStatus,
  summarizeTodayTasks,
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
  pressPrimaryStyle,
  primaryRestingShadow,
} from '../../utils/pressFeedback';

const NAV_CONTENT_HEIGHT = 72;
const TEAL = '#2A9D8F';

type TaskRow = Awaited<ReturnType<typeof loadTodayTasks>>[number];

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

function taskSubline(task: TaskRow) {
  return categorySubline(task);
}

export function TodayDashboardScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [moodLabel, setMoodLabel] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<EnergyCategoryId>('home');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [adding, setAdding] = useState(false);

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

  const summary = summarizeTodayTasks(tasks);
  const groups = groupTasksByEnergy(tasks);
  const dailyNote = buildEmoDailyNote(tasks, moodLabel);
  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const activitySummary = useMemo(() => {
    const parts = ENERGY_CATEGORY_ORDER.filter((id) => summary.byCategory[id] > 0).map(
      (id) => `${summary.byCategory[id]} ${ENERGY_CATEGORIES[id].shortLabel.toLowerCase()}`,
    );
    return parts.length ? parts.join(' · ') : 'nothing pending';
  }, [summary.byCategory]);

  const inferredCategory = newTitle.trim() ? inferTaskCategory(newTitle) : null;
  const canAdd = Boolean(newTitle.trim()) && !adding;
  const labelAccent = getSanctuaryLabelAccent(theme);

  const toggleDone = (taskId: string, current: string) => {
    void hapticLight();
    const next = current === 'done' ? 'pending' : 'done';
    void setTaskStatus(taskId, next).then(refresh);
  };

  const handleDeleteTask = (task: TaskRow) => {
    Alert.alert('Remove task?', `Delete “${task.title}” from today?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
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
    if (!trimmed) return;
    void hapticLight();
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
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
      <View style={styles.chromeWrap}>
        <ScreenNavChrome theme={theme} title="Today" titleFontSize={15} />
      </View>
      <View style={styles.headerBlock}>
        <Text style={[styles.dateLine, { color: theme.text }]}>Today, {todayLabel}</Text>
        <Text style={[styles.summaryLine, { color: theme.secondaryText }]}>
          Tasks and planning — separate from the Sanctuary.
        </Text>
        <Text style={[styles.statsLine, { color: theme.mutedText }]}>
          {summary.pendingCount} pending · {activitySummary} · mood: {moodLabel || '—'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: NAV_CONTENT_HEIGHT + insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {groups.map(({ category, tasks: groupTasks }) => (
          <View key={category.id} style={styles.group}>
            <Text style={[styles.groupLabel, { color: category.accent }]}>
              {category.label.toUpperCase()}
            </Text>
            {groupTasks.map((task) => {
              const isDone = task.status === 'done';
              return (
                <Pressable
                  key={task.id}
                  onLongPress={() => handleDeleteTask(task)}
                  delayLongPress={450}
                  accessibilityHint="Long press to delete this task"
                  style={({ pressed }) => pressCardStyle(theme, pressed, category.accent)}
                >
                  <CircadianGlassCard theme={theme} style={styles.taskCard}>
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
                      <Text style={[styles.taskSub, { color: theme.mutedText }]}>{taskSubline(task)}</Text>
                    </View>
                    <View style={styles.taskActions}>
                      {isBreathCareTask(task) && !isDone ? (
                        <Pressable
                          onPress={() => {
                            void hapticLight();
                            onNav('breathe');
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
                  </CircadianGlassCard>
                </Pressable>
              );
            })}
          </View>
        ))}

        <CircadianGlassCard theme={theme} style={styles.addCard}>
          <Text style={[styles.addLabel, { color: labelAccent }]}>ADD A TASK</Text>
          <TextInput
            style={[
              styles.addInput,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.card },
            ]}
            placeholder="What needs your energy today?"
            placeholderTextColor={theme.mutedText}
            value={newTitle}
            onChangeText={setNewTitle}
            returnKeyType="done"
            onSubmitEditing={() => void handleAddTask()}
          />
          <Text style={[styles.categoryPickLabel, { color: theme.mutedText }]}>
            Activity{inferredCategory && !categoryTouched ? ' · auto-detected' : ''}
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
          <Pressable
            onPress={() => void handleAddTask()}
            disabled={!canAdd}
            style={({ pressed }) => [
              styles.addBtnWrap,
              !canAdd && styles.addBtnDisabled,
              canAdd && primaryRestingShadow(theme),
              canAdd && pressPrimaryStyle(theme, pressed),
            ]}
          >
            <LinearGradient
              colors={
                canAdd
                  ? getSanctuaryButtonGradient(theme.phase)
                  : getSanctuaryButtonGradientDisabled(theme.phase)
              }
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.addBtn}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addBtnText}>Add to today</Text>
            </LinearGradient>
          </Pressable>
        </CircadianGlassCard>

        <Text style={[styles.groupLabel, { color: labelAccent, marginTop: 4 }]}>EMO'S DAILY NOTE</Text>
        <CircadianGlassCard theme={theme}>
          <Text style={[styles.noteQuote, { color: theme.text }]}>{dailyNote}</Text>
        </CircadianGlassCard>
      </ScrollView>
      </ScreenSafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chromeWrap: { paddingHorizontal: 8, paddingBottom: 4 },
  headerBlock: { paddingHorizontal: 28, paddingTop: 4 },
  dateLine: { fontSize: 16, lineHeight: 22, fontWeight: '600', marginBottom: 4 },
  summaryLine: { fontSize: 14, lineHeight: 20 },
  statsLine: { fontSize: 13, marginTop: 6, marginBottom: 12 },
  group: { marginBottom: 8 },
  groupLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 14,
  },
  taskMain: { flex: 1, paddingRight: 8 },
  taskTitle: { fontSize: 16, fontWeight: '700' },
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
  addCard: { marginTop: 4, marginBottom: 16 },
  addLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  addInput: {
    borderWidth: 0.5,
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
  addBtnWrap: { borderRadius: 999, overflow: 'hidden' },
  addBtnDisabled: { opacity: 0.72 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 13,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  noteQuote: {
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
});
