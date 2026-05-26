/**
 * Utility to preload domain prices in batches to improve perceived performance
 */

// In-memory cache
const preloadedDomains = new Set<string>();
const pricingPromises: Record<string, Promise<any>> = {};

// Rate limiting configuration
const MAX_CONCURRENT = 2; // Reduced from 5 to prevent resource exhaustion
const REQUEST_DELAY = 1000; // 1 second delay between requests

// Global request queue to control concurrency
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private activeRequests = 0;

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.activeRequests >= MAX_CONCURRENT || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.activeRequests++;
    
    try {
      await request();
    } catch (error) {
      console.error('Error processing request:', error);
    } finally {
      this.activeRequests--;
      
      // Add delay before processing next request
      if (this.queue.length > 0) {
        setTimeout(() => {
          this.processQueue();
        }, REQUEST_DELAY);
      }
    }
  }
}

const requestQueue = new RequestQueue();

/**
 * Preload domain prices in batches using the batch API endpoint
 * @param domains List of domains to preload prices for
 * @param batchSize Number of domains to process at once (default: 2, reduced for stability)
 * @returns Promise that resolves when all prices are loaded
 */
export async function preloadDomainPrices(domains: string[], batchSize = 2): Promise<void> {
  if (!domains || domains.length === 0) return;
  
  // Filter out domains that are already loaded or being loaded
  const domainsToLoad = domains.filter(domain => {
    const key = domain.toLowerCase();
    return !preloadedDomains.has(key) && !(key in pricingPromises);
  });
  
  if (domainsToLoad.length === 0) return;
  
  console.log(`Preloading prices for ${domainsToLoad.length} domains...`);
  
  // Update the set to avoid duplicate preloads
  domainsToLoad.forEach(domain => preloadedDomains.add(domain.toLowerCase()));
  
  // Process domains in smaller batches sequentially
  for (let i = 0; i < domainsToLoad.length; i += batchSize) {
    const batch = domainsToLoad.slice(i, i + batchSize);
    
    try {
      // Use the request queue to control concurrency
      await requestQueue.add(async () => {
        const response = await fetch('/api/domains/scrape-price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ domains: batch }),
        });
        
        if (!response.ok) {
          throw new Error(`Batch API failed: ${response.statusText}`);
        }
        
        return response.json();
      });
      
      console.log(`Successfully preloaded batch of ${batch.length} domains`);
    } catch (error) {
      console.error('Error in batch preloading, falling back to individual requests:', error);
      
      // Fall back to individual requests with queue control
      for (const domain of batch) {
        try {
          await requestQueue.add(async () => {
            const response = await fetch(`/api/domains/scrape-price?domain=${domain}&preload=true`);
            if (!response.ok) {
              throw new Error(`Failed to preload ${domain}: ${response.statusText}`);
            }
            return response.json();
          });
        } catch (error) {
          console.warn(`Failed to preload price for ${domain}:`, error);
        }
      }
    }
    
    // Longer delay between batches to reduce server load
    if (i + batchSize < domainsToLoad.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`Completed preloading prices for ${domainsToLoad.length} domains`);
}

/**
 * Fetch price for a single domain and cache the result
 * @param domain Domain to fetch price for
 * @returns Promise that resolves when price is loaded
 */
export async function fetchDomainPrice(domain: string): Promise<any> {
  if (!domain) return Promise.resolve(null);
  
  const cacheKey = domain.toLowerCase();
  
  // Return existing promise if we're already fetching this domain
  if (cacheKey in pricingPromises) {
    return pricingPromises[cacheKey];
  }
  
  // Mark as preloaded to avoid duplicate fetches
  preloadedDomains.add(cacheKey);
  
  // Create and store the promise with queue control
  pricingPromises[cacheKey] = requestQueue.add(async () => {
    try {
      const response = await fetch(`/api/domains/scrape-price?domain=${domain}`);
      if (!response.ok) {
        // Check if this is a 404 or 500 error that indicates the domain is actually unavailable
        if (response.status === 404 || response.status === 500) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || response.statusText;
          
          // Check if error message indicates domain is not actually available
          if (
            errorMessage.includes("Could not find price for domain") ||
            errorMessage.includes("Failed to extract price") ||
            errorMessage.includes("Unable to get pricing information")
          ) {
            // Create an error with special flags to distinguish between unavailable domains and price scraping errors
            const error = new Error(errorMessage);
            // @ts-ignore - adding custom property to Error
            error.priceScrapeError = true;
            // Do NOT mark as domainUnavailable since we can't confirm if it's truly unavailable
            throw error;
          }
        }
        throw new Error(`Failed to fetch price: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching price for ${domain}:`, error);
      throw error;
    } finally {
      // Clean up the promise reference after longer delay
      setTimeout(() => {
        delete pricingPromises[cacheKey];
      }, 5000);
    }
  });
  
  return pricingPromises[cacheKey];
}

/**
 * Check if a domain has been preloaded
 * @param domain Domain to check
 */
export function isDomainPreloaded(domain: string): boolean {
  return preloadedDomains.has(domain.toLowerCase());
}

/**
 * Check if a domain price is currently being fetched
 * @param domain Domain to check
 */
export function isDomainPriceLoading(domain: string): boolean {
  return domain.toLowerCase() in pricingPromises;
} 