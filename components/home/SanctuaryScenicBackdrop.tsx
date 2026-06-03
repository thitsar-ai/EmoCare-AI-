import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { isSanctuaryDayArt } from '../../theme/sanctuaryHeroArt';

const DAY_WASH = ['#ddd5f0', '#ede5f5', '#f5e0ee', '#faf0f8'] as [string, string, string, string];
const NIGHT_WASH = ['#0a0520', '#12082a', '#1a1035', '#140a2e'] as [string, string, string, string];

const STAR_POINTS = [
  { cx: 28, cy: 52, r: 1.4, o: 0.55 },
  { cx: 64, cy: 38, r: 1.2, o: 0.45 },
  { cx: 92, cy: 72, r: 1.5, o: 0.5 },
  { cx: 118, cy: 48, r: 1.1, o: 0.4 },
  { cx: 156, cy: 64, r: 1.3, o: 0.55 },
  { cx: 198, cy: 44, r: 1.2, o: 0.35 },
  { cx: 240, cy: 58, r: 1.4, o: 0.5 },
  { cx: 280, cy: 36, r: 1.1, o: 0.45 },
  { cx: 320, cy: 70, r: 1.3, o: 0.4 },
  { cx: 352, cy: 52, r: 1.2, o: 0.5 },
];

/** Home-only scenic wash — day lavender clouds or night moon + stars (Look 1 / Look 2). */
export function SanctuaryScenicBackdrop({ theme }: { theme: CircadianTheme }) {
  const dayArt = isSanctuaryDayArt(theme.phase);

  const stars = useMemo(() => STAR_POINTS, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={dayArt ? DAY_WASH : NIGHT_WASH}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {dayArt ? (
        <>
          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.dayCloudTop}
          />
          <LinearGradient
            colors={['transparent', `${theme.accent}12`]}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 1, y: 1 }}
            style={styles.dayGlowBottom}
          />
        </>
      ) : (
        <>
          <Svg width="100%" height={120} style={styles.nightSky} viewBox="0 0 390 120">
            {stars.map((s, i) => (
              <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={`rgba(255,255,255,${s.o})`} />
            ))}
            <Path
              d="M 300 34 A 14 14 0 1 1 272 34 A 11 11 0 1 0 300 34"
              fill="rgba(255,245,210,0.85)"
            />
          </Svg>
          <LinearGradient
            colors={['rgba(255,200,120,0.1)', 'transparent']}
            start={{ x: 0.2, y: 1 }}
            end={{ x: 0.5, y: 0.3 }}
            style={styles.lanternGlow}
          />
          <LinearGradient
            colors={['rgba(155,123,255,0.14)', 'transparent']}
            start={{ x: 0.8, y: 0 }}
            end={{ x: 0.2, y: 0.6 }}
            style={styles.nightGlow}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dayCloudTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  dayGlowBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  nightSky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  nightGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  lanternGlow: {
    position: 'absolute',
    left: 24,
    top: 120,
    width: 120,
    height: 100,
    borderRadius: 60,
  },
});
