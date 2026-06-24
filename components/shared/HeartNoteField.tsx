import React from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { tokens } from '../../theme/tokens';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

type HeartNoteFieldProps = {
  theme: CircadianTheme;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  variant?: 'checkin' | 'onboarding' | 'reflection';
  title?: string;
  subtitle?: string;
  placeholder?: string;
  maxLength?: number;
  cardStyle?: object;
};

export function HeartNoteField({
  theme,
  value,
  onChangeText,
  onBlur,
  variant = 'checkin',
  title,
  subtitle,
  placeholder = 'You can begin softly...',
  maxLength = 500,
  cardStyle,
}: HeartNoteFieldProps) {
  const resolvedTitle =
    title ??
    (variant === 'reflection'
      ? "What's on your heart today?"
      : "What's on your heart?");
  const resolvedSubtitle =
    subtitle ??
    (variant === 'checkin'
      ? 'You can skip this — a mood alone is enough.'
      : variant === 'reflection'
        ? 'A thought you would like to carry today. Optional — saved to your journal.'
        : undefined);

  if (variant === 'onboarding') {
    return (
      <View style={styles.onboardingWrap}>
        <Text style={[styles.title, styles.titleOnboarding, { color: theme.text }]}>{resolvedTitle}</Text>
        <View
          style={[
            styles.onboardingCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            cardStyle,
          ]}
        >
          <TextInput
            style={[styles.inputOnboarding, { color: theme.text }]}
            placeholder={placeholder}
            placeholderTextColor={theme.mutedText}
            value={value}
            onChangeText={onChangeText}
            onBlur={onBlur}
            multiline
            textAlignVertical="top"
            maxLength={maxLength}
            accessibilityLabel={resolvedTitle}
          />
        </View>
      </View>
    );
  }

  if (variant === 'checkin') {
    return (
      <View style={[styles.checkinCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.title, { color: theme.text }]}>
          {resolvedTitle}
          <Text style={{ color: theme.mutedText, fontWeight: '400' }}> (Optional)</Text>
        </Text>
        {resolvedSubtitle ? (
          <Text style={[styles.subtitle, { color: theme.mutedText }]}>{resolvedSubtitle}</Text>
        ) : null}
        <TextInput
          style={[
            styles.inputCheckin,
            { color: theme.text, backgroundColor: tokens.bg.surfaceHigh },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.mutedText}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          multiline
          textAlignVertical="top"
          maxLength={maxLength}
          accessibilityLabel={resolvedTitle}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapReflection}>
      <Text style={[styles.titleReflection, { color: theme.text }]}>{resolvedTitle}</Text>
      {resolvedSubtitle ? (
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>{resolvedSubtitle}</Text>
      ) : null}
      <TextInput
        style={[
          styles.inputReflection,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: tokens.bg.surfaceHigh,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedText}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        multiline
        textAlignVertical="top"
        maxLength={maxLength}
        accessibilityLabel={resolvedTitle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapReflection: {
    marginBottom: 0,
  },
  onboardingWrap: {
    width: '100%',
  },
  checkinCard: {
    borderWidth: 0.5,
    borderRadius: 18,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  titleOnboarding: {
    fontFamily: SERIF,
    fontSize: 17,
    marginBottom: 6,
  },
  titleReflection: {
    fontFamily: SERIF,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  inputCheckin: {
    borderRadius: 14,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputReflection: {
    borderWidth: 0.5,
    borderRadius: 14,
    minHeight: 72,
    fontFamily: SERIF,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  onboardingCard: {
    borderWidth: 0.5,
    borderRadius: 18,
    padding: 14,
    marginBottom: 22,
    minHeight: 110,
  },
  inputOnboarding: {
    fontSize: 14,
    lineHeight: 21,
    minHeight: 88,
    padding: 0,
  },
});
