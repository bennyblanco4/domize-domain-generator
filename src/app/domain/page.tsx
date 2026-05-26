  "use client";

import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Settings, ArrowUp, Square, Moon, Sun, Plus, Check, Star, X, Copy, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useFavorites } from '@/context/FavoritesContext';
import { useTheme } from '@/context/ThemeContext';
import { Turnstile } from '@marsidev/react-turnstile';
import SharedHeader from '@/components/SharedHeader';
import SharedFooter from '@/components/SharedFooter';
import { isValidTLD, formatTLD } from '@/utils/tldValidator';

type DomainSuggestion = {
  name: string;
  available: boolean;
  loading: boolean;
  error?: string | null;
  priceLoaded?: boolean;
  hasPriceError?: boolean;
};

const placeholderExamples = [
  'AI chatbot for customer support',
  'SaaS platform for project management',
  'E-commerce store for handmade crafts',
  'Social network for developers',
  'Fitness app with AI coaching',
  'Online learning platform',
  'Cryptocurrency trading dashboard',
  'Food delivery service app',
  'Real estate marketplace',
  'Music streaming platform',
  'Travel booking website',
  'Healthcare telemedicine app'
];

const dotsPattern = ['.', '..', '...', '..', '.'];

export default function DomainGenerator() {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<DomainSuggestion[]>([]);
  const [streamingDomains, setStreamingDomains] = useState<DomainSuggestion[]>([]);
  const [currentStatus, setCurrentStatus] = useState<{message: string, domain: string, status: string} | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [advancedAnimating, setAdvancedAnimating] = useState(false);
  const [length, setLength] = useState(30);
  const [selectedTlds, setSelectedTlds] = useState<string[]>([]);
  const [customTld, setCustomTld] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTlds, setCustomTlds] = useState<string[]>([]);
  const [tldError, setTldError] = useState<string>('');
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isStarShaking, setIsStarShaking] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [showTurnstile, setShowTurnstile] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Check if we're on localhost to bypass Cloudflare
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.')
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const turnstileRef = useRef<any>(null);
  const placeholderIndexRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dotsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const charIndexRef = useRef(0);
  const isDeletingRef = useRef(false);
  const dotsIndexRef = useRef(0);
  const customTldInputRef = useRef<HTMLInputElement | null>(null);
  
  const baseTldOptions = ['.com', '.io', '.ai', '.app', '.dev', '.tech', '.co', '.me', '.net', '.org'];
  const tldOptions = [...baseTldOptions, ...customTlds];

  // Animated placeholder typing effect
  useEffect(() => {
    if (description.trim() !== '' || isGenerating || hasInteracted) {
      // Don't animate if user is typing, generating, or has interacted with input
      setAnimatedPlaceholder('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (dotsTimeoutRef.current) {
        clearTimeout(dotsTimeoutRef.current);
        dotsTimeoutRef.current = null;
      }
      return;
    }

    const animateDots = () => {
      const currentExample = placeholderExamples[placeholderIndexRef.current];
      const dots = dotsPattern[dotsIndexRef.current];
      const baseText = currentExample.substring(0, charIndexRef.current);
      setAnimatedPlaceholder(baseText + dots);
      
      dotsIndexRef.current = (dotsIndexRef.current + 1) % dotsPattern.length;
      dotsTimeoutRef.current = setTimeout(animateDots, 300);
    };

    const type = () => {
      const currentExample = placeholderExamples[placeholderIndexRef.current];
      const charIndex = charIndexRef.current;
      const isDeleting = isDeletingRef.current;

      if (!isDeleting && charIndex < currentExample.length) {
        // Typing - no dots during initial typing
        charIndexRef.current++;
        const currentText = currentExample.substring(0, charIndexRef.current);
        setAnimatedPlaceholder(currentText);
        typingTimeoutRef.current = setTimeout(type, 50);
      } else if (!isDeleting && charIndex === currentExample.length) {
        // Finished typing, start dots animation and wait
        if (dotsTimeoutRef.current) {
          clearTimeout(dotsTimeoutRef.current);
        }
        animateDots();
        isDeletingRef.current = true;
        typingTimeoutRef.current = setTimeout(() => {
          if (dotsTimeoutRef.current) {
            clearTimeout(dotsTimeoutRef.current);
            dotsTimeoutRef.current = null;
          }
          type();
        }, 2000);
      } else if (isDeleting && charIndex > 0) {
        // Deleting - no dots while deleting
        charIndexRef.current--;
        const currentText = currentExample.substring(0, charIndexRef.current);
        setAnimatedPlaceholder(currentText);
        typingTimeoutRef.current = setTimeout(type, 30);
      } else if (isDeleting && charIndex === 0) {
        // Finished deleting, move to next example
        isDeletingRef.current = false;
        placeholderIndexRef.current = (placeholderIndexRef.current + 1) % placeholderExamples.length;
        dotsIndexRef.current = 0;
        typingTimeoutRef.current = setTimeout(type, 500);
      }
    };

    // Start the animation
    typingTimeoutRef.current = setTimeout(type, 500);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (dotsTimeoutRef.current) {
        clearTimeout(dotsTimeoutRef.current);
        dotsTimeoutRef.current = null;
      }
    };
  }, [description, isGenerating, hasInteracted]);

  const handleTldToggle = (tld: string) => {
    setSelectedTlds(prev => 
      prev.includes(tld) 
        ? prev.filter(t => t !== tld)
        : [...prev, tld]
    );
  };

  const handleAddCustomTld = () => {
    // If input is empty, just close the input box
    if (!customTld.trim()) {
      setCustomTld('');
      setTldError('');
      setShowCustomInput(false);
      // Reset input width
      if (customTldInputRef.current) {
        customTldInputRef.current.style.width = '80px';
      }
      return;
    }
    
    // Validate the TLD
    if (!isValidTLD(customTld.trim())) {
      setTldError('Invalid TLD. Please enter a valid domain extension.');
      return;
    }
    
    const newTld = formatTLD(customTld.trim());
    
    // Check if TLD already exists in the list
    if (customTlds.includes(newTld) || baseTldOptions.includes(newTld)) {
      setTldError('This TLD is already in your list.');
      return;
    }
    
    // Clear any previous errors
    setTldError('');
    
    // Add to custom TLDs list if not already exists
    if (!customTlds.includes(newTld) && !baseTldOptions.includes(newTld)) {
      setCustomTlds(prev => [...prev, newTld]);
    }
    
    // Add to selected TLDs if not already selected
    if (!selectedTlds.includes(newTld)) {
      setSelectedTlds(prev => [...prev, newTld]);
    }
    
    setCustomTld('');
    setShowCustomInput(false);
    // Reset input width
    if (customTldInputRef.current) {
      customTldInputRef.current.style.width = '80px';
    }
  };

  const handleCustomTldKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCustomTld();
    } else if (e.key === 'Escape') {
      setCustomTld('');
      setTldError('');
      setShowCustomInput(false);
    }
  };

  // Reset input width when input is shown/hidden
  useEffect(() => {
    if (showCustomInput && customTldInputRef.current) {
      const input = customTldInputRef.current;
      input.style.width = '80px';
    } else if (!showCustomInput && customTldInputRef.current) {
      // Reset width when hidden
      customTldInputRef.current.style.width = '80px';
    }
  }, [showCustomInput]);

  const handleCustomTldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomTld(value);
    // Clear error when user starts typing
    if (tldError) {
      setTldError('');
    }
    // Dynamically adjust input width based on content
    if (customTldInputRef.current) {
      const input = customTldInputRef.current;
      // Temporarily set to auto to measure content
      input.style.width = 'auto';
      const scrollWidth = input.scrollWidth;
      // Set width with padding for checkmark button (pr-10 = 2.5rem = 40px)
      const newWidth = Math.min(Math.max(80, scrollWidth + 50), 200);
      input.style.width = `${newWidth}px`;
    }
  };


  const handleStopGeneration = async () => {
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
        readerRef.current = null;
      } catch (error) {
        console.error('Error stopping generation:', error);
      }
    }
    setIsGenerating(false);
    setCurrentStatus(null);
  };

  const handleCopyAllDomains = async () => {
    const allDomains = suggestions.map(s => s.name).join('\n');
    try {
      await navigator.clipboard.writeText(allDomains);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy domains:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = allDomains;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Clear existing suggestions to show we're generating new ones
    setSuggestions([]);
    setStreamingDomains([]);
    
    // Bypass Turnstile on localhost
    if (isLocalhost) {
      // Directly call handleGenerate without Turnstile
      await handleGenerate(null);
      setIsRefreshing(false);
    } else {
      // Reset Turnstile token to get a new one for the refresh
      setTurnstileToken(null);
      // Show Turnstile again for the refresh
      setShowTurnstile(true);
      // The handleGenerate will be called after Turnstile verification
      setIsRefreshing(false);
    }
  };

  const handleGenerate = async (providedToken?: string | null) => {
    console.log('handleGenerate called', { description: description.trim(), providedToken });
    
    if (!description.trim()) {
      console.log('No description, returning');
      return;
    }
    
    const token = providedToken !== undefined ? providedToken : turnstileToken;
    console.log('Token check:', { token, turnstileToken, providedToken, isLocalhost });
    
    // Bypass Turnstile on localhost
    if (isLocalhost) {
      console.log('Localhost detected, bypassing Turnstile');
      // Continue with generation without token
    } else {
      // Show Turnstile if not already verified (production only)
      if (!token) {
        console.log('No token, showing Turnstile');
        setShowTurnstile(true);
        return;
      }
    }
    
    console.log('Starting generation...');
    
    if (advanced) {
      setAdvanced(false);
    }
    setIsGenerating(true);
    setSuggestions([]);
    setStreamingDomains([]);
    setCurrentStatus(null);

    try {
      console.log('Making fetch request...');
      const response = await fetch('/api/domains/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description,
            tlds: selectedTlds,
            maxLength: length,
            turnstileToken: isLocalhost ? 'localhost-bypass' : token,
            seed: Date.now() // Add timestamp seed to ensure different results on refresh
          })
      });

      console.log('Response received:', { ok: response.ok, status: response.status, statusText: response.statusText });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to start domain generation: ${response.status} ${response.statusText}`);
      }

      // Check if ReadableStream is supported (iOS Safari might have issues)
      if (!response.body || typeof response.body.getReader !== 'function') {
        console.error('ReadableStream not supported, trying fallback');
        // Fallback: try to read as text
        const text = await response.text();
        console.log('Fallback response text:', text);
        try {
          const data = JSON.parse(text);
          if (data.domains) {
            const mapped: DomainSuggestion[] = data.domains.map((d: { name: string; available?: boolean; price?: number }) => ({
              name: d.name,
              available: d.available ?? true,
              loading: false,
              priceLoaded: !!d.price,
              hasPriceError: false
            }));
            setSuggestions(mapped);
            setIsGenerating(false);
            return;
          }
        } catch (parseError) {
          console.error('Error parsing fallback response:', parseError);
          throw new Error('Failed to parse response');
        }
        throw new Error('No response body or ReadableStream not supported');
      }

      const reader = response.body.getReader();
      if (!reader) {
        console.error('No reader available');
        throw new Error('No response body or ReadableStream not supported');
      }
      
      console.log('Reader obtained, starting to read stream...');

      // Store reader reference for stopping
      readerRef.current = reader;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'status') {
                // Update current status
                setCurrentStatus({
                  message: data.message,
                  domain: data.domain,
                  status: data.status
                });
              } else if (data.type === 'domain') {
                // Add domain immediately as it becomes available
                const domainSuggestion: DomainSuggestion = {
                  name: data.domain.name,
                  available: data.domain.available,
                  loading: false,
                  priceLoaded: !!data.domain.price,
                  hasPriceError: false
                };
                
                setStreamingDomains(prev => [...prev, domainSuggestion]);
              } else if (data.type === 'complete') {
                // Set final suggestions
                const mapped: DomainSuggestion[] = (data.domains || []).map((d: { name: string; available?: boolean; price?: number }) => ({
                  name: d.name,
                  available: d.available ?? true,
                  loading: false,
                  priceLoaded: !!d.price,
                  hasPriceError: false
                }));
                setSuggestions(mapped);
              } else if (data.type === 'error') {
                console.error('Streaming error:', data.message);
                setSuggestions([]);
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in domain generation:', error);
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Full error details:', error);
      alert(`Failed to generate domains: ${errorMessage}. Please check the console for details.`);
      setSuggestions([]);
      setIsGenerating(false);
    } finally {
      readerRef.current = null;
      setIsGenerating(false);
      setIsRefreshing(false);
      // Reset Turnstile after generation completes
      setShowTurnstile(false);
      if (turnstileRef.current) {
        turnstileRef.current.reset();
        setTurnstileToken(null);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
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
                radial-gradient(at 0% 0%, rgba(14, 165, 233, 0.5) 0%, transparent 50%),
                radial-gradient(at 100% 0%, rgba(236, 72, 153, 0.4) 0%, transparent 50%),
                radial-gradient(at 100% 100%, rgba(6, 182, 212, 0.3) 0%, transparent 50%),
                radial-gradient(at 0% 100%, rgba(56, 189, 248, 0.4) 0%, transparent 50%),
                linear-gradient(135deg, #1e293b 0%, #0f172a 100%)
              `
              : `
                radial-gradient(at 0% 0%, rgba(14, 165, 233, 0.5) 0%, transparent 50%),
                radial-gradient(at 100% 0%, rgba(244, 114, 182, 0.45) 0%, transparent 50%),
                radial-gradient(at 100% 100%, rgba(34, 211, 238, 0.4) 0%, transparent 50%),
                radial-gradient(at 0% 100%, rgba(56, 189, 248, 0.45) 0%, transparent 50%),
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

      <SharedHeader isStarShaking={isStarShaking} />

      {/* Main Content */}
      <main className="relative container mx-auto px-4 pt-24 md:pt-32 pb-16 flex flex-col items-center text-center flex-grow">
        <h1 className={`text-4xl md:text-7xl font-bold mb-3 md:mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Find Your Perfect <span className="gradient-text">Domain.</span>
        </h1>
        <p className={`text-lg md:text-2xl mb-8 md:mb-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Generate catchy 
          <span> domain names</span> with AI.
        </p>

        {/* Search Form */}
        <div className="mt-6 md:mt-12 w-full max-w-2xl relative group">
          {/* Gradient Border Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-sky-400 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          
          {/* Input Container */}
          <div className={`relative backdrop-blur-md rounded-2xl shadow-xl border ${
            isDarkMode 
              ? 'bg-slate-800/80 border-slate-700' 
              : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center p-2">
              <input 
                className={`flex-grow bg-transparent border-none text-lg px-4 py-3 focus:ring-0 focus:outline-none w-full ${
                  isDarkMode 
                    ? 'text-slate-100 placeholder-slate-500' 
                    : 'text-slate-800 placeholder-slate-400'
                }`}
                placeholder={animatedPlaceholder}
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setHasInteracted(true)}
                onClick={() => setHasInteracted(true)}
              />
              <div className="flex items-center gap-2 pr-2">
                {description.trim() && (
                  <button
                    onClick={() => setDescription('')}
                    disabled={isGenerating}
                    className={`p-1.5 rounded-lg transition ${
                      isGenerating
                        ? 'text-slate-500 cursor-not-allowed opacity-50'
                        : isDarkMode 
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' 
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                    aria-label="Clear input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setAdvancedAnimating(true);
                    setAdvanced(!advanced);
                    // Wait for animation to complete (300ms matches the transition duration)
                    setTimeout(() => {
                      setAdvancedAnimating(false);
                    }, 300);
                  }}
                  disabled={isGenerating}
                  className={`p-2 transition rounded-lg ${
                    isGenerating
                      ? 'text-slate-500 cursor-not-allowed opacity-50'
                      : isDarkMode 
                        ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Settings className={`text-xl transition-transform ${advanced ? 'rotate-180' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Generate button clicked', { isGenerating, description: description.trim() });
                    if (isGenerating) {
                      handleStopGeneration();
                    } else {
                      handleGenerate();
                    }
                  }}
                  disabled={!description.trim() && !isGenerating}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition ${
                    isGenerating 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : isDarkMode
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isGenerating ? (
                    <Square className="text-xl" />
                  ) : (
                    <ArrowUp className="text-xl" />
                  )}
                </button>
              </div>
            </div>

            {/* Advanced Options */}
            <div className={`border-t transition-all duration-300 ease-in-out overflow-hidden ${
              advanced 
                ? 'max-h-[500px] opacity-100 p-4' 
                : 'max-h-0 opacity-0 p-0'
            } ${
              isDarkMode ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`md:pr-6 md:border-r ${
                  isDarkMode ? 'md:border-slate-700' : 'md:border-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <label className={`block text-sm font-semibold text-left ${
                      isDarkMode ? 'text-slate-200' : 'text-slate-700'
                    }`} htmlFor="tlds">TLDs</label>
                    {selectedTlds.length === 0 && (
                      <p className={`text-sm ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        All TLDs will be considered
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tldOptions.map((tld) => (
                      <button
                        key={tld}
                        onClick={() => handleTldToggle(tld)}
                        className={`text-sm font-medium px-4 py-2.5 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          selectedTlds.includes(tld)
                            ? isDarkMode
                              ? 'bg-sky-300 text-slate-900 border-sky-200 shadow-md focus:ring-sky-100'
                              : 'bg-sky-300 text-slate-900 border-sky-200 shadow-md focus:ring-sky-100'
                            : isDarkMode
                              ? 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700 hover:border-slate-500 hover:text-slate-200 focus:ring-slate-500'
                              : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 hover:border-slate-400 hover:text-slate-800 focus:ring-slate-400'
                        }`}
                      >
                        {tld}
                      </button>
                    ))}
                    {!showCustomInput ? (
                      <button
                        onClick={() => setShowCustomInput(true)}
                        className={`text-sm font-medium px-2.5 py-2.5 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center ${
                          isDarkMode
                            ? 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700 hover:border-slate-500 hover:text-slate-200 focus:ring-slate-500'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 hover:border-slate-400 hover:text-slate-800 focus:ring-slate-400'
                        }`}
                        aria-label="Add custom TLD"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="relative inline-flex items-center">
                        <input
                          ref={customTldInputRef}
                          type="text"
                          value={customTld}
                          onChange={handleCustomTldChange}
                          onKeyPress={handleCustomTldKeyPress}
                          placeholder="e.g. .xyz"
                          autoFocus
                          className={`text-sm px-3 py-2.5 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
                            tldError
                              ? isDarkMode
                                ? 'bg-red-900/20 text-slate-200 placeholder-slate-500 border-red-500 focus:border-red-400 focus:ring-red-400'
                                : 'bg-red-50 text-slate-800 placeholder-slate-400 border-red-400 focus:border-red-300 focus:ring-red-300'
                              : isDarkMode
                                ? 'bg-slate-700/50 text-slate-200 placeholder-slate-500 border-slate-600 focus:border-sky-400 focus:ring-sky-400'
                                : 'bg-slate-50 text-slate-800 placeholder-slate-400 border-slate-300 focus:border-sky-300 focus:ring-sky-300'
                          }`}
                          style={{ width: '80px', minWidth: '80px', maxWidth: '200px' }}
                        />
                        <button
                          onClick={handleAddCustomTld}
                          className={`absolute right-2 p-1.5 rounded-md focus:outline-none transition-all hover:scale-110 ${
                            isDarkMode
                              ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          aria-label="Add TLD"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Error message for invalid TLD */}
                  {tldError && (
                    <div className={`mt-2 text-xs ${
                      isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {tldError}
                    </div>
                  )}
                </div>
                <div className="md:pl-6">
                  <label className={`block text-sm font-semibold text-left mb-3 ${
                    isDarkMode ? 'text-slate-200' : 'text-slate-700'
                  }`} htmlFor="length">Domain Length</label>
                  <div>
                    <input 
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      id="length" 
                      max="30" 
                      min="5" 
                      style={{
                        '--thumb-color': '#7DD3FC',
                        accentColor: '#7DD3FC',
                        background: isDarkMode 
                          ? 'linear-gradient(to right, #7DD3FC 0%, #7DD3FC ' + ((length - 5) / 25 * 100) + '%, #475569 ' + ((length - 5) / 25 * 100) + '%, #475569 100%)'
                          : 'linear-gradient(to right, #7DD3FC 0%, #7DD3FC ' + ((length - 5) / 25 * 100) + '%, #CBD5E1 ' + ((length - 5) / 25 * 100) + '%, #CBD5E1 100%)'
                      } as React.CSSProperties}
                      type="range" 
                      value={length}
                      onChange={(e) => setLength(Number(e.target.value))}
                    />
                    <div className={`text-sm font-medium text-center mt-2 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {length === 30 ? 'Any length' : `Up to ${length} characters`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>

        {/* Selected Settings Chips - Only show if not in default state (no TLDs selected and length at 30) and advanced settings is fully closed */}
        {!advanced && !advancedAnimating && !(selectedTlds.length === 0 && length === 30) && (
          <div className="mt-3 w-full max-w-2xl flex flex-wrap items-center gap-2 justify-start">
            {selectedTlds.length > 0 ? (
              selectedTlds.map((tld) => (
                <div
                  key={tld}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
                    isDarkMode
                      ? 'bg-blue-400/20 text-blue-300 border-blue-400/30'
                      : 'bg-blue-400/20 text-blue-600 border-blue-400/40'
                  }`}
                >
                  {tld}
                </div>
              ))
            ) : (
              <div className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
                isDarkMode
                  ? 'bg-blue-400/20 text-blue-300 border-blue-400/30'
                  : 'bg-blue-400/20 text-blue-600 border-blue-400/40'
              }`}>
                All TLD's
              </div>
            )}
            {length === 30 ? (
              <div className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
                isDarkMode
                  ? 'bg-blue-400/20 text-blue-300 border-blue-400/30'
                  : 'bg-blue-400/20 text-blue-600 border-blue-400/40'
              }`}>
                any length
              </div>
            ) : (
              <div className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${
                isDarkMode
                  ? 'bg-blue-400/20 text-blue-300 border-blue-400/30'
                  : 'bg-blue-400/20 text-blue-600 border-blue-400/40'
              }`}>
                Up to {length} chars
              </div>
            )}
          </div>
        )}

        {/* Cloudflare Turnstile - Only show when user clicks generate and not on localhost */}
        {showTurnstile && !isLocalhost && (
          <div className="mt-6 flex justify-center">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAACKOGxy673vyTr6T'}
              onSuccess={(token) => {
                console.log('Turnstile success callback fired:', token);
                if (!token) {
                  console.error('Turnstile returned empty token');
                  return;
                }
                setTurnstileToken(token);
                // Hide widget immediately after success
                setShowTurnstile(false);
                // Automatically trigger generation after successful verification
                // Use requestAnimationFrame for better iOS compatibility
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    console.log('Calling handleGenerate with token:', token);
                    handleGenerate(token);
                  }, 200);
                });
              }}
              onError={(error) => {
                console.error('Turnstile error:', error);
                alert('Verification failed. Please try again.');
                setTurnstileToken(null);
              }}
              onExpire={() => {
                console.log('Turnstile expired');
                setTurnstileToken(null);
                setShowTurnstile(false);
              }}
              ref={turnstileRef}
              options={{
                theme: isDarkMode ? 'dark' : 'light',
                size: 'normal',
              }}
            />
          </div>
        )}

        {/* Status Display */}
        {isGenerating && currentStatus && (
          <div className="mt-6 w-full max-w-3xl">
            <div className={`backdrop-blur-sm border rounded-lg p-4 ${
              isDarkMode 
                ? 'bg-slate-800/30 border-slate-600' 
                : 'bg-white/30 border-gray-300'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`animate-spin rounded-full h-4 w-4 border-2 border-t-transparent ${
                  isDarkMode ? 'border-white' : 'border-gray-900'
                }`}></div>
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {currentStatus.message}
                </span>
                {currentStatus.status === 'available' && (
                  <span className="text-green-400 text-sm font-medium">✓</span>
                )}
                {currentStatus.status === 'unavailable' && (
                  <span className="text-red-400 text-sm font-medium">✗</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Domain Suggestions - Show streaming domains during generation or final suggestions */}
        {(streamingDomains.length > 0 || suggestions.length > 0) && (
          <div className="mt-8 w-full max-w-7xl">
            {/* Copy and Refresh buttons - Only show when generation is complete */}
            {!isGenerating && suggestions.length > 0 && (
              <div className="mb-6 flex justify-end gap-3">
                <button
                  onClick={handleCopyAllDomains}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${
                    isDarkMode
                      ? isCopied
                        ? 'bg-green-600/50 text-green-200 border-green-500'
                        : 'bg-slate-800/50 text-slate-200 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                      : isCopied
                        ? 'bg-green-500/50 text-green-700 border-green-400'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                  aria-label="Copy all domains"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm font-medium">Copy All</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleRefresh}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-slate-800/50 text-slate-200 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                  aria-label="Generate new domains"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">Regenerate</span>
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Show streaming domains during generation */}
              {isGenerating && streamingDomains.map((suggestion, index) => (
                <div 
                  key={`streaming-${index}`}
                  onClick={() => {
                    window.open(`https://www.namecheap.com/domains/registration/results/?domain=${suggestion.name}`, '_blank');
                  }}
                  className={`backdrop-blur-sm border rounded-lg p-6 flex justify-between items-center hover:scale-105 transition-all duration-300 cursor-pointer animate-slide-in-up ${
                    isDarkMode 
                      ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/60 hover:border-slate-600' 
                      : 'bg-white/50 border-gray-300 hover:bg-white/70 hover:border-gray-400'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  title={suggestion.name}
                >
                  <h3 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{suggestion.name}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFavorite(suggestion.name)) {
                          removeFavorite(suggestion.name);
                        } else {
                          addFavorite(suggestion.name);
                          // Trigger shake animation
                          setIsStarShaking(true);
                          setTimeout(() => setIsStarShaking(false), 500);
                        }
                      }}
                      className={`p-2 rounded-md transition-colors hover:bg-opacity-80 ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200/50'
                      }`}
                      aria-label={isFavorite(suggestion.name) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star 
                        className={`w-5 h-5 transition-colors ${
                          isFavorite(suggestion.name)
                            ? 'fill-yellow-400 text-yellow-400'
                            : isDarkMode
                              ? 'text-white'
                              : 'text-gray-600'
                        }`}
                      />
                    </button>
                    <div className={`hover:opacity-70 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <ArrowRight className="text-xl" />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show final suggestions after generation */}
              {!isGenerating && suggestions.map((suggestion, index) => (
                <div 
                  key={`final-${index}`}
                  onClick={() => {
                    window.open(`https://www.namecheap.com/domains/registration/results/?domain=${suggestion.name}`, '_blank');
                  }}
                  className={`backdrop-blur-sm border rounded-lg p-6 flex justify-between items-center hover:scale-105 transition-all duration-300 cursor-pointer ${
                    isDarkMode 
                      ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/60 hover:border-slate-600' 
                      : 'bg-white/50 border-gray-300 hover:bg-white/70 hover:border-gray-400'
                  }`}
                  title={suggestion.name}
                >
                  <h3 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{suggestion.name}</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFavorite(suggestion.name)) {
                          removeFavorite(suggestion.name);
                        } else {
                          addFavorite(suggestion.name);
                          // Trigger shake animation
                          setIsStarShaking(true);
                          setTimeout(() => setIsStarShaking(false), 500);
                        }
                      }}
                      className={`p-2 rounded-md transition-colors hover:bg-opacity-80 ${
                        isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200/50'
                      }`}
                      aria-label={isFavorite(suggestion.name) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star 
                        className={`w-5 h-5 transition-colors ${
                          isFavorite(suggestion.name)
                            ? 'fill-yellow-400 text-yellow-400'
                            : isDarkMode
                              ? 'text-white'
                              : 'text-gray-600'
                        }`}
                      />
                    </button>
                    <div className={`hover:opacity-70 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <ArrowRight className="text-xl" />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show skeleton cards for remaining domains during generation */}
              {isGenerating && Array.from({ length: Math.max(0, 12 - streamingDomains.length) }).map((_, index) => (
                <div 
                  key={`skeleton-${index}`}
                  className={`backdrop-blur-sm border rounded-lg p-6 animate-pulse ${
                    isDarkMode 
                      ? 'bg-slate-800/50 border-slate-700' 
                      : 'bg-white/50 border-gray-300'
                  }`}
                >
                  <div className={`h-8 rounded w-3/4 ${
                    isDarkMode ? 'bg-slate-600/50' : 'bg-gray-300/50'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State - Only show when no domains are being streamed */}
        {isGenerating && streamingDomains.length === 0 && (
          <div className="mt-8 w-full max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <div 
                  key={`initial-skeleton-${index}`}
                  className={`backdrop-blur-sm border rounded-lg p-6 animate-pulse ${
                    isDarkMode 
                      ? 'bg-slate-800/50 border-slate-700' 
                      : 'bg-white/50 border-gray-300'
                  }`}
                >
                  <div className={`h-8 rounded w-3/4 ${
                    isDarkMode ? 'bg-slate-600/50' : 'bg-gray-300/50'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <SharedFooter />
    </div>
  );
} 