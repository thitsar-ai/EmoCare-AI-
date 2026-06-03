import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

const LOTUS_SIZE = 248;
const VIEW_PAD = 32;
const VIEW_SIZE = LOTUS_SIZE + VIEW_PAD * 2;
const CX = LOTUS_SIZE / 2;
const CY = LOTUS_SIZE / 2;
const RING_SIZE = LOTUS_SIZE + 56;
const RING_RADIUS = RING_SIZE / 2 - 6;
const DOT_SIZE = 12;
const PLAYHEAD_TOP = RING_SIZE / 2 - RING_RADIUS - DOT_SIZE / 2;

export const BREATH_ORB_RING_SIZE = RING_SIZE;

const BLOOM_SCALE = 1.38;
const PETAL_LIFT = -26;
const PETAL_SPREAD = 1.18;
const PETAL_PATH = 'M 0,8 C -17,-6 -19,-46 0,-60 C 19,-46 17,-8 0,8 Z';
const INNER_ANGLES = [0, 90, 180, 270] as const;
const OUTER_ANGLES = [45, 135, 225, 315] as const;

const LotusFlower = memo(function LotusFlower() {
  return (
    <Svg
      width={LOTUS_SIZE}
      height={LOTUS_SIZE}
      viewBox={`${-VIEW_PAD} ${-VIEW_PAD} ${VIEW_SIZE} ${VIEW_SIZE}`}
    >
      <Defs>
        <RadialGradient id="petalGrad" cx="50%" cy="72%" r="85%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
          <Stop offset="50%" stopColor="rgba(245,232,255,0.9)" />
          <Stop offset="100%" stopColor="rgba(210,180,250,0.62)" />
        </RadialGradient>
        <RadialGradient id="ambientGlow" cx="50%" cy="50%" r="52%">
          <Stop offset="0%" stopColor="rgba(220,195,255,0.28)" />
          <Stop offset="70%" stopColor="rgba(200,170,255,0.08)" />
          <Stop offset="100%" stopColor="rgba(190,160,255,0)" />
        </RadialGradient>
      </Defs>

      <Ellipse cx={CX} cy={CY} rx={92} ry={92} fill="url(#ambientGlow)" opacity={0.45} />

      <G transform={`translate(${CX}, ${CY}) scale(${BLOOM_SCALE}) translate(${-CX}, ${-CY})`}>
        {OUTER_ANGLES.map((angle) => (
          <Path
            key={`outer-${angle}`}
            d={PETAL_PATH}
            fill="url(#petalGrad)"
            opacity={0.88}
            transform={`translate(${CX}, ${CY}) rotate(${angle}) translate(0, ${PETAL_LIFT}) scale(${PETAL_SPREAD})`}
          />
        ))}
        {INNER_ANGLES.map((angle) => (
          <Path
            key={`inner-${angle}`}
            d={PETAL_PATH}
            fill="url(#petalGrad)"
            opacity={0.96}
            transform={`translate(${CX}, ${CY}) rotate(${angle}) translate(0, ${PETAL_LIFT}) scale(${PETAL_SPREAD})`}
          />
        ))}

        <Path
          d="M 0,4 C -5,-4 -5,-16 0,-22 C 5,-16 5,-4 0,4 Z"
          fill="rgba(255,255,255,0.96)"
          transform={`translate(${CX}, ${CY}) translate(0, -18)`}
        />

        <Circle cx={CX} cy={CY} r={12} fill="rgba(218,185,95,0.94)" />
        <Circle cx={CX} cy={CY} r={6.5} fill="rgba(255,248,220,0.98)" />
      </G>
    </Svg>
  );
});

const RingTrack = memo(function RingTrack() {
  const center = RING_SIZE / 2;
  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
      <Circle
        cx={center}
        cy={center}
        r={RING_RADIUS}
        stroke="rgba(255,255,255,0.38)"
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  );
});

const RingDot = memo(function RingDot({ progress }: { progress: number }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.playheadArm, { transform: [{ rotate: `${progress * 360}deg` }] }]}
    >
      <View style={styles.playheadDot} />
    </View>
  );
});

const LotusCenter = memo(function LotusCenter({ instruction }: { instruction?: React.ReactNode }) {
  return (
    <View style={styles.lotusWrap} collapsable={false}>
      <LotusFlower />
      {instruction ? (
        <View style={styles.instructionOverlay} pointerEvents="none">
          {instruction}
        </View>
      ) : null}
    </View>
  );
});

export function LotusOrb({
  ringProgress,
  onPress,
  disabled,
  instruction,
}: {
  ringProgress: number;
  onPress?: () => void;
  disabled?: boolean;
  instruction?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.hitArea}>
      <View style={styles.stack} collapsable={false}>
        <RingTrack />
        <RingDot progress={ringProgress} />
        <LotusCenter instruction={instruction} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: { alignItems: 'center', justifyContent: 'center' },
  stack: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  playheadArm: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
  },
  playheadDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#FFFFFF',
    marginTop: PLAYHEAD_TOP,
  },
  lotusWrap: {
    width: LOTUS_SIZE,
    height: LOTUS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
});
