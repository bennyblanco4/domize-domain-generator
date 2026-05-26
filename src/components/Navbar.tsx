"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '../context/ThemeContext';

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { theme, isLoaded } = useTheme();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      // Only consider scrolled when we're more than 50px down the page
      const isScrolled = window.scrollY > 50;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  // Use light theme as default until loaded to match SSR
  const effectiveTheme = isLoaded ? theme : 'light';

  return (
    <motion.div 
      className={`w-full sticky top-0 z-40 transition-all duration-300 ${
        scrolled 
          ? `backdrop-blur-lg bg-background/80 shadow-lg border-b ${effectiveTheme === 'light' ? 'border-border/70' : 'border-border/50'}` 
          : `bg-background/5 backdrop-filter backdrop-blur-[2px] ${effectiveTheme === 'light' ? 'border-b border-border/50' : 'border-transparent'}`
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <div className="flex h-16 items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <Link href="/" className="flex items-center group">
                <Image 
                  src={effectiveTheme === 'light' ? "/lightlogo.svg" : "/logo.svg"} 
                  alt="DomainAI Logo" 
                  width={100} 
                  height={100} 
                  className="py-0"
                />
              </Link>
            </motion.div>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                href="/favourites" 
                className={`flex items-center space-x-1 text-sm font-medium group transition-colors ${
                  pathname === '/favourites'
                    ? 'text-yellow-400'
                    : `${effectiveTheme === 'light' ? 'text-black' : 'text-foreground/70'} hover:text-yellow-400`
                }`}
              >
                <Star size={16} className={pathname === '/favourites' ? 'fill-yellow-400' : 'group-hover:fill-yellow-400'} />
                <span>Favourites</span>
              </Link>
            </div>

            {/* Mobile navigation shortcuts */}
            <div className="flex md:hidden items-center space-x-2">
              <Link 
                href="/favourites" 
                className={`flex items-center space-x-1 p-2 rounded-full transition-colors ${
                  pathname === '/favourites'
                    ? 'text-yellow-400 bg-yellow-500/10'
                    : `${effectiveTheme === 'light' ? 'text-black' : 'text-foreground/70'} hover:text-yellow-400 hover:bg-background/10`
                }`}
                aria-label="Go to Favourites"
              >
                <Star size={24} className={pathname === '/favourites' ? 'fill-yellow-400' : 'hover:fill-yellow-400'} />
              </Link>
            </div>
          </div>
          
          {/* Remove mobile menu completely - no dropdown for mobile */}
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar; 