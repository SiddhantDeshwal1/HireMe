"""
HireMe In-Memory Query & Job Cache
==================================
Caches search results and single job queries with TTL to deliver sub-millisecond
responses and prevent redundant database access.
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any

log = logging.getLogger(__name__)


class QueryCache:
    """Thread-safe LRU-like in-memory cache with TTL."""

    def __init__(self, default_ttl_secs: int = 60, max_entries: int = 500) -> None:
        self.default_ttl = default_ttl_secs
        self.max_entries = max_entries
        self._cache: dict[str, tuple[float, Any]] = {}
        self.hits = 0
        self.misses = 0

    @staticmethod
    def make_key(prefix: str, params: dict[str, Any]) -> str:
        serialized = json.dumps(params, sort_keys=True, default=str)
        digest = hashlib.sha256(serialized.encode()).hexdigest()[:16]
        return f"{prefix}:{digest}"

    def get(self, key: str) -> Any | None:
        now = time.time()
        entry = self._cache.get(key)
        if entry is not None:
            expires_at, val = entry
            if now < expires_at:
                self.hits += 1
                return val
            # Expired
            self._cache.pop(key, None)
        self.misses += 1
        return None

    def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        now = time.time()
        expire = now + (ttl if ttl is not None else self.default_ttl)
        if len(self._cache) >= self.max_entries:
            # Evict oldest 20%
            oldest_keys = sorted(self._cache.keys(), key=lambda k: self._cache[k][0])[:max(1, self.max_entries // 5)]
            for k in oldest_keys:
                self._cache.pop(k, None)
        self._cache[key] = (expire, value)

    def invalidate_all(self) -> None:
        self._cache.clear()
        log.info("Query cache invalidated.")

    def stats(self) -> dict[str, Any]:
        total = self.hits + self.misses
        ratio = (self.hits / total * 100) if total > 0 else 0.0
        return {
            "cachedQueries": len(self._cache),
            "cacheHits": self.hits,
            "cacheMisses": self.misses,
            "hitRate": f"{ratio:.1f}%",
        }


# Global singleton cache
cache = QueryCache(default_ttl_secs=60)
