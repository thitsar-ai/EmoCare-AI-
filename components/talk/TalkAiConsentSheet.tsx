import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { openPrivacyPolicy } from '../../constants/legalLinks';
import { tokens } from '../../theme/tokens';
import { PrimaryActionButton } from '../shared/PrimaryActionButton';
import { SERIF } from '../shared/CircadianHeroGlow';

const TITLE = 'Before You Talk with Emo';

const BODY =
  "Your messages are processed by Anthropic's AI to generate Emo's replies. Only your chat messages are transmitted — nothing else. Messages are not stored long-term on our servers. Your journal, check-ins, and Memory Ledger stay on your device only.";

type Props = {
  visible: boolean;
  theme: CircadianTheme;
  onConsent: () => void;
};

const CONSENT_CARD_BG = '#FFFCFA';

/** One-time disclosure before the first AI session — Talk, Oracle, etc. (Apple 5.1.1i / 5.1.2i). */
export function TalkAiConsentSheet({ visible, theme, onConsent }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: CONSENT_CARD_BG,
              borderColor: tokens.border.standard,
            },
          ]}
        >
          <Text style={[styles.title, { color: tokens.text.primary }]}>{TITLE}</Text>
          <Text style={[styles.body, { color: tokens.text.secondary }]}>{BODY}</Text>

          <PrimaryActionButton
            label="I Understand — Start Talking"
            onPress={onConsent}
            theme={theme}
            style={styles.button}
          />

          <Pressable
            onPress={() => openPrivacyPolicy()}
            hitSlop={10}
            accessibilityRole="link"
            accessibilityLabel="View Privacy Policy"
            style={({ pressed }) => [styles.privacyLink, pressed && { opacity: 0.75 }]}
          >
            <Text style={[styles.privacyText, { color: tokens.brand.accent }]}>
              View Privacy Policy
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#3D2A6B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    alignSelf: 'stretch',
  },
  privacyLink: {
    marginTop: 14,
    paddingVertical: 6,
  },
  privacyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
