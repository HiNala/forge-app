# Rate Limiting Patterns — Reference for Forge

**Version:** N/A
**Last researched:** 2026-04-19

## Forge Rate Limits

| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| Public submission (`/p/{slug}/submit`) | 10 | 1min | IP |
| Public analytics (`/p/{slug}/track`) | 100 | 1min | IP |
| Auth'd API | 200 | 1min | User ID |
| Team invite | 10 | 1min | User ID |
| Studio generate | 5 | 1min | User ID |
| Auth endpoints | 10 | 1min | IP |

## Redis Sliding Window Implementation

```python
import time
import redis.asyncio as redis

async def is_rate_limited(
    redis_client: redis.Redis,
    key: str,
    limit: int,
    window: int,
) -> bool:
    """Sliding window rate limiter using Redis sorted sets."""
    now = time.time()
    pipeline = redis_client.pipeline()

    # Remove old entries
    pipeline.zremrangebyscore(key, 0, now - window)
    # Add current request
    pipeline.zadd(key, {str(now): now})
    # Count requests in window
    pipeline.zcard(key)
    # Set TTL on the key
    pipeline.expire(key, window)

    results = await pipeline.execute()
    request_count = results[2]

    return request_count > limit
```

## Simple Counter (Current Implementation)

```python
async def check_rate_limit(key: str, limit: int, window: int) -> bool:
    """Simple counter-based rate limiter."""
    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, window)
    return count <= limit
```

## Response Headers

```python
# Always return rate limit headers
response.headers["X-RateLimit-Limit"] = str(limit)
response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window)
```

## Known Pitfalls

1. **IP behind proxy**: Use `X-Forwarded-For` header, but validate it.
2. **Exempt internal traffic**: Don't rate-limit health checks and internal service calls.
3. **429 response**: Always return `Retry-After` header with 429 status.

## Links
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Redis Rate Limiting](https://redis.io/commands/incr#pattern-rate-limiter)
