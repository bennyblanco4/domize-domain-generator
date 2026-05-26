import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Minimal health check (avoid leaking env/process details)
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      { 
        status: 'unhealthy'
      },
      { status: 500 }
    );
  }
} 