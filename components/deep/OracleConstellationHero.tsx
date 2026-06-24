import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, RadialGradient, Stop } from 'react-native-svg';
import { tokens, rgba } from '../../theme/tokens';

const STARS = [
  { cx: 28, cy: 22, r: 1.6, opacity: 0.55 },
  { cx: 52, cy: 14, r: 1.2, opacity: 0.4 },
  { cx: 78, cy: 28, r: 1.4, opacity: 0.5 },
  { cx: 96, cy: 12, r: 1.1, opacity: 0.35 },
  { cx: 18, cy: 48, r: 1.3, opacity: 0.45 },
  { cx: 108, cy: 44, r: 1.5, opacity: 0.5 },
  { cx: 42, cy: 58, r: 1.1, opacity: 0.38 },
  { cx: 88, cy: 62, r: 1.2, opacity: 0.42 },
  { cx: 64, cy: 8, r: 1.0, opacity: 0.32 },
  { cx: 12, cy: 34, r: 1.0, opacity: 0.3 },
];

const CONSTELLATION_LINES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 4],
  [4, 6],
  [6, 7],
  [7, 5],
  [5, 3],
  [1, 8],
  [2, 7],
];

/** Oracle identity — constellation, intelligent orb, subtle animated light (not Emo). */
export function OracleConstellationHero() {
  const pulse = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 4800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 4800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    driftLoop.start();
    return () => {
      pulseLoop.stop();
      driftLoop.stop();
    };
  }, [pulse, drift]);

  const orbScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const orbOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.42] });
  const driftY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

  return (
    <View style={styles.wrap} accessibilityLabel="Oracle knowledge companion">
      <Animated.View style={[styles.constellationWrap, { transform: [{ translateY: driftY }] }]}>
        <Svg width={120} height={72} viewBox="0 0 120 72">
          {CONSTELLATION_LINES.map(([a, b], index) => {
            const from = STARS[a];
            const to = STARS[b];
            return (
              <Line
                key={`line-${index}`}
                x1={from.cx}
                y1={from.cy}
                x2={to.cx}
                y2={to.cy}
                stroke={rgba(tokens.text.primary, 0.18)}
                strokeWidth={0.8}
              />
            );
          })}
          {STARS.map((star, index) => (
            <Circle
              key={`star-${index}`}
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              fill={rgba(tokens.text.secondary, 0.75)}
              opacity={star.opacity}
            />
          ))}
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.outerRing,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
            borderColor: `${tokens.oracle.accent}55`,
          },
        ]}
      />

      <Animated.View style={[styles.orbWrap, { opacity: orbOpacity, transform: [{ scale: orbScale }] }]}>
        <Svg width={88} height={88} viewBox="0 0 88 88">
          <Defs>
            <RadialGradient id="oracleOrb" cx="50%" cy="42%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#E8FFFF" stopOpacity={1} />
              <Stop offset="35%" stopColor={tokens.oracle.accentSecondary} stopOpacity={0.95} />
              <Stop offset="72%" stopColor={tokens.oracle.accent} stopOpacity={0.88} />
              <Stop offset="100%" stopColor={tokens.text.primary} stopOpacity={0.55} />
            </RadialGradient>
            <RadialGradient id="oracleCore" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
              <Stop offset="100%" stopColor={tokens.oracle.accent} stopOpacity={0.35} />
            </RadialGradient>
          </Defs>
          <Circle cx={44} cy={44} r={38} fill="url(#oracleOrb)" />
          <Circle cx={44} cy={44} r={24} fill="url(#oracleCore)" opacity={0.65} />
          <G opacity={0.85}>
            <Circle cx={44} cy={38} r={3.2} fill="#FFFFFF" />
            <Circle cx={34} cy={48} r={2} fill="rgba(255,255,255,0.75)" />
            <Circle cx={54} cy={48} r={2} fill="rgba(255,255,255,0.75)" />
            <Circle cx={44} cy={52} r={1.6} fill="rgba(255,255,255,0.6)" />
            <Line x1={44} y1={38} x2={34} y2={48} stroke="rgba(255,255,255,0.5)" strokeWidth={0.8} />
            <Line x1={44} y1={38} x2={54} y2={48} stroke="rgba(255,255,255,0.5)" strokeWidth={0.8} />
            <Line x1={34} y1={48} x2={54} y2={48} stroke="rgba(255,255,255,0.35)" strokeWidth={0.8} />
            <Line x1={44} y1={38} x2={44} y2={52} stroke="rgba(255,255,255,0.35)" strokeWidth={0.8} />
          </G>
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          styles.glow,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] }),
            backgroundColor: tokens.oracle.accentSecondary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  constellationWrap: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
  },
  orbWrap: {
    zIndex: 2,
  },
  glow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    zIndex: 0,
    transform: [{ scale: 1.35 }],
  },
});
