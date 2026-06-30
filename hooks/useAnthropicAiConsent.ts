import { useCallback, useEffect, useState } from 'react';
import { grantAiConsent, hasAiConsent } from '../utils/aiConsent';

/** Load consent flag and surface the disclosure sheet when missing. */
export function useAnthropicAiConsent() {
  const [consentReady, setConsentReady] = useState(false);
  const [showConsentSheet, setShowConsentSheet] = useState(false);

  useEffect(() => {
    let mounted = true;
    hasAiConsent()
      .then((granted) => {
        if (mounted && !granted) setShowConsentSheet(true);
      })
      .catch(() => {
        if (mounted) setShowConsentSheet(true);
      })
      .finally(() => {
        if (mounted) setConsentReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const grantConsent = useCallback(async () => {
    await grantAiConsent();
    setShowConsentSheet(false);
  }, []);

  const ensureConsentBeforeSend = useCallback(async (): Promise<boolean> => {
    const granted = await hasAiConsent();
    if (granted) return true;
    setShowConsentSheet(true);
    return false;
  }, []);

  return {
    consentReady,
    showConsentSheet,
    grantConsent,
    ensureConsentBeforeSend,
  };
}
