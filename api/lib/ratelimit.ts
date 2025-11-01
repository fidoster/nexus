/**
 * Rate Limiting Utility using Upstash Redis
 * Prevents abuse by limiting requests per user/IP
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
// IMPORTANT: Set these environment variables in Vercel Dashboard:
// - UPSTASH_REDIS_REST_URL
// - UPSTASH_REDIS_REST_TOKEN
//
// Get free Redis instance at: https://upstash.com/
const redis =  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Create rate limiters for different endpoints
// AI Generation: More restrictive (costly API calls)
export const aiRateLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'), // 5 requests per minute
  analytics: true,
  prefix: 'ratelimit:ai',
}) : null;

// General API: Less restrictive
export const generalRateLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '60 s'), // 30 requests per minute
  analytics: true,
  prefix: 'ratelimit:api',
}) : null;

// Auth endpoints: Prevent brute force
export const authRateLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'), // 10 requests per minute
  analytics: true,
  prefix: 'ratelimit:auth',
}) : null;

/**
 * Get rate limit identifier from request
 * Uses user ID if authenticated, otherwise IP address
 */
export function getRateLimitIdentifier(req: any): string {
  // Try to get user ID from headers (if using Supabase Auth)
  const userId = req.headers['x-user-id'];
  if (userId) return `user:${userId}`;

  // Fall back to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0]) : req.socket?.remoteAddress;

  return `ip:${ip || 'unknown'}`;
}

/**
 * Check rate limit and return appropriate response
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number } | null> {
  if (!limiter) {
    // If Redis is not configured, allow all requests (for development)
    console.warn('⚠️ Rate limiting not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in environment variables.');
    return { success: true, limit: 999, remaining: 999, reset: 0 };
  }

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow the request (fail open)
    return { success: true, limit: 999, remaining: 999, reset: 0 };
  }
}
