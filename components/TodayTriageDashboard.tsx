import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  addTodayTask,
  ENERGY_CATEGORIES,
  ENERGY_CATEGORY_ORDER,
  groupTasksByEnergy,
  loadTodayTasks,
  setTaskStatus,
  type EnergyCategoryId,
  type TriageTaskRecord,
} from '../utils/todayTriage';
import { generateMorningBriefing } from '../utils/emoMorningBriefing';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

type EnergyCategory = EnergyCategoryId;

interface TriageTask extends TriageTaskRecord {}

export interface TodayTriageDashboardProps {
  userName?: string;
  moodLabel?: string | null;
  ambientProgress?: number;
  onNav?: (screen: string) => void;
  refreshKey?: number;
}

function TriageTaskRow({
  task,
  onToggle,
}: {
  task: TriageTask;
  onToggle: (task: TriageTask) => void;
}) {
  const opacity = useSharedValue(task.status === 'done' ? 0.48 : 1);
  const isDone = task.status === 'done';

  useEffect(() => {
    opacity.value = withTiming(isDone ? 0.48 : 1, { duration: 380 });
  }, [isDone, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const meta = ENERGY_CATEGORIES[task.energyCategory];

  return (
    <Animated.View style={[styles.taskRow, animatedStyle]}>
      <Pressable
        onPress={() => onToggle(task)}
        style={[styles.taskCheck, isDone && styles.taskCheckDone, { borderColor: meta.accent }]}
        hitSlop={8}
      >
        {isDone ? <Text style={[styles.taskCheckMark, { color: meta.accent }]}>✓</Text> : null}
      </Pressable>
      <View style={styles.taskCopy}>
        <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.deadline ? (
          <Text style={styles.taskDeadline}>
            {new Date(task.deadline).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function TodayTriageDashboard({
  userName,
  moodLabel,
  ambientProgress = 0.45,
  onNav,
  refreshKey = 0,
}: TodayTriageDashboardProps) {
  const [tasks, setTasks] = useState<TriageTask[]>([]);
  const [guidance, setGuidance] = useState('');
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCategory, setDraftCategory] = useState<EnergyCategory>('deep_focus');
  const [showAdd, setShowAdd] = useState(false);

  const grouped = useMemo(() => groupTasksByEnergy(tasks), [tasks]);

  const reload = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const todayTasks = await loadTodayTasks();
      setTasks(todayTasks as TriageTask[]);

      setLoadingBriefing(true);
      const banner = await generateMorningBriefing({
        userName,
        moodLabel: moodLabel || undefined,
        ambientProgress,
        tasks: todayTasks,
      });
      setGuidance(banner);
    } catch {
      setGuidance('');
    } finally {
      setLoadingTasks(false);
      setLoadingBriefing(false);
    }
  }, [ambientProgress, moodLabel, userName]);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  const handleToggle = async (task: TriageTask) => {
    const nextStatus: TriageTask['status'] = task.status === 'done' ? 'pending' : 'done';
    if (nextStatus === 'done') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    await setTaskStatus(task.id, nextStatus);
    const updated: TriageTask[] = tasks.map((t) =>
      t.id === task.id ? { ...t, status: nextStatus } : t,
    );
    setTasks(updated);

    if (nextStatus === 'done') {
      const banner = await generateMorningBriefing({
        userName,
        moodLabel: moodLabel || undefined,
        ambientProgress,
        tasks: updated,
        force: true,
      });
      setGuidance(banner);
    }
  };

  const handleAdd = async () => {
    const title = draftTitle.trim();
    if (!title) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    } catch {}
    await addTodayTask({ title, energyCategory: draftCategory });
    setDraftTitle('');
    setShowAdd(false);
    reload();
  };

  return (
    <View style={styles.root}>
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Today View</Text>
            <Text style={styles.title}>Smart triage</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAdd((v) => !v)} style={styles.addBtn} activeOpacity={0.82}>
            <Text style={styles.addBtnText}>{showAdd ? '×' : '+'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.guidanceBanner}>
          {loadingBriefing && !guidance ? (
            <ActivityIndicator size="small" color="#6B4FA8" />
          ) : (
            <Text style={styles.guidanceText}>
              {guidance || 'Add an intention below — Emo will help you frame the day.'}
            </Text>
          )}
        </View>

        <View style={styles.chipRow}>
          {ENERGY_CATEGORY_ORDER.map((key: EnergyCategoryId) => {
            const meta = ENERGY_CATEGORIES[key];
            const count = tasks.filter((t) => t.energyCategory === key && t.status === 'pending').length;
            return (
              <View key={key} style={[styles.chip, { backgroundColor: meta.chipBg }]}>
                <Text style={[styles.chipText, { color: meta.accent }]}>{meta.shortLabel}</Text>
                {count > 0 ? (
                  <View style={[styles.chipBadge, { backgroundColor: meta.accent }]}>
                    <Text style={styles.chipBadgeText}>{count}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {showAdd ? (
          <View style={styles.addPanel}>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Name today's intention…"
              placeholderTextColor="rgba(61,40,88,0.35)"
              style={styles.addInput}
            />
            <View style={styles.addCategoryRow}>
              {ENERGY_CATEGORY_ORDER.map((key: EnergyCategoryId) => {
                const meta = ENERGY_CATEGORIES[key];
                const selected = draftCategory === key;
                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.82}
                    onPress={() => setDraftCategory(key)}
                    style={[
                      styles.addCategoryChip,
                      selected && { backgroundColor: meta.chipBg, borderColor: meta.accent },
                    ]}
                  >
                    <Text style={[styles.addCategoryText, selected && { color: meta.accent }]}>
                      {meta.shortLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={handleAdd} activeOpacity={0.88} style={styles.saveIntentBtn}>
              <Text style={styles.saveIntentText}>Add intention</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loadingTasks ? (
          <ActivityIndicator color="#6B4FA8" style={{ marginVertical: 16 }} />
        ) : grouped.length === 0 ? (
          <Text style={styles.emptyCopy}>
            No intentions yet. Tap + to triage your day by energy, not urgency alone.
          </Text>
        ) : (
          grouped.map(({ category, tasks: groupTasks }) => (
            <View key={category.id} style={styles.group}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupDot, { backgroundColor: category.accent }]} />
                <Text style={styles.groupLabel}>{category.label}</Text>
              </View>
              {groupTasks.map((task: TriageTaskRecord) => (
                <TriageTaskRow key={task.id} task={task} onToggle={handleToggle} />
              ))}
              {category.id === 'restorative' && onNav ? (
                <TouchableOpacity onPress={() => onNav('breathe')} activeOpacity={0.85} style={styles.restoreLink}>
                  <Text style={styles.restoreLinkText}>Open Breathe sanctuary →</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 26,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#C4A8F8',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inner: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(61,40,88,0.48)',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 20,
    color: '#3D2858',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderWidth: 0.5,
    borderColor: 'rgba(251,233,210,0.65)',
  },
  addBtnText: {
    fontSize: 22,
    color: '#6B4FA8',
    fontWeight: '300',
    marginTop: -2,
  },
  guidanceBanner: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: 0.5,
    borderColor: 'rgba(251, 233, 210, 0.55)',
    marginBottom: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  guidanceText: {
    fontFamily: SERIF,
    fontSize: 15,
    lineHeight: 22,
    color: '#3D2858',
    fontStyle: 'italic',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addPanel: {
    marginBottom: 14,
    gap: 10,
  },
  addInput: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#3D2858',
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  addCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addCategoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  addCategoryText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(61,40,88,0.55)',
  },
  saveIntentBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(196,168,248,0.28)',
    borderWidth: 0.5,
    borderColor: 'rgba(196,168,248,0.4)',
  },
  saveIntentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B4FA8',
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(61,40,88,0.55)',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  group: {
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  groupDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(61,40,88,0.62)',
    letterSpacing: 0.3,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  taskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  taskCheckDone: {
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  taskCheckMark: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskCopy: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    lineHeight: 21,
    color: '#3D2858',
    fontWeight: '500',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: 'rgba(61,40,88,0.52)',
  },
  taskDeadline: {
    fontSize: 11,
    color: 'rgba(61,40,88,0.45)',
    marginTop: 2,
  },
  restoreLink: {
    marginTop: 4,
    paddingVertical: 6,
  },
  restoreLinkText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#5DCAA5',
  },
});
