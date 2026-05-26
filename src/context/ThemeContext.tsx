"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Set default theme to 'light'
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // This effect runs once on client-side to set the theme based on localStorage
  useEffect(() => {
    try {
      // Always use light mode - ignore localStorage
      setTheme('light');
      setIsLoaded(true);
    } catch {
      // Fallback silently if localStorage is not available
      setIsLoaded(true);
    }
  }, []);

  // Apply theme changes to DOM
  useEffect(() => {
    if (!isLoaded) return;
    
    const root = document.documentElement;
    
    // Apply theme classes - using dataset to avoid direct class manipulation
    // which can cause hydration errors
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    
    // Force Safari to repaint by toggling a harmless style property
    // This fixes the issue where Safari doesn't properly update styles on theme change
    if (typeof window !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      // Add transitioning class to disable transitions temporarily
      root.classList.add('transitioning');
      
      // Force a repaint
      root.style.display = 'none';
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      root.offsetHeight; // This line forces the browser to recalculate styles
      root.style.display = '';
      
      // Remove transitioning class after a brief delay
      setTimeout(() => {
        root.classList.remove('transitioning');
      }, 50);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Silently fail if localStorage is not available
    }
  }, [theme, isLoaded]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      isLoaded 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}; 