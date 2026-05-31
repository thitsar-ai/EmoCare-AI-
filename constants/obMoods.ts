import {
  Bird,
  CloudMoon,
  CloudRain,
  CloudSun,
  Heart,
  Sparkles,
  Sprout,
  WavesHorizontal,
  type LucideIcon,
} from 'lucide-react-native';

export interface Mood {
  emoji: string;
  label: string;
  desc: string;
  iconBg?: string;
  iconColor?: string;
  iconFill?: string;
  accentColor?: string;
  accentBg?: string;
  Icon?: LucideIcon;
}

export const OB_MOODS: Mood[] = [
  {
    emoji: '🌧️',
    label: 'Heavy',
    desc: 'Feeling burdened, exhausted, or low.',
    iconBg: 'rgba(139,92,246,0.38)',
    iconColor: '#EDE9FE',
    iconFill: 'rgba(196,181,253,0.55)',
    accentColor: '#8B5CF6',
    accentBg: 'rgba(139,92,246,0.18)',
    Icon: CloudRain,
  },
  {
    emoji: '🌊',
    label: 'Overwhelmed',
    desc: 'Too much happening at once.',
    iconBg: 'rgba(59,130,246,0.36)',
    iconColor: '#DBEAFE',
    iconFill: 'rgba(147,197,253,0.5)',
    accentColor: '#3B82F6',
    accentBg: 'rgba(59,130,246,0.18)',
    Icon: WavesHorizontal,
  },
  {
    emoji: '☁️',
    label: 'Neutral',
    desc: 'Just getting through the day.',
    iconBg: 'rgba(167,139,250,0.32)',
    iconColor: '#F5F3FF',
    iconFill: 'rgba(221,214,254,0.45)',
    accentColor: '#A78BFA',
    accentBg: 'rgba(167,139,250,0.18)',
    Icon: CloudMoon,
  },
  {
    emoji: '🌱',
    label: 'Hopeful',
    desc: 'A gentle optimism ahead.',
    iconBg: 'rgba(52,211,153,0.36)',
    iconColor: '#D1FAE5',
    iconFill: 'rgba(110,231,183,0.5)',
    accentColor: '#34D399',
    accentBg: 'rgba(52,211,153,0.18)',
    Icon: Sprout,
  },
  {
    emoji: '🌤️',
    label: 'Light',
    desc: 'Uplifted, brighter, or a little lighter.',
    iconBg: 'rgba(251,191,36,0.38)',
    iconColor: '#FEF9C3',
    iconFill: 'rgba(253,224,71,0.55)',
    accentColor: '#FBBF24',
    accentBg: 'rgba(251,191,36,0.2)',
    Icon: CloudSun,
  },
  {
    emoji: '🕊️',
    label: 'Peaceful',
    desc: 'Calm, grounded, and at ease.',
    iconBg: 'rgba(56,189,248,0.36)',
    iconColor: '#E0F2FE',
    iconFill: 'rgba(125,211,252,0.5)',
    accentColor: '#38BDF8',
    accentBg: 'rgba(56,189,248,0.18)',
    Icon: Bird,
  },
  {
    emoji: '💜',
    label: 'Grateful',
    desc: 'Noticing something good today.',
    iconBg: 'rgba(192,132,252,0.36)',
    iconColor: '#FAE8FF',
    iconFill: 'rgba(233,213,255,0.5)',
    accentColor: '#C084FC',
    accentBg: 'rgba(192,132,252,0.18)',
    Icon: Heart,
  },
  {
    emoji: '✨',
    label: 'Joyful',
    desc: 'Light-hearted, energized, and alive.',
    iconBg: 'rgba(251,146,60,0.38)',
    iconColor: '#FFEDD5',
    iconFill: 'rgba(253,186,116,0.55)',
    accentColor: '#FB923C',
    accentBg: 'rgba(251,146,60,0.2)',
    Icon: Sparkles,
  },
];
