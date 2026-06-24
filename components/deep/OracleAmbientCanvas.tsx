import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { SANCTUARY_CANVAS_GRADIENT, tokens, rgba } from '../../theme/tokens';

const AMBIENT_STARS = [
  { cx: 48, cy: 120, r: 1.2, o: 0.25 },
  { cx: 340, cy: 96, r: 1.0, o: 0.2 },
  { cx: 280, cy: 180, r: 1.4, o: 0.18 },
  { cx: 92, cy: 280, r: 1.1, o: 0.15 },
  { cx: 360, cy: 340, r: 1.3, o: 0.16 },
  { cx: 32, cy: 420, r: 1.0, o: 0.12 },
  { cx: 196, cy: 64, r: 1.2, o: 0.14 },
];

/** Oracle canvas — sanctuary gradient with subtle constellation dust. */
export const OracleAmbientCanvas = memo(function OracleAmbientCanvas() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={[...SANCTUARY_CANVAS_GRADIENT]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFillObject}>
        {AMBIENT_STARS.map((star, index) => (
          <Circle
            key={`ambient-${index}`}
            cx={star.cx}
            cy={star.cy}
            r={star.r}
            fill={rgba(tokens.text.secondary, star.o)}
          />
        ))}
      </Svg>
    </View>
  );
});
