import React from 'react';
import { useTheme } from '../context/ThemeContext';

const FeatureBadges = () => {
  const { theme, isLoaded } = useTheme();
  
  // Use light theme as default until loaded to match SSR
  const effectiveTheme = isLoaded ? theme : 'light';
  
  const features = [
    {
      icon: '⚡',
      title: 'Instant Results',
      description: 'Fast domain generation and checking'
    },
    {
      icon: '🎯',
      title: 'Smart Suggestions',
      description: 'AI-powered domain recommendations'
    },
    {
      icon: '🚀',
      title: 'Live Availability',
      description: 'Instant availability checking'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 w-full max-w-4xl mx-auto">
      {features.map((feature, index) => (
        <div
          key={index}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-full text-sm transition-all duration-200 w-full h-12 min-w-0 ${
            effectiveTheme === 'light' 
              ? 'bg-white border-[0.5px] border-black hover:bg-white hover:border-black shadow-lg hover:shadow-xl' 
              : 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600/50'
          }`}
        >
          <span className="text-lg flex-shrink-0">{feature.icon}</span>
          <span className={`font-medium text-center truncate ${
            effectiveTheme === 'light' ? 'text-black' : 'text-slate-200'
          }`}>{feature.title}</span>
        </div>
      ))}
    </div>
  );
};

export default FeatureBadges; 