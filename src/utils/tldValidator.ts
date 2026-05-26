/**
 * TLD Validator Utility
 * 
 * This utility provides validation for Top-Level Domains (TLDs) supported by Namecheap.
 * The list includes common gTLDs, ccTLDs, and new gTLDs that are widely supported.
 * 
 * Based on Namecheap's supported TLD list as of 2025.
 */

// Comprehensive list of TLDs supported by Namecheap
// This includes generic TLDs (gTLDs), country-code TLDs (ccTLDs), and new gTLDs
export const SUPPORTED_TLDS = [
  // Popular generic TLDs
  'com', 'net', 'org', 'info', 'biz', 'name', 'mobi', 'pro', 'tel', 'travel',
  'xxx', 'asia', 'cat', 'coop', 'jobs', 'aero', 'museum', 'post',
  
  // New generic TLDs - Tech & Innovation
  'io', 'ai', 'app', 'dev', 'tech', 'digital', 'online', 'site', 'website',
  'web', 'cloud', 'host', 'space', 'codes', 'software', 'systems', 'technology',
  'computer', 'network', 'email', 'domains', 'data', 'download', 'mobile',
  
  // New generic TLDs - Business & Professional
  'co', 'biz', 'business', 'company', 'enterprises', 'ventures', 'holdings',
  'solutions', 'services', 'management', 'consulting', 'partners', 'associates',
  'group', 'agency', 'marketing', 'media', 'studio', 'productions', 'works',
  'industries', 'international', 'global', 'world', 'trade', 'market', 'shop',
  'store', 'shopping', 'boutique', 'sale', 'deals', 'discount', 'promo',
  
  // New generic TLDs - Creative & Lifestyle
  'me', 'life', 'live', 'style', 'design', 'art', 'gallery', 'photo', 'photography',
  'graphics', 'pics', 'pictures', 'video', 'audio', 'music', 'band', 'film',
  'movie', 'show', 'theater', 'dance', 'events', 'party', 'fun', 'games',
  'toys', 'play', 'sport', 'fitness', 'yoga', 'health', 'care', 'clinic',
  'dental', 'doctor', 'medical', 'surgery', 'hospital', 'pharmacy',
  
  // New generic TLDs - Education & Community
  'education', 'academy', 'school', 'college', 'university', 'institute',
  'training', 'courses', 'degree', 'mba', 'phd', 'community', 'social',
  'club', 'team', 'family', 'kids', 'baby', 'dating', 'singles', 'wedding',
  
  // New generic TLDs - Finance & Real Estate
  'finance', 'financial', 'money', 'cash', 'credit', 'loan', 'loans',
  'mortgage', 'tax', 'accountant', 'investments', 'fund', 'capital',
  'property', 'properties', 'estate', 'realty', 'realtor', 'homes',
  'house', 'land', 'apartments', 'condos', 'rentals', 'lease',
  
  // New generic TLDs - Food & Hospitality
  'restaurant', 'cafe', 'coffee', 'bar', 'pub', 'pizza', 'kitchen',
  'recipes', 'cooking', 'food', 'catering', 'delivery', 'menu',
  'hotel', 'hotels', 'vacations', 'holiday', 'tours', 'travel',
  'flights', 'cruise', 'cruises', 'taxi', 'car', 'cars', 'auto',
  
  // New generic TLDs - Legal & Professional Services
  'legal', 'law', 'lawyer', 'attorney', 'jurist', 'claims', 'insurance',
  'engineering', 'engineer', 'construction', 'builders', 'contractors',
  'plumbing', 'cleaning', 'repair', 'maintenance',
  
  // New generic TLDs - Miscellaneous
  'blog', 'news', 'press', 'media', 'tv', 'radio', 'guide', 'tips',
  'help', 'support', 'wiki', 'forum', 'chat', 'direct', 'express',
  'plus', 'today', 'now', 'new', 'best', 'top', 'cool', 'awesome',
  'expert', 'guru', 'ninja', 'pro', 'zone', 'center', 'city',
  
  // Country-code TLDs (ccTLDs) - Popular ones
  'us', 'uk', 'ca', 'au', 'de', 'fr', 'it', 'es', 'nl', 'be', 'ch',
  'at', 'se', 'no', 'dk', 'fi', 'ie', 'pt', 'gr', 'pl', 'cz', 'hu',
  'ro', 'bg', 'hr', 'si', 'sk', 'lt', 'lv', 'ee', 'is', 'lu', 'mt',
  'cy', 'nz', 'sg', 'hk', 'jp', 'kr', 'cn', 'tw', 'in', 'my', 'th',
  'ph', 'id', 'vn', 'ae', 'sa', 'il', 'tr', 'ru', 'ua', 'by', 'kz',
  'mx', 'br', 'ar', 'cl', 'co', 'pe', 'za',
  
  // Additional specialized TLDs
  'xyz', 'club', 'vip', 'link', 'click', 'bid', 'win', 'loan', 'trade',
  'date', 'download', 'racing', 'review', 'science', 'faith', 'cricket',
  'party', 'webcam', 'stream', 'accountants', 'apartments', 'attorney',
  'auction', 'band', 'bargains', 'bike', 'bingo', 'black', 'blue',
  'boats', 'build', 'cab', 'camera', 'camp', 'cards', 'careers',
  'cash', 'casino', 'catering', 'cheap', 'christmas', 'church',
  'claims', 'clothing', 'coach', 'coffee', 'cologne', 'condos',
  'cool', 'coupons', 'cruises', 'dance', 'deals', 'degree',
  'delivery', 'democrat', 'diamonds', 'diet', 'directory',
  'discount', 'dog', 'domains', 'energy', 'equipment', 'estate',
  'exchange', 'fail', 'farm', 'fish', 'fishing', 'flights',
  'florist', 'flowers', 'football', 'forsale', 'foundation',
  'furniture', 'futbol', 'fyi', 'gifts', 'gives', 'glass',
  'gold', 'golf', 'gratis', 'green', 'gripe', 'guitars',
  'haus', 'healthcare', 'hockey', 'holdings', 'holiday',
  'horse', 'ink', 'irish', 'jewelry', 'kaufen', 'kim',
  'kitchen', 'kiwi', 'land', 'lease', 'lighting', 'limited',
  'limo', 'loans', 'maison', 'management', 'market', 'mba',
  'memorial', 'moda', 'mortgage', 'movie', 'navy', 'network',
  'ninja', 'partners', 'parts', 'pet', 'pets', 'pink',
  'place', 'plumbing', 'poker', 'press', 'productions',
  'properties', 'pub', 'recipes', 'red', 'rehab', 'reise',
  'reisen', 'rent', 'rentals', 'repair', 'report', 'republican',
  'rest', 'reviews', 'rip', 'rocks', 'rodeo', 'run', 'sale',
  'sarl', 'school', 'schule', 'services', 'sexy', 'shiksha',
  'shoes', 'show', 'singles', 'ski', 'soccer', 'solar',
  'solutions', 'studio', 'style', 'supplies', 'supply',
  'surf', 'surgery', 'systems', 'tax', 'taxi', 'team',
  'tennis', 'theater', 'theatre', 'tienda', 'tips', 'tires',
  'tools', 'tours', 'town', 'toys', 'training', 'university',
  'vacations', 'ventures', 'vet', 'viajes', 'video', 'villas',
  'vision', 'voyage', 'watch', 'wine', 'works', 'wtf', 'yoga',
  'zone'
];

/**
 * Validates if a TLD is supported by Namecheap
 * @param tld - The TLD to validate (with or without leading dot)
 * @returns true if the TLD is supported, false otherwise
 */
export function isValidTLD(tld: string): boolean {
  // Remove leading dot if present and convert to lowercase
  const cleanTld = tld.startsWith('.') ? tld.slice(1).toLowerCase() : tld.toLowerCase();
  
  // Check if the TLD is in the supported list
  return SUPPORTED_TLDS.includes(cleanTld);
}

/**
 * Formats a TLD by ensuring it has a leading dot
 * @param tld - The TLD to format
 * @returns The formatted TLD with a leading dot
 */
export function formatTLD(tld: string): string {
  const cleanTld = tld.trim().toLowerCase();
  return cleanTld.startsWith('.') ? cleanTld : `.${cleanTld}`;
}

/**
 * Gets a list of suggested TLDs based on partial input
 * @param input - The partial TLD input
 * @param limit - Maximum number of suggestions to return (default: 5)
 * @returns Array of suggested TLDs with leading dots
 */
export function getSuggestedTLDs(input: string, limit: number = 5): string[] {
  const cleanInput = input.startsWith('.') ? input.slice(1).toLowerCase() : input.toLowerCase();
  
  if (!cleanInput) {
    return [];
  }
  
  return SUPPORTED_TLDS
    .filter(tld => tld.startsWith(cleanInput))
    .slice(0, limit)
    .map(tld => `.${tld}`);
}

/**
 * Gets the total count of supported TLDs
 * @returns The number of supported TLDs
 */
export function getSupportedTLDCount(): number {
  return SUPPORTED_TLDS.length;
}

