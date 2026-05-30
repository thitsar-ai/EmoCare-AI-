import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface SanctuaryRippleRingsProps {
  size?: number;
}

export function SanctuaryRippleRings({ size = 280 }: SanctuaryRippleRingsProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 5200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 5200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const rings = [
    { scale: 0.38, opacity: 0.22 },
    { scale: 0.52, opacity: 0.18 },
    { scale: 0.66, opacity: 0.14 },
    { scale: 0.82, opacity: 0.1 },
    { scale: 0.96, opacity: 0.07 },
  ];

  return (
    <View style={[styles.wrap, { width: size, height: size * 0.72 }]} pointerEvents="none">
      {rings.map((ring, index) => (
        <Animated.View
          key={`ring-${index}`}
          style={[
            styles.ring,
            {
              width: size * ring.scale,
              height: size * ring.scale * 0.42,
              borderRadius: size,
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [ring.opacity, ring.opacity + 0.06],
              }),
              transform: [{
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1 + index * 0.008],
                }),
              }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(251, 214, 168, 0.28)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});
