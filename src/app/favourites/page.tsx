"use client";

import React, { useState, useEffect } from 'react';
import { useFavorites } from '../../context/FavoritesContext';
import { useTheme } from '../../context/ThemeContext';
import { Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import SharedHeader from '@/components/SharedHeader';
import SharedFooter from '@/components/SharedFooter';

const FavouritesPage: React.FC = () => {
  const { favorites, removeFavorite, isFavorite } = useFavorites();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const handleFavoriteToggle = (domain: string) => {
    if (isFavorite(domain)) {
      removeFavorite(domain);
    } 
    // In this context, clicking the star on the favourites page only removes it.
    // We don't need an addFavorite call here.
  };

  return (
    <div className={`relative min-h-screen flex flex-col ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-gray-50 text-gray-900'}`} style={{ fontFamily: "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif" }}>
      {/* Grainy Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0"
          style={{
            background: isDarkMode
              ? `
                radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.5) 0%, transparent 50%),
                radial-gradient(at 100% 0%, rgba(236, 72, 153, 0.4) 0%, transparent 50%),
                radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.3) 0%, transparent 50%),
                radial-gradient(at 0% 100%, rgba(168, 85, 247, 0.4) 0%, transparent 50%),
                linear-gradient(135deg, #1e293b 0%, #0f172a 100%)
              `
              : `
                radial-gradient(at 0% 0%, rgba(96, 165, 250, 0.5) 0%, transparent 50%),
                radial-gradient(at 100% 0%, rgba(244, 114, 182, 0.45) 0%, transparent 50%),
                radial-gradient(at 100% 100%, rgba(34, 211, 238, 0.4) 0%, transparent 50%),
                radial-gradient(at 0% 100%, rgba(168, 85, 247, 0.45) 0%, transparent 50%),
                linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)
              `
          }}
        />
        <div 
          className="absolute inset-0"
          style={{
            background: `url(/noise.svg)`,
            filter: 'contrast(170%) brightness(1000%)',
            opacity: 0.15,
            mixBlendMode: 'overlay'
          }}
        />
      </div>

      <SharedHeader />

      {/* Main Content */}
      <main className="relative container mx-auto px-4 pt-32 pb-16 flex flex-col items-center text-center flex-grow">
        <h1 className={`text-5xl md:text-7xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Your <span className="gradient-text">Favourite</span> Domains
        </h1>
        <p className={`text-xl md:text-2xl mb-12 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {favorites.length === 0 ? "You haven't favorited any domains yet" : `${favorites.length} saved domain${favorites.length !== 1 ? 's' : ''}`}
        </p>

        {favorites.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Go back to the{' '}
                <Link href="/domain" className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} underline`}>
                  domain generator
                </Link>
                {' '}to find some!
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8 w-full max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((domain) => {
                const namecheapUrl = `https://www.namecheap.com/domains/registration/results/?domain=${domain}`;
                const affiliateUrl = `https://namecheap.pxf.io/c/6101193/2176068/5618?url=${encodeURIComponent(namecheapUrl)}`;
                
                return (
                  <div
                    key={domain}
                    onClick={() => {
                      window.open(affiliateUrl, '_blank');
                    }}
                    className={`backdrop-blur-sm border rounded-lg p-6 flex justify-between items-center hover:scale-105 transition-all duration-300 cursor-pointer ${
                      isDarkMode 
                        ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/60 hover:border-slate-600' 
                        : 'bg-white/50 border-gray-300 hover:bg-white/70 hover:border-gray-400'
                    }`}
                    title={domain}
                  >
                    <h3 className={`text-2xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{domain}</h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeFavorite(domain);
                        }}
                        className={`text-yellow-400 hover:text-yellow-300 p-1 rounded-full transition-colors flex-shrink-0 z-10 ${
                          isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                        }`}
                        aria-label={`Remove ${domain} from favourites`}
                        title="Remove from Favourites"
                      >
                        <Star fill="currentColor" size={20} /> 
                      </button>
                      <div className={`hover:opacity-70 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        <ArrowRight className="text-xl" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <SharedFooter />
    </div>
  );
};

export default FavouritesPage; 