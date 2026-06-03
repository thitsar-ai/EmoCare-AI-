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

export const OB_MOODS: Mood[] = [
  {
    emoji: '🌧️',
    label: 'Heavy',
    desc: 'Feeling burdened, exhausted, or low.',
    iconBg: 'rgba(139,92,246,0.42)',
    iconColor: '#F5F3FF',
    accentColor: '#8B5CF6',
    accentBg: 'rgba(139,92,246,0.18)',
    Icon: CloudRain,
    iconWeight: 'duotone',
  },
  {
    emoji: '🌊',
    label: 'Overwhelmed',
    desc: 'Too much happening at once.',
    iconBg: 'rgba(59,130,246,0.4)',
    iconColor: '#EFF6FF',
    accentColor: '#3B82F6',
    accentBg: 'rgba(59,130,246,0.18)',
    Icon: Waves,
    iconWeight: 'duotone',
  },
  {
    emoji: '☁️',
    label: 'Neutral',
    desc: 'Just getting through the day.',
    iconBg: 'rgba(167,139,250,0.36)',
    iconColor: '#FAF5FF',
    accentColor: '#A78BFA',
    accentBg: 'rgba(167,139,250,0.18)',
    Icon: SmileyMeh,
    iconWeight: 'duotone',
  },
  {
    emoji: '🌱',
    label: 'Hopeful',
    desc: 'A gentle optimism ahead.',
    iconBg: 'rgba(52,211,153,0.4)',
    iconColor: '#ECFDF5',
    accentColor: '#34D399',
    accentBg: 'rgba(52,211,153,0.18)',
    Icon: Plant,
    iconWeight: 'duotone',
  },
  {
    emoji: '🌤️',
    label: 'Light',
    desc: 'Uplifted, brighter, or a little lighter.',
    iconBg: 'rgba(251,191,36,0.42)',
    iconColor: '#FFFBEB',
    accentColor: '#FBBF24',
    accentBg: 'rgba(251,191,36,0.2)',
    Icon: Sun,
    iconWeight: 'duotone',
  },
  {
    emoji: '🕊️',
    label: 'Peaceful',
    desc: 'Calm, grounded, and at ease.',
    iconBg: 'rgba(56,189,248,0.4)',
    iconColor: '#F0F9FF',
    accentColor: '#38BDF8',
    accentBg: 'rgba(56,189,248,0.18)',
    Icon: Bird,
    iconWeight: 'duotone',
  },
  {
    emoji: '💜',
    label: 'Grateful',
    desc: 'Noticing something good today.',
    iconBg: 'rgba(192,132,252,0.4)',
    iconColor: '#FDF4FF',
    accentColor: '#C084FC',
    accentBg: 'rgba(192,132,252,0.18)',
    Icon: Heart,
    iconWeight: 'fill',
  },
  {
    emoji: '✨',
    label: 'Joyful',
    desc: 'Light-hearted, energized, and alive.',
    iconBg: 'rgba(251,146,60,0.42)',
    iconColor: '#FFF7ED',
    accentColor: '#FB923C',
    accentBg: 'rgba(251,146,60,0.2)',
    Icon: Sparkle,
    iconWeight: 'fill',
  },
];
