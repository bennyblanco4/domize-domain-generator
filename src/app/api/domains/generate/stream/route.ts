import { NextRequest } from "next/server";
import { checkDomainAvailability } from "@/lib/namecheap";
import { generateDomainSuggestions } from "@/lib/gemini-domains";

// Helper function to send SSE data
function sendEvent(controller: ReadableStreamDefaultController, data: any) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const description = url.searchParams.get("description");
  
  // Parse advanced options from query parameters
  const tlds = url.searchParams.get("tlds")?.split(',') || undefined;
  const maxLength = url.searchParams.get("maxLength") ? 
    parseInt(url.searchParams.get("maxLength") as string) : undefined;
  const minLength = url.searchParams.get("minLength") ? 
    parseInt(url.searchParams.get("minLength") as string) : undefined;
  const previousDomains = url.searchParams.get("previousDomains")?.split(',') || undefined;
  const attempt = url.searchParams.get("attempt") ? 
    parseInt(url.searchParams.get("attempt") as string) : 1;
  
  // Parse price range parameters
  const minPrice = url.searchParams.get("minPrice") ? 
    parseFloat(url.searchParams.get("minPrice") as string) : undefined;
  const maxPrice = url.searchParams.get("maxPrice") ? 
    parseFloat(url.searchParams.get("maxPrice") as string) : undefined;
  
  const options = {
    tlds,
    maxLength,
    minLength,
    previousDomains,
    attempt,
    minPrice,
    maxPrice
  };

  // Define minimum required available domains
  const MIN_AVAILABLE_DOMAINS = 12;
  const MAX_GENERATION_ROUNDS = 8; // Increased from 5 to 8 to allow more rounds
  const MAX_PROCESSING_TIME = 240000; // Increased from 180000 to 240000 (4 minutes)

  // Use a default description for random domains if none is provided
  const actualDescription = description ? description.trim() : "Generate random, creative, and brandable domain names";

  // Create a stream for SSE response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Initialize tracking variables
        const allResults: Array<{
          name: string;
          available: boolean;
          isPremium?: boolean;
          error?: string;
          price?: number;
        }> = [];
        const availableDomains: Array<{
          name: string;
          available: boolean;
          isPremium?: boolean;
          price?: number;
        }> = [];
        let generationRound = 0;
        const alreadyCheckedDomains = new Set(options.previousDomains || []);
        
        // Set a timeout to ensure the process doesn't hang indefinitely
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Domain generation timed out after 4 minutes"));
          }, MAX_PROCESSING_TIME);
        });
        
        // The main domain generation process
        const generationProcess = async () => {
          // Keep generating until we have enough available domains or reach max attempts
          while (availableDomains.length < MIN_AVAILABLE_DOMAINS && generationRound < MAX_GENERATION_ROUNDS) {
            generationRound++;
            
            // Update round number in options
            const roundOptions = {
              ...options,
              attempt: (options.attempt || 1) + generationRound - 1,
              previousDomains: Array.from(alreadyCheckedDomains)
            };
            
            sendEvent(controller, { 
              type: "checking", 
              domain: null, 
              message: actualDescription === "Generate random, creative, and brandable domain names" 
                ? `Finding random available domains...` 
                : `Thinking`
            });

            // Generate a new batch of domain suggestions
            const domains = await generateDomainSuggestions(actualDescription, roundOptions);
            
            if (domains.length === 0) {
              // Instead of breaking, try again with a more specific prompt
              if (generationRound < MAX_GENERATION_ROUNDS - 1) {
                generationRound++;
                sendEvent(controller, { 
                  type: "info", 
                  message: "Trying with different approach..." 
                });
                continue;
              } else {
                sendEvent(controller, { 
                  type: "warning", 
                  message: "No available domains found. Try a different description." 
                });
                break;
              }
            }
            
            // Then check each domain's availability in sequence
            const totalDomainsInRound = domains.length;
            
            for (let i = 0; i < totalDomainsInRound; i++) {
              const domain = domains[i];
              
              // Skip if we've already checked this domain
              if (alreadyCheckedDomains.has(domain.toLowerCase())) {
                continue;
              }
              
              // Add to checked domains set
              alreadyCheckedDomains.add(domain.toLowerCase());
              
              // Send update about which domain is being checked
              sendEvent(controller, { 
                type: "checking", 
                domain, 
                checked: availableDomains.length,
                goal: MIN_AVAILABLE_DOMAINS,
                round: generationRound,
                message: `Checking ${domain}...` 
              });
              
              try {
                const result = await checkDomainAvailability(domain);
                
                // If domain is available, check its price
                if (result.available) {
                  // Get price for the domain
                  let domainPrice = null;
                  let meetsRequirements = true;
                  
                  try {
                    // Only check price if we have price range requirements
                    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
                      // Request price information from the price API
                      const priceResponse = await fetch(`${req.nextUrl.origin}/api/domains/check/price?domain=${domain}`);
                      if (priceResponse.ok) {
                        const priceData = await priceResponse.json();
                        domainPrice = parseFloat(priceData.price);
                        
                        // Check if price meets requirements
                        if (domainPrice) {
                          // Skip premium domains if user has a max price that's not the maximum
                          if (priceData.premium && options.maxPrice !== undefined) {
                            meetsRequirements = false;
                          } else if (options.minPrice !== undefined && domainPrice < options.minPrice) {
                            meetsRequirements = false;
                          } else if (options.maxPrice !== undefined && domainPrice > options.maxPrice) {
                            meetsRequirements = false;
                          }
                        }
                      }
                    }
                  } catch (priceError) {
                    console.error(`Error getting price for ${domain}:`, priceError);
                    // If we can't get the price but have price requirements, default to not showing
                    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
                      meetsRequirements = false;
                    }
                  }
                  
                  const domainResult = {
                    name: domain,
                    available: result.available && meetsRequirements,
                    isPremium: result.isPremium || false,
                    price: domainPrice || undefined
                  };
                  
                  allResults.push(domainResult);
                  
                  // Only add to available domains and send event if it meets requirements
                  if (meetsRequirements) {
                    availableDomains.push(domainResult);
                    
                    // Send the individual domain result as soon as it's available
                    sendEvent(controller, { 
                      type: "domain_available", 
                      domain: domainResult,
                      availableCount: availableDomains.length,
                      goal: MIN_AVAILABLE_DOMAINS
                    });
                    
                    // If we've found enough available domains, we can stop
                    if (availableDomains.length >= MIN_AVAILABLE_DOMAINS) {
                      break;
                    }
                  }
                } else {
                  // If domain is not available, just add it to all results
                  const domainResult = {
                    name: domain,
                    available: false,
                    isPremium: result.isPremium || false
                  };
                  
                  allResults.push(domainResult);
                }
              } catch (error) {
                console.error(`Error checking domain ${domain}:`, error);
                allResults.push({
                  name: domain,
                  available: false,
                  error: "Failed to check availability"
                });
              }
              
              // Add a small delay to avoid rate limiting issues
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // If we found enough available domains, exit the loop
            if (availableDomains.length >= MIN_AVAILABLE_DOMAINS) {
              console.log(`Found ${availableDomains.length} available domains after ${generationRound} rounds`);
              break;
            }
            
            // If we're going to try another round, let the user know
            if (generationRound < MAX_GENERATION_ROUNDS) {
              sendEvent(controller, { 
                type: "info", 
                message: `Found ${availableDomains.length}/${MIN_AVAILABLE_DOMAINS} domains. Generating more...`,
                availableCount: availableDomains.length,
                goal: MIN_AVAILABLE_DOMAINS
              });
            }
          }
          
          // Once all checks are complete, send the final results
          sendEvent(controller, { 
            type: "result", 
            domains: allResults,
            availableDomains: availableDomains.length 
          });
        };
        
        // Race between the generation process and the timeout
        try {
          await Promise.race([generationProcess(), timeoutPromise]);
        } catch (error) {
          console.error("Domain generation timed out or failed:", error);
          
          // If we have some domains but timed out, still return what we have
          if (availableDomains.length > 0) {
            sendEvent(controller, { 
              type: "warning", 
              message: "Search took too long but found some domains" 
            });
            
            sendEvent(controller, { 
              type: "result", 
              domains: allResults,
              availableDomains: availableDomains.length 
            });
          } else {
            sendEvent(controller, { 
              type: "error", 
              message: "Search timed out. Please try a different description or try again later." 
            });
          }
        }
        
        // Close the stream
        controller.close();
      } catch (error) {
        console.error("Error in domain generation stream:", error);
        sendEvent(controller, { 
          type: "error", 
          message: "Failed to generate domains" 
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
} 