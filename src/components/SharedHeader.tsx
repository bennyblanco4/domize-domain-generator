"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';

interface SharedHeaderProps {
  isStarShaking?: boolean;
}

export default function SharedHeader({ isStarShaking = false }: SharedHeaderProps) {
  const { favorites } = useFavorites();

  return (
    <header className="absolute top-0 left-0 right-0 z-10 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link href="/domain" className="flex items-center">
            <Image 
              src="/lightlogo.svg" 
              alt="Domize Logo" 
              width={24} 
              height={24}
              className="h-6 w-auto"
            />
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/favourites"
            className="relative p-2 rounded-md transition-colors bg-gray-200 hover:bg-gray-300 text-gray-800"
            aria-label="View favorites"
            title={`View favorite domains (${favorites.length})`}
          >
            <Star className={`w-5 h-5 ${favorites.length > 0 ? 'fill-yellow-400 text-yellow-400' : ''} ${isStarShaking ? 'animate-shake' : ''}`} />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-yellow-400 text-gray-900">
                {favorites.length > 9 ? '9+' : favorites.length}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

