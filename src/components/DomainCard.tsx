import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';

interface DomainCardProps {
  domain: string;
  onFavoriteToggle: (domain: string) => void;
  isFavorited: boolean;
}

// Global cache to prevent duplicate requests for the same domain
const priceRequestCache = new Map<string, Promise<any>>();
const priceResultCache = new Map<string, { price: string; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export default function DomainCard({ domain, onFavoriteToggle, isFavorited }: DomainCardProps) {
  const [price, setPrice] = useState<string>('Loading price...');
  const [isLoadingPrice, setIsLoadingPrice] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchPrice = async (retryAttempt = 0) => {
    // Check if component is still mounted
    if (!mountedRef.current) return;

    // Check cache first
    const cacheKey = domain.toLowerCase();
    const cachedResult = priceResultCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedResult && cachedResult.timestamp + CACHE_DURATION > now) {
      setPrice(cachedResult.price);
      setIsLoadingPrice(false);
      return;
    }

    // Check if there's already a request in progress for this domain
    let priceRequest = priceRequestCache.get(cacheKey);
    
    if (!priceRequest) {
      // Create new request
      priceRequest = fetch(`/api/domains/scrape-price?domain=${encodeURIComponent(domain)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        return response.json();
      });
      
      // Cache the request promise
      priceRequestCache.set(cacheKey, priceRequest);
    }

    try {
      const data = await priceRequest;
      
      // Only update if component is still mounted
      if (!mountedRef.current) return;

      if (data.formattedPrice) {
        const priceText = data.formattedPrice;
        setPrice(priceText);
        
        // Cache the result
        priceResultCache.set(cacheKey, {
          price: priceText,
          timestamp: now
        });
        
        setIsLoadingPrice(false);
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error('No price data received');
      }
    } catch (error) {
      console.error(`Error fetching price for ${domain}:`, error);
      
      // Only update if component is still mounted
      if (!mountedRef.current) return;

      const maxRetries = 2;
      if (retryAttempt < maxRetries) {
        console.log(`Retrying price fetch for ${domain} (attempt ${retryAttempt + 1}/${maxRetries})`);
        setRetryCount(retryAttempt + 1);
        
        // Exponential backoff: 2s, 4s, 8s
        const retryDelay = Math.pow(2, retryAttempt + 1) * 1000;
        setTimeout(() => {
          if (mountedRef.current) {
            fetchPrice(retryAttempt + 1);
          }
        }, retryDelay);
      } else {
        // All retries exhausted
        setPrice('Price unavailable');
        setIsLoadingPrice(false);
        
        // Cache the failed result for a shorter time (5 minutes)
        priceResultCache.set(cacheKey, {
          price: 'Price unavailable',
          timestamp: now - CACHE_DURATION + (5 * 60 * 1000) // Will expire in 5 minutes
        });
      }
    } finally {
      // Clean up the request cache
      priceRequestCache.delete(cacheKey);
    }
  };

  useEffect(() => {
    fetchPrice();
  }, [domain]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle(domain);
  };

  const getLoadingText = () => {
    if (retryCount > 0) {
      return `Retrying... (${retryCount}/2)`;
    }
    return 'Loading price...';
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 hover:border-blue-500/50 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-white">{domain}</h3>
        </div>
        <button
          onClick={handleFavoriteClick}
          className={`p-2 rounded-full transition-all duration-200 ${
            isFavorited
              ? 'text-yellow-400 hover:text-yellow-300'
              : 'text-gray-400 hover:text-yellow-400'
          }`}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star 
            size={20} 
            className={isFavorited ? 'fill-current' : ''} 
          />
        </button>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {isLoadingPrice ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-gray-400 text-sm">{getLoadingText()}</span>
            </div>
          ) : (
            <span className={`font-bold ${
              price === 'Price unavailable' 
                ? 'text-red-400' 
                : price.includes('C$') 
                  ? 'text-green-400' 
                  : 'text-green-400'
            }`}>
              {price}
            </span>
          )}
        </div>
        
        {!isLoadingPrice && price !== 'Price unavailable' && (
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200">
            Register
          </button>
        )}
        
        {price === 'Price unavailable' && (
          <button 
            onClick={() => {
              setIsLoadingPrice(true);
              setRetryCount(0);
              setPrice('Loading price...');
              fetchPrice();
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
} 