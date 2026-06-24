import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { tokens } from '../../theme/tokens';
import { HeartNoteField } from '../shared/HeartNoteField';
import {
  loadCarryThoughtDraft,
  persistCarryThoughtDraft,
  saveCarryThoughtToJournal,
} from '../../utils/carryThought';

export function ReflectionNoteCard({ theme }: { theme: CircadianTheme }) {
  const [text, setText] = useState('');
  const [savedHint, setSavedHint] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadCarryThoughtDraft().then(setText);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  const flushSave = useCallback(async (next: string) => {
    await persistCarryThoughtDraft(next);
    await saveCarryThoughtToJournal(next);
    if (next.trim()) {
      setSavedHint('Saved to your journal');
      if (hintTimer.current) clearTimeout(hintTimer.current);
      hintTimer.current = setTimeout(() => setSavedHint(''), 2400);
    } else {
      setSavedHint('');
    }
  }, []);

  const scheduleSave = useCallback(
    (next: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flushSave(next);
      }, 900);
    },
    [flushSave],
  );

  const handleChange = (next: string) => {
    setText(next);
    void persistCarryThoughtDraft(next);
    scheduleSave(next);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tokens.bg.surface, borderColor: tokens.border.subtle },
      ]}
    >
      <HeartNoteField
        theme={theme}
        variant="reflection"
        value={text}
        onChangeText={handleChange}
        onBlur={() => void flushSave(text)}
      />
      {savedHint ? (
        <Text style={[styles.savedHint, { color: theme.mutedText }]}>{savedHint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 12,
  },
  savedHint: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
  },
});
