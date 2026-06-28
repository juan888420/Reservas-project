import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

function createRatelimit(maxRequests: number, windowMs: number) {
  if (
    process.env.NODE_ENV === "development" ||
    !process.env.UPSTASH_REDIS_REST_URL
  ) {
  return {
    limit: async () => ({ success: true }),
  } as unknown as Ratelimit;
  }

  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
    analytics: true,
    prefix: "medireserva",
  });
}

export const citasRatelimit = createRatelimit(5, 60_000);
export const captureRatelimit = createRatelimit(3, 60_000);
