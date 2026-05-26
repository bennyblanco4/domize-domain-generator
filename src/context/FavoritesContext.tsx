"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface FavoritesContextProps {
  favorites: string[];
  addFavorite: (domain: string) => void;
  removeFavorite: (domain: string) => void;
  isFavorite: (domain: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextProps | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage on initial mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem('favoriteDomains');
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites));
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('favoriteDomains', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (domain: string) => {
    setFavorites((prevFavorites) => [...prevFavorites, domain]);
  };

  const removeFavorite = (domain: string) => {
    setFavorites((prevFavorites) => prevFavorites.filter((fav) => fav !== domain));
  };

  const isFavorite = (domain: string) => {
    return favorites.includes(domain);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}; 