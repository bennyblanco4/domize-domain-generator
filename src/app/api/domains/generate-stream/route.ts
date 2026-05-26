import { NextRequest } from 'next/server';
import { checkDomainAvailability } from '@/lib/namecheap';
import { generateDomainSuggestions } from '@/lib/gemini-domains';

const MIN_DOMAINS = 12;
const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        const eventData = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(eventData));
      };

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
          maxPrice,
          turnstileToken
        } = body;

        if (!description) {
          sendEvent({ type: 'error', message: 'Description is required' });
          controller.close();
          return;
        }

        // Check if request is from localhost to bypass Turnstile
        const isLocalhost = 
          req.headers.get('host')?.includes('localhost') ||
          req.headers.get('host')?.includes('127.0.0.1') ||
          req.headers.get('host')?.startsWith('192.168.') ||
          req.headers.get('host')?.startsWith('10.') ||
          req.headers.get('host')?.startsWith('172.') ||
          turnstileToken === 'localhost-bypass';

        // Verify Turnstile token (skip on localhost)
        if (!isLocalhost) {
          if (!turnstileToken) {
            sendEvent({ type: 'error', message: 'Verification required' });
            controller.close();
            return;
          }

          const secretKey = process.env.TURNSTILE_SECRET_KEY;
          if (!secretKey) {
            sendEvent({ type: 'error', message: 'Server configuration error' });
            controller.close();
            return;
          }

          const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              secret: secretKey,
              response: turnstileToken,
            }),
          });

          const verifyData = await verifyResponse.json();
          if (!verifyData.success) {
            sendEvent({ type: 'error', message: 'Verification failed. Please try again.' });
            controller.close();
            return;
          }
        } else {
          console.log('Localhost detected, bypassing Turnstile verification');
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
        let foundEnoughDomains = false;
        
        // Send initial event
        sendEvent({ type: 'start', message: 'Starting domain generation...' });
        
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
              
              // Send status update for domain being checked
              sendEvent({ 
                type: 'status', 
                message: `Checking ${domain}...`,
                domain: domain,
                status: 'checking'
              });
              
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
                    const domainData = {
                      name: domain,
                      available: true,
                      isPremium: result.isPremium,
                      price: domainPrice || undefined
                    };
                    
                    availableDomains.push(domainData);
                    
                    // Send status update for available domain
                    sendEvent({ 
                      type: 'status', 
                      message: `${domain} is available!`,
                      domain: domain,
                      status: 'available'
                    });
                    
                    // Send the domain immediately as it becomes available
                    sendEvent({ 
                      type: 'domain', 
                      domain: domainData,
                      total: availableDomains.length
                    });
                    
                    // If we have enough domains, break early
                    if (availableDomains.length >= MIN_DOMAINS) break;
                  } else {
                    // Send status update for unavailable domain
                    sendEvent({ 
                      type: 'status', 
                      message: `${domain} is not available`,
                      domain: domain,
                      status: 'unavailable'
                    });
                  }
                } else {
                  // Send status update for unavailable domain
                  sendEvent({ 
                    type: 'status', 
                    message: `${domain} is not available`,
                    domain: domain,
                    status: 'unavailable'
                  });
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
        
        // Send completion event
        sendEvent({ 
          type: 'complete', 
          domains: availableDomains,
          total: availableDomains.length,
          error: availableDomains.length === 0 ? 'Could not find any available domains' : null
        });
        
        controller.close();
        
      } catch (error) {
        console.error('Error in streaming domain generation:', error);
        sendEvent({ type: 'error', message: 'Failed to generate domain suggestions' });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
