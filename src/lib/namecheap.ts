import { XMLParser } from 'fast-xml-parser';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import * as dns from 'dns';
import whois from 'whois';
import { promisify } from 'util';

// Promisify whois lookup
const whoisLookupRaw = promisify(whois.lookup);

// Add proper typing for the whois lookup
const whoisLookup = async (domain: string): Promise<string> => {
  // Add timeout to prevent hanging connections
  const options = { 
    timeout: 5000,  // 5 second timeout
    follow: 2       // Max 2 redirects
  };
  
  try {
    // Use the raw lookup with proper type handling
    const result = await (whoisLookupRaw as any)(domain, options);
    // Ensure the result is a string
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (error) {
    console.error(`WHOIS lookup error for ${domain}:`, error);
    throw error;
  }
};

const API_KEY = process.env.NAMECHEAP_API_KEY;
const API_USER = process.env.NAMECHEAP_API_USER;
const CLIENT_IP = process.env.NAMECHEAP_CLIENT_IP;
const USERNAME = process.env.NAMECHEAP_USERNAME;
const ENVIRONMENT = process.env.NEXT_PUBLIC_NAMECHEAP_ENVIRONMENT || 'sandbox';
const USE_WHOIS = process.env.USE_WHOIS !== 'false'; // Default to using WHOIS
const MAX_PARALLEL = 5; // Maximum number of parallel WHOIS lookups

// Simple in-memory cache for WHOIS results
const whoisCache: Record<string, { available: boolean, timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

let availabilityCheckQuiet = process.env.DOMAIN_CHECK_QUIET === '1';

export function setAvailabilityCheckQuiet(quiet: boolean) {
  availabilityCheckQuiet = quiet;
}

function isAvailabilityCheckQuiet() {
  return availabilityCheckQuiet || process.env.DOMAIN_CHECK_QUIET === '1';
}

function availLog(...args: Parameters<typeof console.log>) {
  if (!isAvailabilityCheckQuiet()) {
    console.log(...args);
  }
}

if (!isAvailabilityCheckQuiet()) {
  console.log(`Using Namecheap API in ${ENVIRONMENT} mode`);
  if (USE_WHOIS) {
    console.log('WHOIS lookups enabled for domain availability checking');
  }
}

// XML parser options
const xmlParserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 2000; // 2 seconds
const MAX_REQUESTS_PER_WINDOW = 2; // More conservative limit
let lastRequestTime = 0;
let requestsInWindow = 0;
let consecutiveErrors = 0;

// Helper function to handle rate limiting
async function waitForRateLimit() {
  const now = Date.now();
  
  // Reset window if enough time has passed
  if (now - lastRequestTime > RATE_LIMIT_WINDOW) {
    requestsInWindow = 0;
    lastRequestTime = now;
  } 
  // Wait if we've hit the limit
  else if (requestsInWindow >= MAX_REQUESTS_PER_WINDOW) {
    // Calculate backoff time based on consecutive errors
    let waitTime = RATE_LIMIT_WINDOW - (now - lastRequestTime);
    
    // Apply exponential backoff if we've had errors
    if (consecutiveErrors > 0) {
      waitTime = Math.min(30000, waitTime * Math.pow(2, consecutiveErrors));
      availLog(`Rate limit backoff: waiting ${waitTime}ms after ${consecutiveErrors} errors`);
    }
    
    // Wait the calculated amount of time
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Reset for next window
    requestsInWindow = 0;
    lastRequestTime = Date.now();
  }
  
  requestsInWindow++;
}

// Function to handle rate limit errors
function handleRateLimitError() {
  consecutiveErrors++;
  // Reset request count to force waiting
  requestsInWindow = MAX_REQUESTS_PER_WINDOW;
}

// Function to reset error count on success
function resetErrorCount() {
  consecutiveErrors = 0;
}

function isValidDomain(domain: string): boolean {
  try {
    // Always convert to lowercase for validation
    domain = domain.toLowerCase().trim();
    
    // Basic check to make sure it has some letters and at least one dot
    if (!domain.includes('.')) return false;
    
    // Split domain into parts
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];
    
    // Very basic validation - just checking for a few obvious issues
    if (parts.length < 2) return false;                // Must have at least one dot
    if (parts.some(p => p.length === 0)) return false; // No empty parts
    if (tld.length < 2) return false;                  // TLD must be at least 2 chars
    
    // For the UI domain generator, just allow names with a-z, 0-9, and -
    return /^[a-z0-9][a-z0-9\-]*[a-z0-9]\.[a-z0-9\-\.]+[a-z0-9]$/i.test(domain);
  } catch (error) {
    console.error('Domain validation error:', error);
    return false;
  }
}

/**
 * Check domain availability using DNS lookup
 * This is more reliable than WHOIS as it directly checks if the domain exists in DNS
 * Uses Node's native dns module instead of the dig command for better compatibility
 */
async function checkDomainWithDNS(domain: string): Promise<{available: boolean, source: string}> {
  try {
    availLog(`Checking domain with DNS lookup: ${domain}`);
    
    // First check A record, and immediately return if ESERVFAIL is encountered
    const aRecordResult = await new Promise<{success: boolean, eservfail: boolean}>((resolve) => {
      dns.resolve4(domain, (err, addresses) => {
        if (err) {
          // If error is ENOTFOUND or ENODATA, domain might be available
          if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            resolve({success: true, eservfail: false});
          } else if (err.code === 'ESERVFAIL') {
            // Specifically handle ESERVFAIL - mark as unavailable and exit early
            availLog(`DNS A record error for ${domain}: ${err.code} - Skipping domain completely`);
            resolve({success: false, eservfail: true});
          } else {
            availLog(`DNS A record error for ${domain}: ${err.code}`);
            resolve({success: false, eservfail: false});
          }
        } else if (addresses && addresses.length > 0) {
          availLog(`Domain ${domain} has A records: ${addresses.join(', ')}`);
          resolve({success: false, eservfail: false}); // Has A records, not available
        } else {
          resolve({success: true, eservfail: false}); // No A records found
        }
      });
    });
    
    // If ESERVFAIL was encountered in A record check, skip all other checks
    if (aRecordResult.eservfail) {
      return { available: false, source: 'dns-eservfail-skipped' };
    }
    
    // Otherwise, proceed with the other checks
    const a = aRecordResult.success;
    
    // 2. Check for AAAA records (IPv6 addresses)
    const checkAAAA = () => new Promise<boolean>((resolve) => {
      dns.resolve6(domain, (err, addresses) => {
        if (err) {
          if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            resolve(true);
          } else if (err.code === 'ESERVFAIL') {
            // Specifically handle ESERVFAIL - mark as unavailable
            availLog(`DNS AAAA record error for ${domain}: ${err.code} - Skipping domain`);
            resolve(false); // Immediately mark as unavailable to skip further checks
          } else {
            resolve(false); // Other errors are inconclusive
          }
        } else if (addresses && addresses.length > 0) {
          availLog(`Domain ${domain} has AAAA records`);
          resolve(false); // Has AAAA records, not available
        } else {
          resolve(true); // No AAAA records found
        }
      });
    });
    
    // 3. Check for MX records (mail servers)
    const checkMX = () => new Promise<boolean>((resolve) => {
      dns.resolveMx(domain, (err, addresses) => {
        if (err) {
          if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            resolve(true);
          } else if (err.code === 'ESERVFAIL') {
            // Specifically handle ESERVFAIL - mark as unavailable
            availLog(`DNS MX record error for ${domain}: ${err.code} - Skipping domain`);
            resolve(false); 
          } else {
            resolve(false); // Other errors are inconclusive
          }
        } else if (addresses && addresses.length > 0) {
          availLog(`Domain ${domain} has MX records`);
          resolve(false); // Has MX records, not available
        } else {
          resolve(true); // No MX records found
        }
      });
    });
    
    // 4. Check for NS records (name servers)
    const checkNS = () => new Promise<boolean>((resolve) => {
      dns.resolveNs(domain, (err, addresses) => {
        if (err) {
          if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            resolve(true);
          } else if (err.code === 'ESERVFAIL') {
            // Specifically handle ESERVFAIL - mark as unavailable
            availLog(`DNS NS record error for ${domain}: ${err.code} - Skipping domain`);
            resolve(false);
          } else {
            resolve(false); // Other errors are inconclusive
          }
        } else if (addresses && addresses.length > 0) {
          availLog(`Domain ${domain} has NS records: ${addresses.join(', ')}`);
          resolve(false); // Has NS records, not available
        } else {
          resolve(true); // No NS records found
        }
      });
    });
    
    // 5. Check for SOA record (Start of Authority)
    const checkSOA = () => new Promise<boolean>((resolve) => {
      dns.resolveSoa(domain, (err, address) => {
        if (err) {
          if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            resolve(true);
          } else if (err.code === 'ESERVFAIL') {
            // Specifically handle ESERVFAIL - mark as unavailable
            availLog(`DNS SOA record error for ${domain}: ${err.code} - Skipping domain`);
            resolve(false);
          } else {
            resolve(false); // Other errors are inconclusive
          }
        } else if (address) {
          availLog(`Domain ${domain} has SOA record`);
          resolve(false); // Has SOA record, not available
        } else {
          resolve(true); // No SOA record found
        }
      });
    });
    
    // 6. Check for TXT records
    const checkTXT = () => new Promise<boolean>((resolve) => {
      dns.resolveTxt(domain, (err, records) => {
        if (err) {
          if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
            resolve(true);
          } else if (err.code === 'ESERVFAIL') {
            // Specifically handle ESERVFAIL - mark as unavailable
            availLog(`DNS TXT record error for ${domain}: ${err.code} - Skipping domain`);
            resolve(false);
          } else {
            resolve(false); // Other errors are inconclusive
          }
        } else if (records && records.length > 0) {
          availLog(`Domain ${domain} has TXT records`);
          resolve(false); // Has TXT records, not available
        } else {
          resolve(true); // No TXT records found
        }
      });
    });
    
    // 7. Try to look up the hostname
    const checkExists = () => new Promise<boolean>((resolve) => {
      dns.lookup(domain, (err) => {
        if (err) {
          if (err.code === 'ENOTFOUND') {
            resolve(true); // Not found, likely available
          } else if (err.code === 'ESERVFAIL') {
            // Specifically handle ESERVFAIL - mark as unavailable
            availLog(`DNS lookup error for ${domain}: ${err.code} - Skipping domain`);
            resolve(false);
          } else {
            resolve(false); // Other errors are inconclusive
          }
        } else {
          availLog(`Domain ${domain} resolves to an IP`);
          resolve(false); // Domain exists
        }
      });
    });
    
    // Run all remaining checks in parallel
    const [aaaa, mx, ns, soa, txt, exists] = await Promise.all([
      checkAAAA(),
      checkMX(),
      checkNS(),
      checkSOA(),
      checkTXT(),
      checkExists()
    ]);
    
    // Log the results of all checks
    availLog(`DNS check results for ${domain}: ` +
      `A: ${a}, AAAA: ${aaaa}, MX: ${mx}, NS: ${ns}, SOA: ${soa}, TXT: ${txt}, Exists: ${exists}`);
    
    // Domain is available only if ALL checks pass (all return true)
    // This is the most conservative approach
    if (a && aaaa && mx && ns && soa && txt && exists) {
      availLog(`Domain ${domain} appears AVAILABLE based on all DNS checks`);
      return { available: true, source: 'dns-all-checks' };
    } else {
      // For debugging, log which checks failed
      const failedChecks = [];
      if (!a) failedChecks.push('A');
      if (!aaaa) failedChecks.push('AAAA');
      if (!mx) failedChecks.push('MX');
      if (!ns) failedChecks.push('NS');
      if (!soa) failedChecks.push('SOA');
      if (!txt) failedChecks.push('TXT');
      if (!exists) failedChecks.push('EXISTS');
      
      availLog(`Domain ${domain} is NOT available. Failed checks: ${failedChecks.join(', ')}`);
      return { available: false, source: `dns-failed-${failedChecks.join('-')}` };
    }
    
  } catch (error) {
    console.error(`Error checking domain with DNS: ${domain}`, error);
    // On error, we can't be sure, so return as unavailable
    return { available: false, source: 'dns-error' };
  }
}

// RapidAPI Domainr configuration (require env var; no fallback)
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'domainr.p.rapidapi.com';
const DOMAINR_API_URL = 'https://domainr.p.rapidapi.com/v2/status';

// Domainr API rate limit management
let lastDomainrRequest = 0;
const DOMAINR_RATE_LIMIT_MS = 1000; // 1 request per second to be safe

/**
 * Check domain availability using the Domainr API
 * This is much more accurate than DNS or WHOIS checks
 */
async function checkDomainWithDomainr(domain: string): Promise<{available: boolean, source: string, status?: string}> {
  try {
    availLog(`Checking domain with Domainr API: ${domain}`);
    
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastDomainrRequest;
    if (timeSinceLastRequest < DOMAINR_RATE_LIMIT_MS) {
      const delay = DOMAINR_RATE_LIMIT_MS - timeSinceLastRequest;
      availLog(`Rate limiting Domainr API, waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Set up API request
    const url = `${DOMAINR_API_URL}?domain=${encodeURIComponent(domain)}`;
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };
    
    // Make the API request (fallback to DNS if key is missing)
    if (!RAPIDAPI_KEY) {
      console.error('RAPIDAPI_KEY is not set');
      return checkDomainWithDNS(domain);
    }
    lastDomainrRequest = Date.now();
    const response = await fetch(url, options);
    
    // Check for rate limiting or other errors
    if (!response.ok) {
      console.error(`Domainr API error for ${domain}: ${response.status} ${response.statusText}`);
      // Fall back to DNS check on API error
      return checkDomainWithDNS(domain);
    }
    
    // Parse the response
    const data = await response.json();
    
    if (!data.status || !Array.isArray(data.status) || data.status.length === 0) {
      console.error(`Unexpected Domainr API response format for ${domain}`);
      return checkDomainWithDNS(domain);
    }
    
    // Get the status for this domain
    const domainStatus = data.status.find((s: any) => s.domain === domain);
    if (!domainStatus || !domainStatus.status) {
      console.error(`No status found in Domainr API response for ${domain}`);
      return checkDomainWithDNS(domain);
    }
    
    // Parse the status code
    // Known status codes:
    // active: Domain is registered and in use
    // inactive: Domain is registered but not in use
    // undelegated: Domain is registered but not delegated to DNS
    // available: Domain is available for registration
    // reserved: Domain is reserved and not available for registration
    // marketed active: Domain is registered and being marketed for sale
    // marketed priced transferable active parked: Domain is registered, parked, and available for purchase
    const status = domainStatus.status;
    availLog(`Domainr API status for ${domain}: ${status}`);
    
    // Per user request: Consider domains with "undelegated inactive" status as available
    const available = status === 'undelegated inactive' || status === 'inactive undelegated';
    
    // Log the determination for debugging
    if (available) {
      availLog(`Domain ${domain} appears AVAILABLE based on status: ${status}`);
    } else {
      availLog(`Domain ${domain} is NOT AVAILABLE based on status: ${status}`);
    }
    
    return { 
      available, 
      source: 'domainr-api',
      status
    };
  } catch (error) {
    console.error(`Error checking domain with Domainr API: ${domain}`, error);
    // Fall back to DNS check on error
    return checkDomainWithDNS(domain);
  }
}

// Cache for domain availability results (to avoid repeated lookups)
const domainCache: Record<string, {available: boolean, source: string, status?: string, timestamp: number}> = {};

/**
 * Checks multiple domains in parallel with rate limiting
 */
async function processDomainsInBatches(domains: string[]): Promise<Record<string, {available: boolean, source: string, status?: string}>> {
  const results: Record<string, {available: boolean, source: string, status?: string}> = {};
  const MAX_CONCURRENT = 5; // Maximum concurrent API requests
  
  // Process domains in batches
  for (let i = 0; i < domains.length; i += MAX_CONCURRENT) {
    const batch = domains.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map(async (domain) => {
      // Check cache first
      const cacheKey = domain.toLowerCase();
      const now = Date.now();
      
      if (domainCache[cacheKey] && now - domainCache[cacheKey].timestamp < CACHE_TTL) {
        // Use cached result if valid
        const { available, source, status } = domainCache[cacheKey];
        results[domain] = { available, source, status };
        return;
      }
      
      // Implement the same tiered approach as in checkDomainAvailability
      // TIER 1: First check with WHOIS lookup
      try {
        const whoisData = await whoisLookup(domain);
        // If domain not found in WHOIS, it's likely available
        const notFound = whoisData.toLowerCase().includes("no match") || 
                        whoisData.toLowerCase().includes("not found") ||
                        whoisData.toLowerCase().includes("no data found") ||
                        whoisData.toLowerCase().includes("no entries found");
        
        if (notFound) {
          availLog(`Domain ${domain} not found in WHOIS - likely available`);
          // Double check with DNS
          const dnsResult = await checkDomainWithDNS(domain);
          if (dnsResult.available) {
            // If both WHOIS and DNS say it's available, we're confident
            const result = { available: true, source: "WHOIS+DNS" };
            results[domain] = result;
            // Cache the result
            domainCache[cacheKey] = { ...result, timestamp: now };
            return;
          }
        } else {
          // Domain found in WHOIS - it's not available
          availLog(`Domain ${domain} found in WHOIS - not available`);
          const result = { available: false, source: "WHOIS" };
          results[domain] = result;
          // Cache the result
          domainCache[cacheKey] = { ...result, timestamp: now };
          return;
        }
      } catch (whoisError) {
        availLog(`WHOIS lookup failed for ${domain}: ${whoisError}`);
        // Continue to DNS check if WHOIS fails
      }

      // TIER 1: Check with DNS lookup if WHOIS was inconclusive
      try {
        const dnsResult = await checkDomainWithDNS(domain);
        if (!dnsResult.available) {
          // If DNS check shows domain exists, we're confident it's not available
          const result = { available: false, source: dnsResult.source };
          results[domain] = result;
          // Cache the result
          domainCache[cacheKey] = { ...result, timestamp: now };
          return;
        }
      } catch (dnsError) {
        availLog(`DNS check failed for ${domain}: ${dnsError}`);
        // Continue to Domainr if DNS check fails
      }
      
      // TIER 2: Only use Domainr API as last resort if the first tier was inconclusive
      availLog(`Using Domainr API for final verification of ${domain}`);
      const result = await checkDomainWithDomainr(domain);
      results[domain] = result;
      
      // Cache the result
      domainCache[cacheKey] = { ...result, timestamp: now };
    });
    
    // Wait for all requests in the batch to complete
    await Promise.all(promises);
    
    // Add a small delay between batches to prevent rate limiting
    if (i + MAX_CONCURRENT < domains.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

/**
 * Checks if a domain is available for registration
 */
export async function checkDomainAvailability(domain: string) {
  if (!isValidDomain(domain)) {
    return { available: false, error: "Invalid domain format" };
  }
  
  try {
    // OPTIMIZED APPROACH: Start with DNS check first as it's faster
    try {
      const dnsResult = await checkDomainWithDNS(domain);
      if (dnsResult.available) {
        // If DNS check shows domain doesn't exist, it's likely available
        // Quick verification with WHOIS only if we think it's available
        try {
          // Use a shorter timeout for WHOIS as a secondary verification
          const options = { timeout: 2000, follow: 1 };
          const whoisData = await (whoisLookupRaw as any)(domain, options);
          
          const notFound = typeof whoisData === 'string' && (
            whoisData.toLowerCase().includes("no match") || 
            whoisData.toLowerCase().includes("not found") ||
            whoisData.toLowerCase().includes("no data found") ||
            whoisData.toLowerCase().includes("no entries found")
          );
          
          if (notFound) {
            // Both DNS and WHOIS indicate available
            return {
              available: true, 
              isPremium: false, 
              name: domain,
              source: "DNS+WHOIS"
            };
          }
        } catch (whoisError) {
          // If WHOIS times out or fails, trust DNS results
          availLog(`WHOIS verification failed for ${domain}, using DNS result`);
          return {
            available: true, 
            isPremium: false, 
            name: domain,
            source: "DNS"
          };
        }
      } else {
        // DNS check shows domain exists, so it's not available
        return {
          available: false,
          name: domain,
          source: dnsResult.source
        };
      }
    } catch (dnsError) {
      availLog(`DNS check failed for ${domain}: ${dnsError}`);
    }
    
    // If we get here, DNS check was either inconclusive or failed
    // Fall back to Domainr API which is usually fast
    try {
      availLog(`Using Domainr API for final verification of ${domain}`);
      const result = await checkDomainWithDomainr(domain);
      
      return {
        available: result.available,
        isPremium: false,
        name: domain,
        source: result.source,
        status: result.status
      };
    } catch (domainrError) {
      availLog(`Domainr check failed for ${domain}: ${domainrError}`);
      
      // Last resort: try WHOIS with a short timeout
      try {
        const options = { timeout: 3000, follow: 1 };
        const whoisData = await (whoisLookupRaw as any)(domain, options);
        
        const notFound = typeof whoisData === 'string' && (
          whoisData.toLowerCase().includes("no match") || 
          whoisData.toLowerCase().includes("not found") ||
          whoisData.toLowerCase().includes("no data found") ||
          whoisData.toLowerCase().includes("no entries found")
        );
        
        return {
          available: notFound,
          isPremium: false,
          name: domain,
          source: "WHOIS-fallback"
        };
      } catch (whoisError) {
        // If everything fails, assume domain is not available to be safe
        availLog(`All checks failed for ${domain}, assuming not available`);
        return { 
          available: false, 
          name: domain, 
          error: "All availability checks failed" 
        };
      }
    }
  } catch (error) {
    console.error(`Error checking domain availability for ${domain}:`, error);
    return { available: false, error: "Error checking domain availability" };
  }
}

export async function getDomainPricing(tld: string) {
  // Since we don't use pricing information at all, this function now only
  // returns a simple success response to not break existing code flow
  return {
    success: true
  };
} 

/**
 * Checks multiple domains for availability in parallel with rate limiting
 */
export async function checkMultipleDomains(domains: string[]) {
  // Validate domains first
  const validDomains = domains.filter(isValidDomain);
  
  // Process valid domains in batches
  const results = await processDomainsInBatches(validDomains);
  
  // Add any invalid domains as unavailable
  domains.forEach(domain => {
    if (!isValidDomain(domain)) {
      results[domain] = { 
        available: false, 
        source: 'invalid-format' 
      };
    }
  });
  
  return results;
}

/**
 * Simple fetch function that doesn't use a proxy
 */
async function fetchDirectly(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    return response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
} 