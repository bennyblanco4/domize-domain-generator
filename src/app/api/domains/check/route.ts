import { checkDomainAvailability } from '@/lib/namecheap';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain');
  
  if (!domain) {
    return NextResponse.json(
      { error: 'Domain parameter is required' },
      { status: 400 }
    );
  }
  
  try {
    console.log(`Checking domain availability: ${domain}`);
    
    // If there's a specific TLD to check for pricing, include it
    const tld = req.nextUrl.searchParams.get('tld');
    
    const result = await checkDomainAvailability(domain);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking domain availability:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check domain availability', 
        detail: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 