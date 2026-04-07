import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, Theme } from '../lib/theme';

interface ThemeContextValue {
  theme: Theme;
  themePref: string;
  setThemePref: (pref: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme, themePref: 'system', setThemePref: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePref, setThemePref] = useState<string>('system');

  const theme = (() => {
    if (themePref === 'light') return lightTheme;
    if (themePref === 'dark') return darkTheme;
    return systemScheme === 'dark' ? darkTheme : lightTheme;
  })();

  return (
    <ThemeContext.Provider value={{ theme, themePref, setThemePref }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
