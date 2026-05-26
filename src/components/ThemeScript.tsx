"use client";

import { useEffect } from 'react';

export default function ThemeScript() {
  useEffect(() => {
    // This runs only on the client, after hydration
    try {
      const theme = localStorage.getItem('theme');
      if (!theme || theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    } catch {
      // Fallback to dark theme if localStorage is not available
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.style.colorScheme = 'dark';
    }
  }, []);
  
  return null;
} 