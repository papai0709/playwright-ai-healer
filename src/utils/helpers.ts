import crypto from 'crypto';

/**
 * Generate a unique ID for a selector
 */
export function generateSelectorId(selector: string, pageUrl: string): string {
  const hash = crypto
    .createHash('md5')
    .update(`${selector}:${pageUrl}`)
    .digest('hex');
  return hash.substring(0, 16);
}

/**
 * Wait for a specified duration
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await wait(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Sanitize selector for display
 */
export function sanitizeSelector(selector: string): string {
  return selector.length > 100 ? selector.substring(0, 97) + '...' : selector;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Format timestamp to readable string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Calculate confidence score based on multiple factors
 */
export function calculateConfidence(factors: {
  selectorComplexity: number; // 0-1, lower is better
  matchUniqueness: number; // 0-1, higher is better
  historicalSuccess: number; // 0-1, higher is better
}): number {
  const weights = {
    complexity: 0.3,
    uniqueness: 0.4,
    history: 0.3,
  };

  return (
    (1 - factors.selectorComplexity) * weights.complexity +
    factors.matchUniqueness * weights.uniqueness +
    factors.historicalSuccess * weights.history
  );
}

/**
 * Check if selector is likely to be stable
 */
export function isSelectorStable(selector: string): boolean {
  // Selectors using IDs or data-testid are generally more stable
  const stablePatterns = [
    /\[data-testid/,
    /\[data-test/,
    /\[aria-label/,
    /\[role=/,
    /#[\w-]+\b/, // ID selectors
  ];

  // Selectors using positions or fragile classes are less stable
  const unstablePatterns = [
    /:nth-child/,
    /:nth-of-type/,
    /\[class\*=/,
    /\[style/,
  ];

  const hasStable = stablePatterns.some((pattern) => pattern.test(selector));
  const hasUnstable = unstablePatterns.some((pattern) => pattern.test(selector));

  return hasStable && !hasUnstable;
}
