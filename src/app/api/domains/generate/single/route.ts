import { NextRequest, NextResponse } from "next/server";
import { checkDomainAvailability } from "@/lib/namecheap";
import { generateDomainSuggestions } from "@/lib/gemini-domains";

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
    
    // Generate a batch of domains but we only need one
    const domains = await generateDomainSuggestions(description, options, options.attempt);
    
    if (!domains || domains.length === 0) {
      return NextResponse.json(
        { 
          error: 'Could not generate any domains', 
          noDomainsGenerated: true,
          message: 'Unable to generate domain suggestions. Try a different description or adjust your filters.'
        },
        { status: 200 }
      );
    }
    
    // Take the first domain and check its availability
    const domain = domains[0];
    const result = await checkDomainAvailability(domain);
    
    // Only return if it's available
    if (result.available) {
      return NextResponse.json({
        domain: {
          name: domain,
          available: true,
          isPremium: result.isPremium || false
        }
      });
    }
    
    // If not available, try the next ones in the list
    for (let i = 1; i < domains.length; i++) {
      const alternateDomain = domains[i];
      const alternateResult = await checkDomainAvailability(alternateDomain);
      
      if (alternateResult.available) {
        return NextResponse.json({
          domain: {
            name: alternateDomain,
            available: true,
            isPremium: alternateResult.isPremium || false
          }
        });
      }
    }
    
    // If no domains are available, return a graceful response
    return NextResponse.json(
      { 
        error: 'Could not find any available domains', 
        noDomainsAvailable: true,
        message: 'All generated domains were already taken. Try adjusting your description or filters.'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in single domain generation API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate domain' },
      { status: 500 }
    );
  }
} 