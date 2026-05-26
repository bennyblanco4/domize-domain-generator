import { NextRequest, NextResponse } from 'next/server';
import { checkDomainAvailability } from '@/lib/namecheap';
import { generateDomainSuggestions } from '@/lib/gemini-domains';

const MIN_DOMAINS = 12;
const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      description, 
      tlds, 
      maxLength, 
      minLength,
      previousDomains, 
      attempt: requestAttempt,
      minPrice,
      maxPrice 
    } = body;

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }
    
    const options = {
      tlds,
      maxLength,
      minLength,
      previousDomains,
      attempt: requestAttempt || 1,
      minPrice,
      maxPrice
    };
    
    const checkedDomains = new Set<string>();
    const availableDomains: any[] = [];
    let apiAttempt = 1;
    let rateLimitHit = false;
    
    // Main domain generation loop
    while (availableDomains.length < MIN_DOMAINS && apiAttempt <= MAX_ATTEMPTS && !rateLimitHit) {
      console.log(`Attempt ${apiAttempt} to generate domains...`);
      
      try {
        // Generate domain suggestions with options
        const suggestions = await generateDomainSuggestions(
          description,
          { ...options, attempt: apiAttempt },
          apiAttempt
        );
        
        // Add a small delay between generating and checking to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check domain availability with rate limiting
        for (const domain of suggestions) {
          // Skip domains we've already checked
          if (checkedDomains.has(domain.toLowerCase())) continue;
          
          try {
            // Check availability with exponential backoff (implemented in namecheap.ts)
            console.log(`Checking domain availability: ${domain}`);
            const result = await checkDomainAvailability(domain);
            
            // Add to checked domains
            checkedDomains.add(domain.toLowerCase());
            
            // If available, check price if needed
            if (result.available) {
              let domainPrice = null;
              let meetsRequirements = true;
              
              // Only check price if we have price range requirements
              if (options.minPrice !== undefined || options.maxPrice !== undefined) {
                try {
                  // Request price information from the scraping API
                  // Use server-known origin to prevent SSRF via spoofed Origin header
                  const internalOrigin = req.nextUrl.origin;
                  const priceResponse = await fetch(`${internalOrigin}/api/domains/scrape-price?domain=${domain}`);
                  if (priceResponse.ok) {
                    const priceData = await priceResponse.json();
                    domainPrice = priceData.price;
                    
                    // Check if price meets requirements
                    if (domainPrice) {
                      if (options.minPrice !== undefined && domainPrice < options.minPrice) {
                        meetsRequirements = false;
                      } else if (options.maxPrice !== undefined && domainPrice > options.maxPrice) {
                        meetsRequirements = false;
                      }
                    }
                  }
                } catch (priceError) {
                  console.error(`Error scraping price for ${domain}:`, priceError);
                  // If we can't get the price but have price requirements, default to not showing
                  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
                    meetsRequirements = false;
                  }
                }
              }
              
              // Only add domains that meet requirements
              if (meetsRequirements) {
                availableDomains.push({
                  name: domain,
                  available: true,
                  isPremium: result.isPremium,
                  price: domainPrice || undefined
                });
                
                // If we have enough domains, break early
                if (availableDomains.length >= MIN_DOMAINS) break;
              }
            }
            
            // Add a small delay between checks (beyond the rate limiting)
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error: any) {
            console.error(`Error checking domain ${domain}:`, error);
            checkedDomains.add(domain.toLowerCase());
            
            // If we hit rate limit, break the loop and try again later
            if (error.message?.includes('Too many requests')) {
              console.log('Rate limit hit, waiting before next batch...');
              rateLimitHit = true;
              
              // Wait a bit longer before trying again
              await new Promise(resolve => setTimeout(resolve, 5000));
              rateLimitHit = false;
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error generating domain suggestions:', error);
      }
      
      apiAttempt++;
      
      // Add a delay between attempts
      if (apiAttempt <= MAX_ATTEMPTS && availableDomains.length < MIN_DOMAINS) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Return whatever domains we found, even if less than MIN_DOMAINS
    return NextResponse.json({
      domains: availableDomains,
      total: availableDomains.length,
      error: availableDomains.length === 0 ? 'Could not find any available domains' : null
    });
    
  } catch (error) {
    console.error('Error in domain generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate domain suggestions' },
      { status: 500 }
    );
  }
} 