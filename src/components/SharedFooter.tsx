"use client";

import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function SharedFooter() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center">
          <div className={`flex items-center space-x-1 text-sm ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <span>© {currentYear} Domize.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
