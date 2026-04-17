export interface ThemeColors {
  // Brand
  primary: string;        // Deep forest green
  primaryLight: string;
  primaryDark: string;
  accent: string;         // Warm gold
  accentLight: string;
  liveRed: string;        // Muted sacred red

  // Surfaces
  background: string;     // Warm paper cream (light) / deep ink (dark)
  surface: string;
  surface2: string;
  surface3: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;

  // Component-specific
  miniPlayerBg: string;
  tabBarBg: string;
  headerBg: string;

  // Decorative
  hairline: string;       // Subtle divider
  parchment: string;      // Warm surface alt

  // Legacy alias (kept for backwards compat — same as accent)
  gold: string;
  goldLight: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

// Direction C: Calm Architecture
// Deep forest green paired with warm cream paper and gold.
// Geometric, still, intentional — inspired by a prayer room.

export const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#0f2e24',
    primaryLight: '#1a4638',
    primaryDark: '#081a15',
    accent: '#d4a853',
    accentLight: '#e8c672',
    liveRed: '#c23e3e',

    background: '#f7f5f0',   // Warm paper cream
    surface: '#ffffff',
    surface2: '#f1ede5',
    surface3: '#e6dfd1',

    text: '#0f2e24',          // Text is the brand forest green
    textSecondary: '#4a5f58',
    textMuted: '#8a7d66',     // Warm muted brass
    border: 'rgba(15, 46, 36, 0.1)',

    miniPlayerBg: '#0f2e24',  // Dark accent player on light bg
    tabBarBg: '#ffffff',
    headerBg: '#0f2e24',

    hairline: 'rgba(15, 46, 36, 0.08)',
    parchment: '#f1ede5',

    gold: '#d4a853',
    goldLight: '#e8c672',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#d4a853',        // Gold leads in dark mode
    primaryLight: '#e8c672',
    primaryDark: '#a8852e',
    accent: '#d4a853',
    accentLight: '#e8c672',
    liveRed: '#d65050',

    background: '#081a15',     // Deep forest ink
    surface: '#0f2e24',
    surface2: '#143830',
    surface3: '#1a4638',

    text: '#f7f5f0',
    textSecondary: '#c9c0ac',
    textMuted: '#8a7d66',
    border: 'rgba(247, 245, 240, 0.1)',

    miniPlayerBg: '#1a4638',
    tabBarBg: '#0f2e24',
    headerBg: '#081a15',

    hairline: 'rgba(247, 245, 240, 0.08)',
    parchment: '#143830',

    gold: '#d4a853',
    goldLight: '#e8c672',
  },
};
