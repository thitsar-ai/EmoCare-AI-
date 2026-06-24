import type { Icon, IconWeight } from 'phosphor-react-native';
import {
  Bird,
  CloudRain,
  Heart,
  Plant,
  SmileyMeh,
  Sparkle,
  Sun,
  Waves,
} from 'phosphor-react-native';
import { rgba, tokens } from '../theme/tokens';

export interface Mood {
  emoji: string;
  label: string;
  desc: string;
  iconBg?: string;
  iconColor?: string;
  accentColor?: string;
  accentBg?: string;
  Icon?: Icon;
  iconWeight?: IconWeight;
}

function moodEntry(
  emoji: string,
  label: keyof typeof tokens.mood,
  desc: string,
  Icon: Icon,
  iconWeight: IconWeight = 'duotone',
): Mood {
  const accent = tokens.mood[label];
  return {
    emoji,
    label: label.charAt(0).toUpperCase() + label.slice(1),
    desc,
    iconBg: rgba(accent, 0.42),
    iconColor: '#FFFFFF',
    accentColor: accent,
    accentBg: rgba(accent, 0.18),
    Icon,
    iconWeight,
  };
}

export const OB_MOODS: Mood[] = [
  moodEntry('🌧️', 'heavy', 'Feeling burdened, exhausted, or low.', CloudRain),
  moodEntry('🌊', 'overwhelmed', 'Too much happening at once.', Waves),
  moodEntry('☁️', 'neutral', 'Just getting through the day.', SmileyMeh),
  moodEntry('🌱', 'hopeful', 'A gentle optimism ahead.', Plant),
  moodEntry('🌤️', 'light', 'Uplifted, brighter, or a little lighter.', Sun),
  moodEntry('🕊️', 'peaceful', 'Calm, grounded, and at ease.', Bird),
  { ...moodEntry('💜', 'grateful', 'Noticing something good today.', Heart, 'fill'), iconWeight: 'fill' },
  { ...moodEntry('✨', 'joyful', 'Light-hearted, energized, and alive.', Sparkle, 'fill'), iconWeight: 'fill' },
];
