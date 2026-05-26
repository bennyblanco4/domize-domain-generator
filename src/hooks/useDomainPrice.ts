import { useState, useEffect } from 'react';

export interface PriceInfo {
  duration: number;
  durationType: string;
  price: string;
  regularPrice: string;
  yourPrice: string;
  currency: string;
}

export interface PricingData {
  extension: string;
  prices: PriceInfo[];
  error?: string;
}

// Global cache to prevent redundant API calls
const priceCache: Record<string, {
  timestamp: number;
  data: PricingData;
}> = {};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export const useDomainPrice = (domainName: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<PricingData | null>(null);

  useEffect(() => {
    // Get extension from domain name (e.g., "example.com" -> "com")
    const extension = domainName.split('.').pop();
    if (!extension) return;

    const fetchPrice = async () => {
      // Check cache first
      const now = Date.now();
      if (
        priceCache[extension] && 
        priceCache[extension].timestamp + CACHE_DURATION > now
      ) {
        setPriceData(priceCache[extension].data);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/domains/pricing?extension=${extension}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching price: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(`Namecheap API error: ${data.error}`);
        }
        
        // Cache the result
        priceCache[extension] = {
          timestamp: now,
          data
        };
        
        setPriceData(data);
      } catch (err: any) {
        console.error(`Error fetching price for ${extension}:`, err);
        setError(err.message || 'Failed to fetch pricing data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrice();
  }, [domainName]);

  return { loading, error, priceData };
}; 