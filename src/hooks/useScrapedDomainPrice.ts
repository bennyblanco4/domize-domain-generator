import { useState, useEffect } from 'react';
import { fetchDomainPrice } from '@/utils/preloadDomainPrices';

export interface ScrapedPriceData {
  domain: string;
  price: number;
  currency: string;
  source?: string;
  isPremium?: boolean;
}

// Global cache to prevent redundant API calls
const priceCache: Record<string, {
  timestamp: number;
  data: ScrapedPriceData;
  retries?: number;
  isUnavailable?: boolean;
}> = {};

// Cache for domains that are actually unavailable despite DNS check
const unavailableDomains = new Set<string>();

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const MAX_RETRIES = 2;
const RETRY_DELAY = 5000; // 5 seconds

export const useScrapedDomainPrice = (domainName: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<ScrapedPriceData | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [actuallyUnavailable, setActuallyUnavailable] = useState(false);

  useEffect(() => {
    if (!domainName) return;

    // Check if this domain is already known to be unavailable
    if (unavailableDomains.has(domainName.toLowerCase())) {
      setActuallyUnavailable(true);
      return;
    }

    let retryTimer: NodeJS.Timeout;
    let isMounted = true;

    const fetchPrice = async () => {
      // Check cache first
      const cacheKey = domainName.toLowerCase();
      const now = Date.now();
      
      if (
        priceCache[cacheKey] && 
        priceCache[cacheKey].timestamp + CACHE_DURATION > now
      ) {
        if (isMounted) {
          setPriceData(priceCache[cacheKey].data);
          if (priceCache[cacheKey].isUnavailable) {
            setActuallyUnavailable(true);
          }
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      
      try {
        // Use the fetchDomainPrice function from our utility
        const data = await fetchDomainPrice(domainName);
        
        if (data.error) {
          throw new Error(`Scraping error: ${data.error}`);
        }
        
        // Cache the result
        priceCache[cacheKey] = {
          timestamp: now,
          data,
          retries: 0,
          isUnavailable: false
        };
        
        if (isMounted) {
          setPriceData(data);
          setLoading(false);
          setRetryCount(0); // Reset retry count on success
          setActuallyUnavailable(false);
        }
      } catch (err: any) {
        console.error(`Error scraping price for ${domainName}:`, err);
        
        // Check if this is a price not found error, which suggests the domain is actually taken
        const errorMessage = err.message || '';
        const isPriceNotFoundError = 
          errorMessage.includes("Could not find price for domain") || 
          errorMessage.includes("Failed to extract price");
        
        if (isPriceNotFoundError) {
          // Mark this domain as actually unavailable
          unavailableDomains.add(cacheKey);
          if (isMounted) {
            setActuallyUnavailable(true);
          }
          
          // Cache the error status
          priceCache[cacheKey] = {
            timestamp: now,
            data: { domain: domainName, price: 0, currency: 'USD' },
            retries: MAX_RETRIES + 1,
            isUnavailable: true
          };
          
          if (isMounted) {
            setError(errorMessage);
            setLoading(false);
          }
          return;
        }
        
        // Handle retries for other types of errors
        if (retryCount < MAX_RETRIES) {
          console.log(`Retrying (${retryCount + 1}/${MAX_RETRIES}) for ${domainName} in ${RETRY_DELAY}ms`);
          
          if (!priceCache[cacheKey]) {
            priceCache[cacheKey] = {
              timestamp: now,
              data: { domain: domainName, price: 0, currency: 'USD' },
              retries: retryCount + 1
            };
          } else {
            priceCache[cacheKey].retries = (priceCache[cacheKey].retries || 0) + 1;
          }
          
          if (isMounted) {
            retryTimer = setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, RETRY_DELAY);
          }
        } else {
          // Maximum retries reached
          unavailableDomains.add(cacheKey);
          if (isMounted) {
            setActuallyUnavailable(true);
            setError(err.message || 'Failed to scrape pricing data');
            setLoading(false);
          }
        }
      }
    };
    
    fetchPrice();
    
    return () => {
      isMounted = false;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [domainName, retryCount]);

  return { loading, error, priceData, actuallyUnavailable };
}; 