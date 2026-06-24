import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { PASSCODE_LENGTH } from '../../utils/passcodeLock';

const KEY_SIZE = 76;
const KEY_GAP = 12;

type PasscodeEntryProps = {
  theme: CircadianTheme;
  title: string;
  subtitle?: string;
  error?: string | null;
  onComplete: (pin: string) => void;
  onPinChange?: () => void;
};

const KEYPAD_ROWS: Array<Array<string>> = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export function PasscodeEntry({
  theme,
  title,
  subtitle,
  error,
  onComplete,
  onPinChange,
}: PasscodeEntryProps) {
  const [pin, setPin] = useState('');
  const shake = useRef(new Animated.Value(0)).current;
  const titleRef = useRef(title);

  const resetPin = useCallback(() => {
    setPin('');
    onPinChange?.();
  }, [onPinChange]);

  useEffect(() => {
    if (titleRef.current === title) return;
    titleRef.current = title;
    resetPin();
  }, [title, resetPin]);

  useEffect(() => {
    if (!error) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    resetPin();
  }, [error, resetPin, shake]);

  const appendDigit = (digit: string) => {
    if (pin.length >= PASSCODE_LENGTH) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = `${pin}${digit}`;
    setPin(next);
    onPinChange?.();
    if (next.length === PASSCODE_LENGTH) {
      onComplete(next);
    }
  };

  const backspace = () => {
    if (!pin.length) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin((prev) => prev.slice(0, -1));
    onPinChange?.();
  };

  const renderKey = (key: string, keyId: string) => {
    if (key === '') {
      return <View key={keyId} style={styles.keySlot} />;
    }

    if (key === 'del') {
      return (
        <Pressable
          key={keyId}
          onPress={backspace}
          style={({ pressed }) => [
            styles.keyBtn,
            {
              backgroundColor: pressed ? `${theme.accent}44` : theme.card,
              borderColor: pressed ? theme.accent : theme.border,
              borderWidth: pressed ? 1.5 : 0.5,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Delete"
        >
          <Delete size={22} color={theme.text} strokeWidth={2.2} />
        </Pressable>
      );
    }

    return (
      <Pressable
        key={keyId}
        onPress={() => appendDigit(key)}
        style={({ pressed }) => [
          styles.keyBtn,
          {
            backgroundColor: pressed ? `${theme.accent}44` : theme.card,
            borderColor: pressed ? theme.accent : theme.border,
            borderWidth: pressed ? 1.5 : 0.5,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Digit ${key}`}
      >
        <Text style={[styles.keyText, { color: theme.text }]}>{key}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>{subtitle}</Text>
      ) : null}

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}>
        {Array.from({ length: PASSCODE_LENGTH }).map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              {
                borderColor: error ? '#E87898' : theme.border,
                backgroundColor: idx < pin.length ? theme.accent : 'transparent',
              },
            ]}
          />
        ))}
      </Animated.View>

      {error ? <Text style={styles.errorText}>{error}</Text> : <View style={styles.errorSpacer} />}

      <View style={styles.keypad}>
        {KEYPAD_ROWS.map((row, rowIdx) => (
          <View key={`row-${rowIdx}`} style={styles.keyRow}>
            {row.map((key, colIdx) => renderKey(key, `${rowIdx}-${colIdx}-${key || 'spacer'}`))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  errorText: {
    color: '#E87898',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 18,
    minHeight: 20,
    textAlign: 'center',
  },
  errorSpacer: { height: 38 },
  keypad: {
    width: KEY_SIZE * 3 + KEY_GAP * 2,
    alignSelf: 'center',
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: KEY_GAP,
    marginBottom: KEY_GAP,
  },
  keySlot: {
    width: KEY_SIZE,
    height: KEY_SIZE,
  },
  keyBtn: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 32,
  },
});
