export interface ThemeColors {
  primary: string; primaryLight: string; primaryDark: string;
  gold: string; goldLight: string; liveRed: string;
  background: string; surface: string; surface2: string; surface3: string;
  text: string; textSecondary: string; textMuted: string; border: string;
  miniPlayerBg: string; tabBarBg: string; headerBg: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#047857', primaryLight: '#059669', primaryDark: '#064e3b',
    gold: '#d4a853', goldLight: '#e8c672', liveRed: '#ef4444',
    background: '#fafafa', surface: '#ffffff', surface2: '#f4f4f5', surface3: '#e4e4e7',
    text: '#18181b', textSecondary: '#52525b', textMuted: '#a1a1aa', border: '#e4e4e7',
    miniPlayerBg: '#ecfdf5', tabBarBg: '#ffffff', headerBg: '#047857',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#047857', primaryLight: '#059669', primaryDark: '#064e3b',
    gold: '#d4a853', goldLight: '#e8c672', liveRed: '#ef4444',
    background: '#09090b', surface: '#18181b', surface2: '#1f1f23', surface3: '#27272a',
    text: '#fafafa', textSecondary: '#a1a1aa', textMuted: '#71717a', border: '#27272a',
    miniPlayerBg: '#064e3b', tabBarBg: '#18181b', headerBg: '#064e3b',
  },
};
