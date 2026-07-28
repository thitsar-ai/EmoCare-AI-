import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { openPrivacyPolicy } from '../../constants/legalLinks';
import { tokens } from '../../theme/tokens';
import { PrimaryActionButton } from '../shared/PrimaryActionButton';
import { SERIF } from '../shared/CircadianHeroGlow';
import { useUiCopy } from '../i18n/UiCopyProvider';

type Props = {
  visible: boolean;
  theme: CircadianTheme;
  onConsent: () => void;
};

const CONSENT_CARD_BG = '#FFFCFA';

/** One-time disclosure before the first AI session — Talk, Oracle, etc. (Apple 5.1.1i / 5.1.2i). */
export function TalkAiConsentSheet({ visible, theme, onConsent }: Props) {
  const { t } = useUiCopy();

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
          <Text style={[styles.title, { color: tokens.text.primary }]}>{t('consent.title')}</Text>
          <Text style={[styles.body, { color: tokens.text.secondary }]}>{t('consent.body')}</Text>

          <PrimaryActionButton
            label={t('consent.continue')}
            onPress={onConsent}
            theme={theme}
            style={styles.button}
          />

          <Pressable
            onPress={() => openPrivacyPolicy()}
            hitSlop={10}
            accessibilityRole="link"
            accessibilityLabel={t('consent.privacyLink')}
            style={({ pressed }) => [styles.privacyLink, pressed && { opacity: 0.75 }]}
          >
            <Text style={[styles.privacyText, { color: tokens.brand.accent }]}>
              {t('consent.privacyLink')}
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
