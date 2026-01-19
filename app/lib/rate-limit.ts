import { LRUCache } from "lru-cache";

type RateLimitOptions = {
  interval: number;
  maxRequests: number;
};

export function rateLimit(options: RateLimitOptions) {
  const cache = new LRUCache<string, number[]>({
    max: 500,
    ttl: options.interval,
  });

  return {
    check: (key: string): { success: boolean; remaining: number } => {
      const now = Date.now();
      const windowStart = now - options.interval;

      const requests = cache.get(key) || [];
      const recentRequests = requests.filter((time) => time > windowStart);

      if (recentRequests.length >= options.maxRequests) {
        return { success: false, remaining: 0 };
      }

      recentRequests.push(now);
      cache.set(key, recentRequests);

      return {
        success: true,
        remaining: options.maxRequests - recentRequests.length,
      };
    },
  };
}
