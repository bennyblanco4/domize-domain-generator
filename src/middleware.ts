import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only redirect in production environment
  if (process.env.NODE_ENV === 'production') {
    // Check if the request is using HTTPS
    const isHttps = request.headers.get('x-forwarded-proto')?.includes('https');
    
    // If it's not HTTPS and not a localhost request, redirect to HTTPS
    if (!isHttps && !request.headers.get('host')?.includes('localhost')) {
      // Create the HTTPS URL from the original request URL
      const url = request.nextUrl.clone();
      url.protocol = 'https:';
      
      // Return a redirect response
      return NextResponse.redirect(url, 301);
    }
  }
  
  // Continue with the request if it's already HTTPS or we're in development
  return NextResponse.next();
}

// Only run the middleware on the pages we care about
export const config = {
  matcher: [
    // Match all paths except for:
    // - API routes (/api/*)
    // - Static files (/_next/*)
    // - Public files (/public/*)
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 