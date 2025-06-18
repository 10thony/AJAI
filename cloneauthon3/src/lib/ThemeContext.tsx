import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export interface CustomThemeColors {
  sidebar: {
    background: string;
    border: string;
    text: string;
    textSecondary: string;
    hover: string;
    active: string;
  };
  // Future expansion for other components
  chatBox?: {
    userBackground: string;
    userText: string;
    aiBackground: string;
    aiText: string;
  };
  // Add more component themes as needed
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  customColors: CustomThemeColors;
  updateCustomColors: (colors: Partial<CustomThemeColors>) => void;
  resetCustomColors: () => void;
}

const defaultCustomColors: CustomThemeColors = {
  sidebar: {
    background: 'bg-white dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    textSecondary: 'text-gray-500 dark:text-gray-400',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-700',
    active: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // If no saved theme, check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [customColors, setCustomColors] = useState<CustomThemeColors>(() => {
    const savedColors = localStorage.getItem('customThemeColors');
    if (savedColors) {
      try {
        return { ...defaultCustomColors, ...JSON.parse(savedColors) };
      } catch {
        return defaultCustomColors;
      }
    }
    return defaultCustomColors;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove both classes first
    root.classList.remove('light', 'dark');
    // Add the current theme class
    root.classList.add(theme);
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Save custom colors to localStorage
    localStorage.setItem('customThemeColors', JSON.stringify(customColors));
  }, [customColors]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const updateCustomColors = (colors: Partial<CustomThemeColors>) => {
    setCustomColors(prev => ({ ...prev, ...colors }));
  };

  const resetCustomColors = () => {
    setCustomColors(defaultCustomColors);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      customColors, 
      updateCustomColors, 
      resetCustomColors 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 