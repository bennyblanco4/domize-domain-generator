'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface PriceInfo {
  duration: number;
  durationType: string;
  price: string;
  regularPrice: string;
  yourPrice: string;
  currency: string;
}

interface PricingData {
  extension: string;
  prices: PriceInfo[];
  error?: string;
}

const DomainPricing = ({ 
  domainExtensions = ['com', 'net', 'org', 'io', 'co', 'app'],
  onPriceData = (_: Record<string, PricingData>) => {}
}) => {
  const [pricingData, setPricingData] = useState<Record<string, PricingData>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch pricing data for a specific extension
  const fetchPricing = async (extension: string) => {
    if (loading[extension]) return;
    
    try {
      setLoading(prev => ({ ...prev, [extension]: true }));
      
      const response = await fetch(`/api/domains/pricing?extension=${extension}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching pricing for .${extension}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setPricingData(prev => {
        const newData = { ...prev, [extension]: data };
        // Notify parent component about the updated data
        onPriceData(newData);
        return newData;
      });
    } catch (err: any) {
      console.error(`Error fetching ${extension} pricing:`, err);
      setError(err.message || 'Failed to fetch pricing data');
    } finally {
      setLoading(prev => ({ ...prev, [extension]: false }));
    }
  };

  // Fetch pricing data for all extensions
  useEffect(() => {
    const fetchAllPricing = async () => {
      for (const ext of domainExtensions) {
        await fetchPricing(ext);
      }
    };
    
    fetchAllPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Domain Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domainExtensions.map(ext => {
            const data = pricingData[ext];
            const isLoading = loading[ext];
            
            return (
              <div 
                key={ext} 
                className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">.{ext}</h3>
                  {isLoading ? (
                    <Badge variant="outline" className="bg-gray-100">Loading...</Badge>
                  ) : data?.error ? (
                    <Badge variant="destructive">Error</Badge>
                  ) : null}
                </div>
                
                {isLoading ? (
                  <div className="h-20 flex items-center justify-center">
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ) : data?.error ? (
                  <div className="text-sm text-red-500">{data.error}</div>
                ) : data?.prices && data.prices.length > 0 ? (
                  <div className="space-y-2">
                    {data.prices.map((price, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{price.duration} {price.durationType.toLowerCase()}</span>
                        <span className="font-semibold text-green-400">
                          ${price.price} {price.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 h-20 flex items-center justify-center">
                    No pricing data available
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DomainPricing; 