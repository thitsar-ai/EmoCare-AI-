/**
 * EmoCare Design System — Tristar web / app parity
 * Single source of truth for UI colors; avoid hard-coded hex elsewhere.
 */

export const tokens = {
  bg: {
    /** Section canvas gradient — top (Sanctuary web parity). */
    canvasTop: '#F4ECFB',
    /** Section canvas gradient — bottom. */
    canvasBottom: '#E8DBF4',
    /** Primary canvas — flat fallback (gradient top). */
    canvas: '#F4ECFB',
    /** Frosted card surface — Join Waitlist / .sx-cta-card parity. */
    card: 'rgba(255, 253, 250, 0.72)',
    surface: 'rgba(255, 253, 250, 0.72)',
    elevated: '#F4ECFB',
    /** @deprecated Use elevated */
    surfaceHigh: '#F4ECFB',
  },
  glass: {
    waitlistTop: '#E1D9E8',
    waitlistBottom: '#D6CCDF',
    /** Frosted card fill — all app cards. */
    primary: 'rgba(255, 253, 250, 0.72)',
    lavender: 'rgba(255, 253, 250, 0.72)',
    elevated: 'rgba(255, 253, 250, 0.72)',
    /** Card rim — 1px solid white at 65% opacity. */
    cardBorder: 'rgba(255, 255, 255, 0.65)',
    border: 'rgba(255, 255, 255, 0.65)',
    shadow: 'rgba(61, 42, 107, 0.06)',
    radius: 24,
    blur: 12,
  },
  border: {
    standard: 'rgba(61, 42, 107, 0.08)',
    medium: 'rgba(61, 42, 107, 0.12)',
    strong: 'rgba(61, 42, 107, 0.16)',
    active: '#B5A3C5',
    subtle: 'rgba(61, 42, 107, 0.06)',
  },
  surface: {
    /** Light wash on canvas — chips, pills, hover. */
    tint: 'rgba(61, 42, 107, 0.04)',
    /** Selected card / mode background. */
    selected: 'rgba(195, 181, 209, 0.45)',
    /** Menu row press, subtle feedback. */
    pressed: 'rgba(61, 42, 107, 0.06)',
    /** Inputs and inset fields on cards. */
    inset: '#E1D9E8',
    /** Frosted overlay — same as card surface. */
    frosted: 'rgba(255, 253, 250, 0.72)',
    /** Chat / bubble fill — frosted card. */
    bubble: 'rgba(255, 253, 250, 0.72)',
  },
  text: {
    /** Primary headings — deep lavender. */
    primary: '#3D2A6B',
    /** Secondary page / section headings. */
    section: '#2E1F4F',
    /** Body copy. */
    body: '#4A3B6B',
    /** Labels, eyebrows, captions, placeholders. */
    secondary: '#5E4F7A',
    disabled: '#7A6A9A',
    /** Labels on primary CTA buttons. */
    onCta: '#FFFFFF',
    /** Disabled primary CTA labels. */
    onCtaDisabled: '#A798C3',
  },
  brand: {
    accent: '#3D2A6B',
    gradStart: '#E1D9E8',
    gradMid: '#D6CCDF',
    gradMid2: '#C3B5D1',
    gradEnd: '#B5A3C5',
    /** Primary CTA fill — signature purple. */
    ctaStart: '#8B6BD9',
    ctaEnd: '#8B6BD9',
    /** Primary CTA hover (web). */
    ctaHover: '#7A59CF',
    /** Primary CTA pressed. */
    ctaPressed: '#6C4BC4',
    /** Primary CTA disabled fill. */
    ctaDisabled: '#D8D0E7',
  },
  emo: {
    outerGlow: '#FDF5FF',
    orbLavender: '#D7B5FF',
    orbMid: '#C49CFF',
    orbShadow: '#AF83F6',
    innerGlow: '#FFF5E9',
    cheeks: '#F7A9C7',
    leaves: '#F5E9D8',
    leafGlow: '#FFF9F1',
  },
  oracle: {
    accent: '#12D4CB',
    accentSecondary: '#6AF0E8',
  },
  gold: {
    accent: '#D9BE87',
    glow: '#F6E8C1',
  },
  splash: {
    /** Loading bar track on launch — darker than border.standard for contrast on lavender. */
    barTrack: 'rgba(61, 42, 107, 0.32)',
    /** Loading bar fill — signature CTA purple. */
    barFill: '#7A59CF',
  },
  shadow: {
    card: 'rgba(61, 42, 107, 0.06)',
    floating: 'rgba(61, 42, 107, 0.10)',
  },
  mood: {
    heavy: '#A77BFF',
    overwhelmed: '#75A8FF',
    neutral: '#B9A7E8',
    hopeful: '#69D98D',
    light: '#F7C75A',
    peaceful: '#6BB7FF',
    grateful: '#B584FF',
    joyful: '#FFB174',
  },
  voice: {
    bg1: '#F4ECFB',
    bg2: '#E8DBF4',
    bg3: '#F4ECFB',
  },
  typography: {
    /** Nav bar page title — Breathe, Settings, Check In, etc. */
    navTitle: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '600' as const,
    },
    /** Primary page headline below nav — Journal, Insights, Memory Ledger. */
    pageTitle: {
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '400' as const,
    },
    /** Custom nav center titles — Oracle, Talk brand row. */
    navTitleLarge: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '400' as const,
    },
  },
} as const;

/** Sanctuary section background — linear-gradient(180deg, #F4ECFB → #E8DBF4). */
export const SANCTUARY_CANVAS_GRADIENT: readonly [string, string] = [
  tokens.bg.canvasTop,
  tokens.bg.canvasBottom,
];

/** Signature CTA gradient — Save Check-In, Start Conversation, active states. */
export const BRAND_CTA_GRADIENT: readonly [string, string] = [
  tokens.brand.ctaStart,
  tokens.brand.ctaEnd,
];

/** User chat bubbles on Talk — vibrant purple → violet → warm coral. */
export const CHAT_USER_BUBBLE_GRADIENT: readonly [string, string, string, string] = [
  '#7A59CF',
  '#8B6BD9',
  '#B584FF',
  '#F0A896',
];

/** Light decorative gradient — cards, chips (not primary buttons). */
export const BRAND_GRADIENT: readonly [string, string] = [
  tokens.brand.gradStart,
  tokens.brand.gradEnd,
];

/** Full four-stop brand gradient (web parity). */
export const BRAND_GRADIENT_4: readonly [string, string, string, string] = [
  tokens.brand.gradStart,
  tokens.brand.gradMid,
  tokens.brand.gradMid2,
  tokens.brand.gradEnd,
];

/** @deprecated Three-stop gradient kept for callers expecting a tuple of 3. */
export const BRAND_GRADIENT_3: readonly [string, string, string] = [
  tokens.brand.gradStart,
  tokens.brand.gradMid2,
  tokens.brand.gradEnd,
];

export const BRAND_GRADIENT_DISABLED: readonly [string, string] = [
  tokens.brand.ctaDisabled,
  tokens.brand.ctaDisabled,
];

/** Elevated overlay sheets (menus, modals). */
export const menuSurface = {
  solid: tokens.bg.canvas,
  text: tokens.text.primary,
  secondaryText: tokens.text.body,
  mutedText: tokens.text.secondary,
  card: tokens.bg.card,
  border: tokens.border.standard,
  headerBorder: tokens.border.subtle,
} as const;

/** @deprecated Use menuSurface — kept for gradual import migration. */
export const DARK_MENU_SURFACE = menuSurface;

export const MENU_SOLID = menuSurface.solid;

export const SANCTUARY_SPLASH: readonly [string, string] = SANCTUARY_CANVAS_GRADIENT;

export const BREATHE_CANVAS = tokens.bg.canvasTop;
export const BREATHE_SURFACE_GRADIENT: readonly [string, string] = SANCTUARY_CANVAS_GRADIENT;

export const SANCTUARY_TALK_GRADIENT = BRAND_GRADIENT;

export function moodTokenForLabel(label: string): string {
  const key = label.toLowerCase() as keyof typeof tokens.mood;
  return tokens.mood[key] ?? tokens.mood.neutral;
}

export function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
