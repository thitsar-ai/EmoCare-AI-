import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as NativeSplash from 'expo-splash-screen';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { SanctuarySplashContent, SplashStarField } from '../shared/SanctuarySplash';
import { getCircadianTheme, SANCTUARY_SPLASH } from '../../theme/circadianTheme';

const IS_EXPO_GO = Constants.appOwnership === 'expo';
const SPLASH_THEME = getCircadianTheme(new Date(new Date().setHours(23, 0, 0, 0)));

/** Expo Go never embeds app.json splash art — only hide the native loader once JS paints. */
if (!IS_EXPO_GO) {
  NativeSplash.setOptions({ duration: 320, fade: true });
  NativeSplash.preventAutoHideAsync().catch(() => {});
}

const LazyApp = lazy(() => import('../../App'));

function LaunchFallback() {
  const progress = useRef(new Animated.Value(0.12)).current;
  const fadeIn = useRef(new Animated.Value(1)).current;
  const nativeHidden = useRef(false);

  useEffect(() => {
    if (nativeHidden.current) return;
    nativeHidden.current = true;
    requestAnimationFrame(() => {
      NativeSplash.hideAsync().catch(() => {});
    });

    Animated.timing(progress, {
      toValue: 0.65,
      duration: 12000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[SANCTUARY_SPLASH[0], SANCTUARY_SPLASH[1]]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <SplashStarField theme={SPLASH_THEME} variant="night" />
      <View style={styles.content}>
        <SanctuarySplashContent
          theme={SPLASH_THEME}
          fadeIn={fadeIn}
          progress={progress}
          reduceMotion
        />
      </View>
      <StatusBar style="light" />
    </View>
  );
}

export default function LaunchGate() {
  return (
    <Suspense fallback={<LaunchFallback />}>
      <LazyApp />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SANCTUARY_SPLASH[0],
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
