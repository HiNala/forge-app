# Redis 7 — Reference for Forge

**Version:** 7.x
**Last researched:** 2026-04-19

## What Forge Uses

Redis for: arq job queue, rate limiting counters, response caching, SSE session state, prompt caching. All through the `redis` Python async client.

## Data Structures We Use

| Use Case | Redis Type | Key Pattern | TTL |
|----------|-----------|-------------|-----|
| Rate limiting | String + INCR | `rate:{ip}:{path}` | 60s |
| Response cache | String (JSON) | `cache:pages:{org}:{page}` | 5min |
| Prompt cache | String (JSON) | `prompt:{hash}` | 30min |
| arq job queue | List + Hash | Managed by arq | N/A |
| Unread counts | String (INT) | `unread:{org}:{page}` | None |

## Python Client Setup

```python
# app/services/cache.py
import redis.asyncio as redis
from app.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

# Rate limiting
async def check_rate_limit(key: str, limit: int, window: int) -> bool:
    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, window)
    return count <= limit

# Response caching
async def get_cached(key: str) -> str | None:
    return await redis_client.get(key)

async def set_cached(key: str, value: str, ttl: int = 300):
    await redis_client.setex(key, ttl, value)

async def invalidate_cache(pattern: str):
    async for key in redis_client.scan_iter(match=pattern):
        await redis_client.delete(key)
```

## Docker Compose

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 3s
    retries: 5
  volumes:
    - redis-data:/data
```

## Known Pitfalls

1. **`decode_responses=True`**: Without this, you get bytes instead of strings.
2. **Memory policy**: Set `allkeys-lru` to evict least-recently-used keys when memory is full.
3. **No persistence in dev**: For dev, Redis data loss on restart is fine.
4. **Connection pooling**: `redis.from_url()` creates a connection pool automatically.

## Links
- [Redis Docs](https://redis.io/docs/)
- [redis-py Async](https://redis-py.readthedocs.io/en/stable/examples/asyncio_examples.html)
