import React, { memo, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const STAR_SEED = [
  [0.08, 0.12, 0.35], [0.22, 0.08, 0.5], [0.41, 0.06, 0.28], [0.67, 0.11, 0.42],
  [0.84, 0.09, 0.32], [0.93, 0.18, 0.38], [0.15, 0.22, 0.45], [0.52, 0.19, 0.3],
  [0.76, 0.24, 0.36], [0.31, 0.28, 0.52], [0.61, 0.31, 0.28], [0.88, 0.33, 0.44],
  [0.11, 0.38, 0.3], [0.44, 0.41, 0.4], [0.69, 0.44, 0.34], [0.26, 0.48, 0.48],
  [0.57, 0.52, 0.32], [0.82, 0.5, 0.42], [0.18, 0.56, 0.36], [0.48, 0.58, 0.28],
  [0.73, 0.61, 0.46], [0.36, 0.64, 0.34], [0.91, 0.62, 0.38], [0.06, 0.68, 0.42],
  [0.54, 0.71, 0.3], [0.79, 0.74, 0.44], [0.23, 0.76, 0.36], [0.63, 0.79, 0.32],
];

function Starfield() {
  const stars = useMemo(
    () =>
      STAR_SEED.map(([x, y, o], i) => ({
        id: i,
        left: x * SCREEN_W,
        top: y * SCREEN_H,
        opacity: o,
        size: i % 3 === 0 ? 2 : 1.5,
      })),
    [],
  );

  return (
    <>
      {stars.map((star) => (
        <View
          key={star.id}
          pointerEvents="none"
          style={[
            styles.star,
            {
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </>
  );
}

/** Oracle Mode canvas — chrono gradient and optional starfield. */
export const OracleAmbientCanvas = memo(function OracleAmbientCanvas({
  isDay,
}: {
  isDay: boolean;
}) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={
          isDay
            ? ['#E4DDF2', '#EBE4F6', '#F0EBF8', '#F5F0FA']
            : ['#080614', '#0e0920', '#130d2a', '#1a1038']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {isDay ? null : <Starfield />}
    </View>
  );
});

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    borderRadius: 2,
    backgroundColor: 'rgba(220,205,255,0.85)',
  },
});
