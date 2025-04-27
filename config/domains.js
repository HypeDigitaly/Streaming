// Shared whitelist of domains for all API providers
export const whitelistedDomains = [
  'icuk.cz',
  'kr-ustecky.cz',
  'kr-vysocina.cz',
  'setrivodou.cz',
  'healthytwenty.cz',
  'barber-mnb.cz',
  'teplice.cz',
  'hypedigitaly.ai',
  'litomerice.cz',
  'khk.cz'
];

// Helper function to check if a domain is whitelisted
export function isDomainWhitelisted(origin) {
  if (!origin) return false;
  
  try {
    const hostname = new URL(origin).hostname.replace(/^www\./, '');
    return whitelistedDomains.includes(hostname);
  } catch (error) {
    console.error('Error checking domain whitelist:', error);
    return false;
  }
} 