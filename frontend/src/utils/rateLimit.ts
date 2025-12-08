/**
 * Utility functions for handling rate limit errors
 */

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
  resetTime: Date;
  secondsUntilReset: number;
}

/**
 * Parse rate limit headers from response
 * Supports both standard headers (RateLimit-*) and legacy headers (X-RateLimit-*)
 */
export function parseRateLimitHeaders(headers: Record<string, string>): RateLimitInfo | null {
  // Try standard headers first (RateLimit-*)
  const limit = 
    headers['ratelimit-limit'] ?? 
    headers['RateLimit-Limit'] ?? 
    headers['x-ratelimit-limit'] ?? 
    headers['X-RateLimit-Limit'];
  
  const remaining = 
    headers['ratelimit-remaining'] ?? 
    headers['RateLimit-Remaining'] ?? 
    headers['x-ratelimit-remaining'] ?? 
    headers['X-RateLimit-Remaining'];
  
  const reset = 
    headers['ratelimit-reset'] ?? 
    headers['RateLimit-Reset'] ?? 
    headers['x-ratelimit-reset'] ?? 
    headers['X-RateLimit-Reset'];

  if (!limit || !remaining || !reset) {
    return null;
  }

  const limitNum = parseInt(limit, 10);
  const remainingNum = parseInt(remaining, 10);
  const resetNum = parseInt(reset, 10);

  if (isNaN(limitNum) || isNaN(remainingNum) || isNaN(resetNum)) {
    return null;
  }

  // Reset can be either Unix timestamp (seconds) or seconds until reset
  // If it's a small number (< 1000000000), it's likely seconds until reset
  // Otherwise, it's a Unix timestamp
  const resetTimestamp = resetNum < 1000000000 
    ? Math.floor(Date.now() / 1000) + resetNum 
    : resetNum;
  
  const resetTime = new Date(resetTimestamp * 1000);
  const secondsUntilReset = Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 1000));

  return {
    limit: limitNum,
    remaining: remainingNum,
    reset: resetTimestamp,
    resetTime,
    secondsUntilReset,
  };
}

/**
 * Format seconds into a human-readable string
 */
export function formatTimeUntilReset(seconds: number): string {
  if (seconds <= 0) {
    return 'ngay bây giờ';
  }

  if (seconds < 60) {
    return `${seconds} giây`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes} phút`;
    }
    return `${minutes} phút ${remainingSeconds} giây`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} giờ`;
  }
  return `${hours} giờ ${remainingMinutes} phút`;
}

/**
 * Generate user-friendly rate limit error message
 */
export function getRateLimitMessage(rateLimitInfo: RateLimitInfo | null): string {
  if (!rateLimitInfo) {
    return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.';
  }

  const timeUntilReset = formatTimeUntilReset(rateLimitInfo.secondsUntilReset);
  
  return `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${timeUntilReset}.`;
}

