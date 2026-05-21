import hashlib
from dataclasses import dataclass

from django.core.cache import cache
from django.utils import timezone


@dataclass
class RateLimitResult:
    allowed: bool
    retry_after_seconds: int = 0


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _cache_key(scope, identity):
    digest = hashlib.sha256(str(identity).encode("utf-8")).hexdigest()
    return f"rate-limit:{scope}:{digest}"


def check_rate_limit(scope, identity, limit, window_seconds):
    now = int(timezone.now().timestamp())
    key = _cache_key(scope, identity)
    item = cache.get(key)

    if not item or now >= item.get("reset_at", 0):
        cache.set(key, {"count": 1, "reset_at": now + window_seconds}, timeout=window_seconds)
        return RateLimitResult(allowed=True)

    if item["count"] >= limit:
        return RateLimitResult(
            allowed=False,
            retry_after_seconds=max(1, item["reset_at"] - now),
        )

    item["count"] += 1
    cache.set(key, item, timeout=max(1, item["reset_at"] - now))
    return RateLimitResult(allowed=True)
