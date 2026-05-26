import React from 'react';
import { Badge } from "@/components/ui/badge";
import { useTheme } from '../context/ThemeContext';

interface SelectedOptionsProps {
  selectedTLDs: string[];
  nameLength: [number, number];
  priceRange?: [number, number];
}

export function SelectedOptions({ selectedTLDs, nameLength, priceRange = [0, 100] }: SelectedOptionsProps) {
  const { theme } = useTheme();
  // Check if each option has non-default values
  const hasTLDSelection = selectedTLDs.length > 0;
  const hasCustomLength = nameLength[0] !== 2 || nameLength[1] !== 20;
  const hasCustomPrice = priceRange[0] !== 0 || priceRange[1] !== 100;
  
  // If all options are at default values, don't render anything
  if (!hasTLDSelection && !hasCustomLength && !hasCustomPrice) {
    return null;
  }
  
  return (
    <div className="flex-grow min-w-0">
      <div className="flex flex-wrap gap-2 justify-start">
        {/* Display selected TLDs only if specific ones are selected */}
        {hasTLDSelection && 
          selectedTLDs.map(tld => (
            <Badge 
              key={tld} 
              variant="secondary"
              className={`${
                theme === 'light'
                  ? 'bg-gray-50 text-black hover:bg-gray-100 border border-gray-200'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {tld}
            </Badge>
          ))
        }

        {/* Display length range only if not default */}
        {hasCustomLength && (
          <Badge 
            variant="secondary" 
            className={`${
              theme === 'light'
                ? 'bg-gray-50 text-black hover:bg-gray-100 border border-gray-200'
                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {nameLength[0] === nameLength[1] 
              ? `${nameLength[0]} characters` 
              : `${nameLength[0]}-${nameLength[1]} characters`}
          </Badge>
        )}

        {/* Display price range only if not default */}
        {hasCustomPrice && (
          <Badge 
            variant="secondary" 
            className={`${
              theme === 'light'
                ? 'bg-gray-50 text-black hover:bg-gray-100 border border-gray-200'
                : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {priceRange[1] === 100 
              ? `$${priceRange[0]}+` 
              : `$${priceRange[0]}-$${priceRange[1]}`}
          </Badge>
        )}
      </div>
    </div>
  );
} 