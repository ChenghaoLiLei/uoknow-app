import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './theme';

type ColorSet = typeof lightColors;

const ThemeContext = createContext<ColorSet>(lightColors);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const themeColors = scheme === 'dark' ? darkColors : lightColors;
  return (
    <ThemeContext.Provider value={themeColors}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useColors(): ColorSet {
  return useContext(ThemeContext);
}
