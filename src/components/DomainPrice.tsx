'use client';

// Keep imports commented out while price scraping is disabled
// import { useScrapedDomainPrice } from '@/hooks/useScrapedDomainPrice';
// import { useEffect } from 'react';

interface DomainPriceProps {
  domainName: string;
  onUnavailable?: (domainName: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const DomainPrice = (_props: DomainPriceProps) => {
  // PRICE DISPLAY DISABLED
  // Return empty space with same height to prevent layout shift
  return <div className="h-5"></div>;
  
  // Keeping original code commented out for future re-enablement
  /*
  const { loading, error, priceData, actuallyUnavailable } = useScrapedDomainPrice(domainName);

  // If the domain is actually unavailable, notify the parent component
  useEffect(() => {
    if (actuallyUnavailable && onUnavailable) {
      onUnavailable(domainName);
    }
  }, [actuallyUnavailable, domainName, onUnavailable]);

  // If the domain is actually unavailable but parent hasn't processed it yet
  if (actuallyUnavailable) {
    return null;
  }

  // Don't show loading or error states, just return empty space if price isn't available
  if (loading || error || !priceData || !priceData.price) {
    // Return empty space with same height to prevent layout shift
    return <div className="h-5"></div>;
  }

  return (
    <div 
      className="flex items-center mt-1.5 text-xs"
      data-domain={domainName}
      data-price={priceData.price.toString()}
      data-currency={priceData.currency}
    >
      <span className="font-medium text-green-400">
        ${priceData.price.toFixed(2)}/yr
      </span>
    </div>
  );
  */
}; 