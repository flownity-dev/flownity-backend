/**
 * Token verification caching layer
 * Provides memory-based caching with TTL support and automatic cleanup
 */

import { createHash } from 'crypto';
import type { VerifiedUser, CacheEntry } from './types.js';
import { loadTokenVerificationConfig } from './config.js';

/**
 * Memory-based token cache with TTL support and automatic cleanup
 */
export class TokenCache {
    private static cache = new Map<string, CacheEntry>();
    private static cleanupInterval: NodeJS.Timeout | null = null;
    private static readonly CLEANUP_INTERVAL_MS = 60000; // 1 minute
    private static config = loadTokenVerificationConfig();

    /**
     * Get cached verification result for a token
     * @param token - The token to look up
     * @returns VerifiedUser if cached and not expired, null otherwise
     */
    static get(token: string): VerifiedUser | null {
        const key = this.generateCacheKey(token);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if entry has expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.user;
    }

    /**
     * Cache a verification result for a token
     * @param token - The token to cache
     * @param user - The verified user information
     * @param ttl - Time to live in seconds
     */
    static set(token: string, user: VerifiedUser, ttl: number): void {
        const key = this.generateCacheKey(token);
        const now = Date.now();

        // Check if cache is at max size and remove oldest entry if needed
        if (this.cache.size >= this.config.maxCacheSize) {
            this.evictOldestEntry();
        }

        const entry: CacheEntry = {
            user,
            timestamp: now,
            expiresAt: now + (ttl * 1000) // Convert seconds to milliseconds
        };

        this.cache.set(key, entry);

        // Start cleanup interval if not already running
        this.startCleanupInterval();
    }

    /**
     * Clear all cached entries
     */
    static clear(): void {
        this.cache.clear();
        this.stopCleanupInterval();
    }

    /**
     * Get cache statistics
     * @returns Object with cache size and expired entries count
     */
    static getStats(): { size: number; expiredCount: number } {
        const now = Date.now();
        let expiredCount = 0;

        for (const entry of this.cache.values()) {
            if (now > entry.expiresAt) {
                expiredCount++;
            }
        }

        return {
            size: this.cache.size,
            expiredCount
        };
    }

    /**
     * Generate a secure cache key from a token using SHA-256 hashing
     * @param token - The token to hash
     * @returns Hashed cache key
     */
    private static generateCacheKey(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    /**
     * Start the automatic cleanup interval
     */
    private static startCleanupInterval(): void {
        if (this.cleanupInterval) {
            return; // Already running
        }

        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.CLEANUP_INTERVAL_MS);

        // Ensure cleanup interval doesn't prevent process exit
        this.cleanupInterval.unref();
    }

    /**
     * Stop the automatic cleanup interval
     */
    private static stopCleanupInterval(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Remove expired entries from the cache
     */
    private static cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        // Collect expired keys
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                keysToDelete.push(key);
            }
        }

        // Delete expired entries
        for (const key of keysToDelete) {
            this.cache.delete(key);
        }

        // Stop cleanup interval if cache is empty
        if (this.cache.size === 0) {
            this.stopCleanupInterval();
        }
    }

    /**
     * Force cleanup of expired entries
     * Useful for testing or manual cache maintenance
     */
    static forceCleanup(): void {
        this.cleanup();
    }

    /**
     * Evict the oldest entry from the cache when max size is reached
     */
    private static evictOldestEntry(): void {
        let oldestKey: string | null = null;
        let oldestTimestamp = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Update configuration (useful for testing or runtime configuration changes)
     */
    static updateConfig(): void {
        this.config = loadTokenVerificationConfig();
    }
}