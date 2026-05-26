'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type ApiToggleContextType = {
  isApiEnabled: boolean;
  toggleApi: () => void;
};

const ApiToggleContext = createContext<ApiToggleContextType | undefined>(undefined);

export function ApiToggleProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage if available, default to true
  const [isApiEnabled, setIsApiEnabled] = useState<boolean>(true);

  useEffect(() => {
    const stored = localStorage.getItem('isApiEnabled');
    if (stored !== null) {
      setIsApiEnabled(stored === 'true');
    }
  }, []);

  const toggleApi = () => {
    const newValue = !isApiEnabled;
    setIsApiEnabled(newValue);
    localStorage.setItem('isApiEnabled', String(newValue));
  };

  return (
    <ApiToggleContext.Provider value={{ isApiEnabled, toggleApi }}>
      {children}
    </ApiToggleContext.Provider>
  );
}

export function useApiToggle() {
  const context = useContext(ApiToggleContext);
  if (context === undefined) {
    throw new Error('useApiToggle must be used within an ApiToggleProvider');
  }
  return context;
} 