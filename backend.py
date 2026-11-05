import asyncio
from collections import OrderedDict
import base64
import hashlib
import io
import json
import logging
import os
import threading
import time
import uuid
from contextlib import asynccontextmanager
from functools import lru_cache
from typing import Any, Literal

try:
    import redis.asyncio as aioredis
    _REDIS_AVAILABLE = True
except ImportError:
    aioredis = None
    _REDIS_AVAILABLE = False

import cv2 as cv
import modal
import numpy as np
import pydantic
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image
from supabase import AsyncClient, acreate_client

from backend_settings import (
    APPROVED_CACHE_TTL, CACHE_MAX_BYTES, CACHE_MAX_ENTRY_BYTES, DB_MAX_CONCURRENCY,
    EMBEDDING_CACHE_TTL, MAX_IMAGE_DIMENSION, MAX_IMAGE_PIXELS, MAX_UPLOAD_BYTES,
    PENDING_CACHE_TTL, SEARCH_RATE_LIMIT, SEARCH_RATE_WINDOW, SKIN_RATE_LIMIT,
    SKIN_RATE_WINDOW, TOKEN_CACHE_TTL, TRYON_RATE_LIMIT, TRYON_RATE_WINDOW,
    USERNAME_RATE_LIMIT, USERNAME_RATE_WINDOW,
)
from recommendation.skin_recom import rank_clothes

load_dotenv()

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("weave.backend")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")

supabase_async: AsyncClient | None = None
_supabase_lock = asyncio.Lock()

APP_NAME = os.environ.get("MODAL_APP_NAME", "vton-service")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ITEM_PUBLIC_FIELDS = "id, cloth_name, category, image_url, gender"

_default_origins = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "https://weave-curator.vercel.app"
)
_allowed_origins = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]
_default_origin_regex = r"https://weave-curator(?:-[a-z0-9-]+)?\.vercel\.app"
_allowed_origin_regex = os.environ.get("ALLOWED_ORIGIN_REGEX", _default_origin_regex).strip() or None

_bearer = HTTPBearer(auto_error=False)



_db_semaphore = asyncio.Semaphore(DB_MAX_CONCURRENCY)
_inflight = {}

def singleflight(key_func):
    def decorate(func):
        from functools import wraps
        @wraps(func)
        async def wrapped(*args, **kwargs):
            key = (func.__name__, key_func(*args, **kwargs))
            task = _inflight.get(key)
            if task is None:
                task = asyncio.create_task(func(*args, **kwargs))
                _inflight[key] = task
                def done(completed):
                    _inflight.pop(key, None)
                    if not completed.cancelled():
                        completed.exception()
                task.add_done_callback(done)
            return await asyncio.shield(task)
        return wrapped
    return decorate

async def _execute(query):
    async with _db_semaphore:
        return await query.execute()

async def get_supabase() -> AsyncClient:
    global supabase_async
    if supabase_async is None:
        async with _supabase_lock:
            if supabase_async is None:
                supabase_async = await acreate_client(
                    SUPABASE_URL,
                    SUPABASE_SERVICE_ROLE_KEY,
                )
    return supabase_async


class CacheManager:
    """
    Hybrid distributed cache with graceful in-memory fallback.
    Connects to Redis (e.g. Upstash or local) if REDIS_URL is provided;
    otherwise seamlessly uses an in-memory dictionary with thread safety and TTL.
    """

    def __init__(self):
        self._redis = None
        self._memory = OrderedDict()
        self._sizes = {}
        self._bytes = 0
        self._max_bytes = CACHE_MAX_BYTES
        self._max_entry = CACHE_MAX_ENTRY_BYTES
        self._lock = threading.Lock()
        self._init_lock = asyncio.Lock()
        self._redis_url = os.environ.get("REDIS_URL")
        self._redis_disabled = False
        self._next_retry = 0.0

    @property
    def redis_configured(self) -> bool:
        return bool(self._redis_url and _REDIS_AVAILABLE)

    async def _connect(self) -> None:
        if self._redis or self._redis_disabled:
            return
        if not self._redis_url or not _REDIS_AVAILABLE:
            self._redis_disabled = True
            if self._redis_url and not _REDIS_AVAILABLE:
                logger.warning("REDIS_URL is set but the redis package is unavailable; using in-memory cache.")
            return
        if time.monotonic() < self._next_retry:
            return

        async with self._init_lock:
            if self._redis or self._redis_disabled:
                return
            if time.monotonic() < self._next_retry:
                return

            client = None
            try:
                client = aioredis.from_url(
                    self._redis_url,
                    decode_responses=True,
                    socket_timeout=2.0,
                    socket_connect_timeout=2.0,
                )
                await client.ping()
            except Exception as exc:
                self._next_retry = time.monotonic() + 5.0
                logger.warning("Redis connection failed (%s); using memory cache and retrying later.", type(exc).__name__)
                if client is not None:
                    try:
                        await client.aclose()
                    except Exception:
                        pass
                return

            self._redis = client
            self._next_retry = 0.0
            logger.info("Connected to Redis.")

    async def _drop_redis(self) -> None:
        client, self._redis = self._redis, None
        self._next_retry = time.monotonic() + 5.0
        if client is not None:
            try:
                await client.aclose()
            except Exception:
                pass

    async def init(self) -> None:
        await self._connect()

    async def get(self, key: str) -> Any | None:
        await self._connect()
        if self._redis:
            try:
                raw = await self._redis.get(key)
                if raw is not None:
                    try:
                        return json.loads(raw)
                    except (json.JSONDecodeError, TypeError):
                        return raw
                with self._lock:
                    self._remove(key)
                return None
            except Exception as exc:
                logger.warning("Redis GET failed (%s); falling back to memory.", type(exc).__name__)
                await self._drop_redis()

        now = time.monotonic()
        with self._lock:
            val = self._memory.get(key)
            if val and val[0] > now:
                self._memory.move_to_end(key)
                return val[1]
            self._remove(key)
        return None

    def _remove(self, key):
        self._memory.pop(key, None)
        self._bytes -= self._sizes.pop(key, 0)

    def _store(self, key, value, expires):
        self._remove(key)
        size = len(key.encode()) + len(json.dumps(value).encode()) * 4 + 256
        if size > self._max_entry or size > self._max_bytes:
            return False
        now = time.monotonic()
        for stale in [k for k, v in self._memory.items() if v[0] <= now]:
            self._remove(stale)
        while self._memory and (len(self._memory) >= 4096 or self._bytes + size > self._max_bytes):
            self._remove(next(iter(self._memory)))
        self._memory[key] = (expires, value)
        self._sizes[key] = size
        self._bytes += size
        return True

    async def set(self, key: str, value: Any, ttl_seconds: int = 60) -> bool:
        await self._connect()
        serialized = json.dumps(value) if not isinstance(value, str) else value
        if self._redis:
            try:
                await self._redis.set(key, serialized, ex=ttl_seconds)
                with self._lock:
                    self._remove(key)
                return True
            except Exception:
                await self._drop_redis()
        with self._lock:
            return self._store(key, value, time.monotonic() + ttl_seconds)

    async def delete(self, key: str) -> bool:
        await self._connect()
        if self._redis:
            try:
                await self._redis.delete(key)
            except Exception as exc:
                logger.warning("Redis DELETE failed (%s); falling back to memory.", type(exc).__name__)
                await self._drop_redis()
        with self._lock:
            self._remove(key)
        return True

    async def get_or_create_generation(self, key: str) -> str:
        await self._connect()
        candidate = uuid.uuid4().hex
        if self._redis:
            try:
                if await self._redis.set(key, candidate, ex=86400, nx=True):
                    return candidate
                current = await self._redis.get(key)
                return current or candidate
            except Exception:
                await self._drop_redis()
        with self._lock:
            entry = self._memory.get(key)
            now = time.monotonic()
            if entry and entry[0] > now:
                self._memory.move_to_end(key)
                return entry[1]
            self._store(key, candidate, now + 86400)
            return candidate

    async def incr(self, key: str, ttl_seconds: int) -> int:
        await self._connect()
        if self._redis:
            try:
                count = await self._redis.eval("local n=redis.call('INCR',KEYS[1]); if redis.call('TTL',KEYS[1])<0 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", 1, key, ttl_seconds)
                return int(count)
            except Exception as exc:
                logger.warning("Redis INCR failed (%s); falling back to memory.", type(exc).__name__)
                await self._drop_redis()

        now = time.monotonic()
        with self._lock:
            val = self._memory.get(key)
            if val and val[0] > now:
                count = int(val[1]) + 1
                self._store(key, count, val[0])
            else:
                count = 1
                self._store(key, count, now + ttl_seconds)
            return count

    async def ping(self) -> bool:
        await self._connect()
        if self._redis:
            try:
                await self._redis.ping()
                return True
            except Exception as exc:
                logger.warning("Redis PING failed (%s).", type(exc).__name__)
                await self._drop_redis()
                return False
        return not self.redis_configured

    async def close(self) -> None:
        client, self._redis = self._redis, None
        self._redis_disabled = True
        if client is not None:
            try:
                await client.aclose()
            except Exception:
                pass
        with self._lock:
            self._memory.clear()
            self._sizes.clear()
            self._bytes = 0


cache = CacheManager()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await cache.init()
    try:
        await get_supabase()
    except Exception:
        logger.exception("Supabase client initialization failed.")
        raise
    logger.info("Weave API started.")
    try:
        yield
    finally:
        await cache.close()


class SelectiveGZipMiddleware:
    def __init__(self, app, minimum_size: int = 1024, excluded_paths: tuple[str, ...] = ()):
        self.app = app
        self.gzip = GZipMiddleware(app, minimum_size=minimum_size)
        self.excluded_paths = tuple(excluded_paths)

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and not any(
            scope["path"].startswith(path) for path in self.excluded_paths
        ):
            await self.gzip(scope, receive, send)
        else:
            await self.app(scope, receive, send)


app = FastAPI(
    title="Weave API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=_allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After"],
    max_age=600,
)
app.add_middleware(SelectiveGZipMiddleware, minimum_size=1024, excluded_paths=("/tryon",))


def _modal_class(name: str):
    return modal.Cls.from_name(APP_NAME, name)


@lru_cache(maxsize=None)
def _cached_modal_class(name: str):
    return _modal_class(name)


async def get_current_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    cache_key = f"auth:token:{hashlib.sha256(token.encode('utf-8')).hexdigest()}"
    cached_claims = await cache.get(cache_key)
    if cached_claims and isinstance(cached_claims, dict):
        return cached_claims

    try:
        db = await get_supabase()
        response = await db.auth.get_user(token)
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = getattr(response, "user", None)
    user_id = getattr(user, "id", None)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    metadata = getattr(user, "user_metadata", None) or {}
    claims = {
        "id": str(user_id),
        "email": getattr(user, "email", None),
        "name": metadata.get("full_name") or metadata.get("name"),
    }

    await cache.set(cache_key, claims, ttl_seconds=TOKEN_CACHE_TTL)
    return claims


async def get_current_user(claims: dict = Depends(get_current_claims)) -> str:
    return claims["id"]


def _approval_ttl(approved: bool) -> int:
    return APPROVED_CACHE_TTL if approved else PENDING_CACHE_TTL


async def _cache_approval(user_id: str, approved: bool) -> None:
    await cache.set(f"auth:approved:{user_id}", bool(approved), ttl_seconds=_approval_ttl(approved))


async def _is_approved_async(user_id: str) -> bool:
    cache_key = f"auth:approved:{user_id}"
    cached = await cache.get(cache_key)
    if cached is not None:
        return bool(cached)

    try:
        db = await get_supabase()
        response = (
            await _execute(db.table("profiles")
            .select("is_approved")
            .eq("user_id", user_id)
            .limit(1))
        )
    except Exception as exc:
        logger.warning("Approval lookup failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Approval check unavailable.") from exc

    approved = bool(response.data and response.data[0].get("is_approved"))
    await _cache_approval(user_id, approved)
    return approved


async def get_approved_user(claims: dict = Depends(get_current_claims)) -> str:
    if not await _is_approved_async(claims["id"]):
        raise HTTPException(status_code=403, detail="Account pending approval.")
    return claims["id"]


async def get_approved_claims(claims: dict = Depends(get_current_claims)) -> dict:
    if not await _is_approved_async(claims["id"]):
        raise HTTPException(status_code=403, detail="Account pending approval.")
    return claims


async def _enforce_rate_limit(bucket: str, identity: str, limit: int, window_seconds: int) -> None:
    count = await cache.incr(f"ratelimit:{bucket}:{identity}", window_seconds)
    if count > limit:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please retry shortly.",
            headers={"Retry-After": str(window_seconds)},
        )


def _validate_image_bytes(data: bytes) -> None:
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload.")
    try:
        with Image.open(io.BytesIO(data)) as probe:
            width, height = probe.size
            if width <= 0 or height <= 0:
                raise ValueError("invalid dimensions")
            if width * height > MAX_IMAGE_PIXELS or max(width, height) > MAX_IMAGE_DIMENSION:
                raise HTTPException(status_code=400, detail="Image dimensions exceed the allowed limit.")
            probe.verify()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Unsupported or corrupt image.") from exc

    image = cv.imdecode(np.frombuffer(data, np.uint8), cv.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Unsupported or corrupt image.")


async def _read_image(img: UploadFile) -> bytes:
    if img.content_type and img.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG and WebP images are accepted.")

    data = await img.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the upload limit.")

    await asyncio.to_thread(_validate_image_bytes, data)
    return data


def _spawn_modal_warmup() -> None:
    failed = []
    for name in ("SkinAnalyzer", "FashionAnalyzer", "VTONRunner"):
        try:
            _cached_modal_class(name)().warmup.spawn()
        except Exception as exc:
            logger.warning("Modal warmup dispatch failed for %s (%s).", name, type(exc).__name__)
            failed.append(name)
    if failed:
        raise RuntimeError("Modal warmup dispatch failed: " + ", ".join(failed))


async def _resolve_cloth_name(cloth_id: str) -> str | None:
    cache_key = f"cloth:name:{cloth_id}"
    cached = await cache.get(cache_key)
    if isinstance(cached, dict) and "name" in cached:
        return cached["name"]

    db = await get_supabase()
    response = (
        await _execute(db.table("fashion_items")
        .select("cloth_name")
        .eq("id", cloth_id)
        .limit(1))
    )
    if not response.data:
        await cache.set(cache_key, {"name": None}, ttl_seconds=300)
        return None

    row = response.data[0]
    name = str(row.get("cloth_name") or cloth_id)
    await cache.set(cache_key, {"name": name}, ttl_seconds=3600)
    return name


async def _fetch_item_vectors(item_ids: list[int]) -> list[dict]:
    db = await get_supabase()
    chunks = [item_ids[index : index + 150] for index in range(0, len(item_ids), 150)]
    if not chunks:
        return []


    async def fetch(chunk: list[int]) -> list[dict]:
        response = (
            await _execute(db.table("fashion_items")
            .select("id, vector_features")
            .in_("id", chunk))
        )
        return response.data or []

    results = await asyncio.gather(*(fetch(chunk) for chunk in chunks))
    return [row for rows in results for row in rows]


async def _filter_gender_ids(found_ids: list[str], genders: list[str]) -> set[str]:
    db = await get_supabase()
    chunks = [found_ids[index : index + 200] for index in range(0, len(found_ids), 200)]
    if not chunks:
        return set()


    async def fetch(chunk: list[str]) -> list[dict]:
        response = (
            await _execute(db.table("fashion_items")
            .select("id")
            .in_("id", chunk)
            .in_("gender", genders))
        )
        return response.data or []

    results = await asyncio.gather(*(fetch(chunk) for chunk in chunks))
    return {str(row["id"]) for rows in results for row in rows}


@singleflight(lambda gender_pref: tuple(gender_pref or []))
async def _fetch_inventory(gender_pref: list[str] | None) -> list[dict]:
    db = await get_supabase()
    rows: list[dict] = []
    start = 0
    page_size = 1000

    while True:
        query = db.table("fashion_items").select("id, lab_value", count="exact" if start == 0 else None)
        if gender_pref:
            query = query.in_("gender", gender_pref)
        response = await _execute(query.order("id").range(start, start + page_size - 1))
        batch = response.data or []
        if not batch:
            break
        rows.extend(batch)
        if start == 0:
            total = response.count
        if total is not None and len(rows) >= total:
            break
        start += len(batch)

    return rows


async def _fetch_rpc_pages(
    name: str,
    params: dict,
    *,
    max_rows: int | None = None,
    page_size: int = 1000,
) -> list[dict]:
    db = await get_supabase()
    rows: list[dict] = []
    start = 0
    limit = max_rows if max_rows is not None else page_size

    while True:
        size = min(page_size, limit - len(rows)) if max_rows is not None else page_size
        if size <= 0:
            break
        response = await _execute(db.rpc(name, params, count="exact" if start == 0 else None).range(start, start + size - 1))
        batch = response.data or []
        if isinstance(batch, dict):
            rows.append(batch)
            break
        if not isinstance(batch, list) or not batch:
            break
        rows.extend(batch)
        if start == 0:
            total = response.count
        if total is not None and len(rows) >= total:
            break
        start += len(batch)

    return rows


async def _fetch_text_matches(
    text_vector: list[float],
    threshold: float,
    max_rows: int,
) -> list[dict]:
    return await _fetch_rpc_pages(
        "match_clothes_by_text",
        {"query_embedding": text_vector, "match_threshold": threshold},
        max_rows=max_rows,
    )


@singleflight(lambda prompt: prompt)
async def _embed_text(prompt: str) -> list[float]:
    prompt_hash = hashlib.sha256(prompt.strip().encode("utf-8")).hexdigest()
    cache_key = f"embedding:text:{prompt_hash}"
    cached = await cache.get(cache_key)
    if cached and isinstance(cached, list):
        return cached

    analyzer = _cached_modal_class("FashionAnalyzer")()
    result = await analyzer.get_features.remote.aio(prompt)
    features = result.get("text_features") or []
    vector = features[0] if features and isinstance(features[0], list) else features
    if not vector:
        raise ValueError("Embedding service returned no features.")

    await cache.set(cache_key, vector, ttl_seconds=EMBEDDING_CACHE_TTL)
    return vector


class PreferencesRequest(pydantic.BaseModel):
    liked_clothes: list[int] = pydantic.Field(default_factory=list, max_length=2000)
    disliked_clothes: list[int] = pydantic.Field(default_factory=list, max_length=2000)


class TextSearchRequest(pydantic.BaseModel):
    gender_filter: list[Literal["male", "female", "unisex"]] | None = pydantic.Field(
        default=None, max_length=3
    )
    color: str | None = pydantic.Field(default=None, max_length=64)
    neck_style: str | None = pydantic.Field(default=None, max_length=64)
    occasion: str | None = pydantic.Field(default=None, max_length=64)
    sleeve_length: str | None = pydantic.Field(default=None, max_length=64)
    sub_category: str | None = pydantic.Field(default=None, max_length=64)
    additional_input: str | None = pydantic.Field(default=None, max_length=256)
    limit: int = pydantic.Field(default=40, ge=1, le=100)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/ready")
async def readiness() -> JSONResponse:
    database_ok = False
    try:
        db = await get_supabase()
        await asyncio.wait_for(
            _execute(db.table("fashion_items").select(ITEM_PUBLIC_FIELDS).limit(1)),
            timeout=3.0,
        )
        database_ok = True
    except Exception as exc:
        logger.warning("Readiness database check failed (%s).", type(exc).__name__)

    redis_ok = await cache.ping()
    if not cache.redis_configured:
        redis_status = "memory"
    else:
        redis_status = "ok" if redis_ok else "down"

    ready = database_ok and (redis_ok or not cache.redis_configured)
    return JSONResponse(
        status_code=200 if ready else 503,
        content={
            "status": "ready" if ready else "degraded",
            "database": database_ok,
            "redis": redis_status,
        },
    )


@singleflight(lambda: "global")
async def _warmup_once() -> dict:
    cache_key = "ratelimit:warmup:v2:global"
    if await cache.get(cache_key):
        return {"status": "warming"}

    try:
        await asyncio.to_thread(_spawn_modal_warmup)
    except Exception as exc:
        logger.warning("Modal warmup failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Warmup unavailable.") from exc
    await cache.set(cache_key, "1", ttl_seconds=300)
    return {"status": "warming"}


@app.post("/warmup")
async def warmup(user_id: str = Depends(get_approved_user)) -> dict:
    return await _warmup_once()


@app.get("/username_available")
async def username_available(
    request: Request,
    username: str = Query(min_length=1, max_length=64),
) -> dict:
    client_host = request.client.host if request.client else "unknown"
    await _enforce_rate_limit("username", client_host, USERNAME_RATE_LIMIT, USERNAME_RATE_WINDOW)

    pattern = username.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    db = await get_supabase()
    response = (
        await _execute(db.table("profiles")
        .select("user_id")
        .ilike("username", pattern)
        .limit(1))
    )
    return {"available": not bool(response.data)}


@app.post("/profile/ensure")
async def ensure_profile(claims: dict = Depends(get_current_claims)) -> dict:
    user_id = claims["id"]
    email = claims.get("email") or ""
    requested_name = str(
        claims.get("name") or (email.split("@")[0] if email else "User")
    ).strip()[:64] or "User"

    db = await get_supabase()
    existing = (
        await _execute(db.table("profiles")
        .select("user_id, is_approved")
        .eq("user_id", user_id)
        .limit(1))
    )
    if existing.data:
        approved = bool(existing.data[0].get("is_approved"))
        await _cache_approval(user_id, approved)
        return {"created": False, "is_approved": approved}

    payload = {
        "user_id": user_id,
        "username": requested_name,
        "email": email or None,
        "is_approved": False,
    }

    try:
        await _execute(db.table("profiles").insert(payload))
    except Exception as exc:
        logger.warning("Profile ensure insert failed (%s); retrying.", type(exc).__name__)
        retry = (
            await _execute(db.table("profiles")
            .select("user_id, is_approved")
            .eq("user_id", user_id)
            .limit(1))
        )
        if retry.data:
            approved = bool(retry.data[0].get("is_approved"))
            await _cache_approval(user_id, approved)
            return {"created": False, "is_approved": approved}

        payload["username"] = f"{requested_name[:55]}-{user_id[:8]}"
        try:
            await _execute(db.table("profiles").insert(payload))
        except Exception as retry_exc:
            logger.exception("Profile ensure retry failed (%s).", type(retry_exc).__name__)
            raise HTTPException(
                status_code=500, detail="Unable to create user profile."
            ) from retry_exc

    await _cache_approval(user_id, False)
    return {"created": True, "is_approved": False}


@app.get("/profile")
async def get_profile(user_id: str = Depends(get_current_user)) -> dict:
    db = await get_supabase()
    response = (
        await _execute(db.table("profiles")
        .select(
            "user_id, username, email, is_approved, skin_lab, hair_lab, "
            "liked_clothes, disliked_clothes, w1_color, w2_content, w3_collaborative"
        )
        .eq("user_id", user_id)
        .limit(1))
    )
    profile = response.data[0] if response.data else None
    if profile is not None and "is_approved" in profile:
        await _cache_approval(user_id, bool(profile.get("is_approved")))
    return {"profile": profile}


async def _mark_embedding_dirty(user_id: str) -> int:
    version_key = f"embedding:dirty:{user_id}"
    synced_key = f"embedding:synced:{user_id}"
    version = await cache.incr(version_key, 86400)
    synced = await cache.get(synced_key)
    try:
        synced_version = int(synced) if synced is not None else -1
    except (TypeError, ValueError):
        synced_version = -1
    if version <= synced_version:
        version = synced_version + 1
        await cache.set(version_key, version, ttl_seconds=86400)
    return version


async def _invalidate_recommendations(user_id: str) -> None:
    # A unique generation makes any earlier in-flight writes unreachable.
    await cache.set(f"recommend:generation:{user_id}", uuid.uuid4().hex, ttl_seconds=86400)


@app.post("/profile/preferences")
async def update_preferences(
    request: PreferencesRequest,
    user_id: str = Depends(get_approved_user),
) -> dict:
    liked = list(dict.fromkeys(request.liked_clothes))
    liked_set = set(liked)
    disliked = [value for value in dict.fromkeys(request.disliked_clothes) if value not in liked_set]

    db = await get_supabase()
    response = (
        await _execute(db.table("profiles")
        .update(
            {
                "liked_clothes": liked,
                "disliked_clothes": disliked,
            }
        )
        .eq("user_id", user_id))
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="User profile missing.")

    await _mark_embedding_dirty(user_id)
    await _invalidate_recommendations(user_id)

    return {"status": "success"}


async def _cache_catalog_items(rows: list[dict]) -> None:
    await asyncio.gather(*(
        cache.set(f"catalog:item:{row['id']}", row, ttl_seconds=300)
        for row in rows if row.get("id") is not None
    ))


async def _get_catalog_items(ids: list[int]) -> list[dict]:
    cached = await asyncio.gather(*(cache.get(f"catalog:item:{item_id}") for item_id in ids))
    found = {item_id: row for item_id, row in zip(ids, cached) if isinstance(row, dict)}
    missing = [item_id for item_id in ids if item_id not in found]
    if missing:
        db = await get_supabase()
        result = await _execute(db.table("fashion_items").select(ITEM_PUBLIC_FIELDS).in_("id", missing))
        rows = result.data or []
        await _cache_catalog_items(rows)
        found.update({int(row["id"]): row for row in rows})
    return [found[item_id] for item_id in sorted(found)]


@app.get("/items")
async def list_items(
    response: Response,
    user_id: str = Depends(get_approved_user),
    ids: str | None = Query(default=None, max_length=8000),
    limit: int = Query(default=24, ge=1, le=100),
) -> list[dict]:
    if ids:
        parsed_ids: list[int] = []
        seen: set[int] = set()
        for raw_id in ids.split(","):
            raw_id = raw_id.strip()
            if raw_id.isdigit():
                value = int(raw_id)
                if value not in seen:
                    seen.add(value)
                    parsed_ids.append(value)
        if not parsed_ids:
            return []
        if len(parsed_ids) > 100:
            raise HTTPException(status_code=400, detail="At most 100 garment ids are allowed.")
        rows = await _get_catalog_items(parsed_ids)
    else:
        db = await get_supabase()
        result = await _execute(db.table("fashion_items").select(ITEM_PUBLIC_FIELDS).order("id").limit(limit))
        rows = result.data or []
        await _cache_catalog_items(rows)
    response.headers["Cache-Control"] = "private, max-age=300"
    return rows


@app.get("/items/{item_id}")
async def get_item(
    item_id: str,
    response: Response,
    user_id: str = Depends(get_approved_user),
) -> dict:
    if not item_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid garment id.")
    rows = await _get_catalog_items([int(item_id)])
    if not rows:
        raise HTTPException(status_code=404, detail="Garment not found.")
    response.headers["Cache-Control"] = "private, max-age=300"
    return rows[0]


@app.post("/skin_color")
async def skin_hair_lab(
    img: UploadFile = File(...),
    claims: dict = Depends(get_approved_claims),
) -> dict:
    await _enforce_rate_limit("skin", claims["id"], SKIN_RATE_LIMIT, SKIN_RATE_WINDOW)
    img_bytes = await _read_image(img)
    img_hash = hashlib.sha256(img_bytes).hexdigest()
    cache_key = f"skin:hash:{img_hash}"

    cached_tones = await cache.get(cache_key)
    if cached_tones and isinstance(cached_tones, dict):
        skin_lab = cached_tones.get("skin_lab")
        hair_lab = cached_tones.get("hair_lab")
    else:
        try:
            analyzer = _cached_modal_class("SkinAnalyzer")()
            result = await analyzer.analyze.remote.aio(img_bytes)
            skin_lab = result["avg_skin_lab"]
            hair_lab = result["avg_hair_lab"]
            await cache.set(cache_key, {"skin_lab": skin_lab, "hair_lab": hair_lab}, ttl_seconds=604800)
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Skin analysis failed (%s).", type(exc).__name__)
            raise HTTPException(status_code=502, detail="Skin analysis failed.") from exc

    db = await get_supabase()
    try:
        updated = (
            await _execute(db.table("profiles")
            .update({"skin_lab": skin_lab, "hair_lab": hair_lab})
            .eq("user_id", claims["id"]))
        )
        if not updated.data:
            email = claims.get("email") or ""
            username = claims.get("name") or (email.split("@")[0] if email else "User")
            await _execute(db.table("profiles").insert(
                {
                    "user_id": claims["id"],
                    "username": str(username)[:64],
                    "email": email or None,
                    "skin_lab": skin_lab,
                    "hair_lab": hair_lab,
                }
            ))
            await _cache_approval(claims["id"], False)

        await _invalidate_recommendations(claims["id"])
    except Exception as exc:
        logger.warning("Skin profile sync failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=500, detail="Profile sync failed.") from exc

    return {"skin_lab": skin_lab, "hair_lab": hair_lab}


_embedding_locks: dict[str, asyncio.Lock] = {}


def _embedding_lock(user_id: str) -> asyncio.Lock:
    lock = _embedding_locks.get(user_id)
    if lock is None:
        lock = asyncio.Lock()
        _embedding_locks[user_id] = lock
    return lock


@app.post("/sync_embedding")
async def sync_user_embedding(user_id: str = Depends(get_approved_user)) -> dict:
    version_key = f"embedding:dirty:{user_id}"
    synced_key = f"embedding:synced:{user_id}"
    raw_version = await cache.get(version_key)
    raw_synced = await cache.get(synced_key)
    version = 0 if raw_version is None else int(raw_version)
    synced = -1 if raw_synced is None else int(raw_synced)
    if synced >= version:
        return {"status": "up to date"}

    lock = _embedding_lock(user_id)
    async with lock:
        raw_version = await cache.get(version_key)
        raw_synced = await cache.get(synced_key)
        version = 0 if raw_version is None else int(raw_version)
        synced = -1 if raw_synced is None else int(raw_synced)
        if synced >= version:
            return {"status": "up to date"}

        try:
            db = await get_supabase()
            profile_response = (
                await _execute(db.table("profiles")
                .select("liked_clothes, disliked_clothes")
                .eq("user_id", user_id)
                .limit(1))
            )
            if not profile_response.data:
                raise HTTPException(status_code=404, detail="User profile missing.")

            profile = profile_response.data[0]
            liked_ids = {int(value) for value in profile.get("liked_clothes") or []}
            disliked_ids = {int(value) for value in profile.get("disliked_clothes") or []}
            interacted_ids = sorted(liked_ids | disliked_ids)

            if not interacted_ids:
                await _execute(db.table("profiles").update({"user_embeddings": None}).eq("user_id", user_id))
                await _invalidate_recommendations(user_id)
                await cache.set(synced_key, version, ttl_seconds=3600)
                return {"status": "no interactions"}

            item_rows = await _fetch_item_vectors(interacted_ids)
            if not item_rows:
                return {"status": "no vectors generated"}

            liked_vectors: list[np.ndarray] = []
            disliked_vectors: list[np.ndarray] = []
            dimension: int | None = None

            for item in item_rows:
                item_id = int(item["id"])
                raw_vector = item.get("vector_features")
                if raw_vector is None:
                    continue
                if isinstance(raw_vector, str):
                    raw_vector = json.loads(raw_vector)
                vector = np.asarray(raw_vector, dtype=np.float32).reshape(-1)
                if vector.size == 0:
                    continue
                if dimension is None:
                    dimension = int(vector.size)
                elif int(vector.size) != dimension:
                    continue
                if item_id in liked_ids:
                    liked_vectors.append(vector)
                elif item_id in disliked_ids:
                    disliked_vectors.append(vector)

            if dimension is None or (not liked_vectors and not disliked_vectors):
                return {"status": "no vectors generated"}

            user_embedding = np.zeros(dimension, dtype=np.float32)
            if liked_vectors:
                user_embedding += np.mean(liked_vectors, axis=0)
            if disliked_vectors:
                user_embedding -= 0.5 * np.mean(disliked_vectors, axis=0)

            norm = np.linalg.norm(user_embedding)
            if norm <= 0:
                return {"status": "no vectors generated"}

            user_embedding = user_embedding / norm
            vector_str = "[" + ",".join(f"{float(value):.6f}" for value in user_embedding) + "]"

            await _execute(db.table("profiles").update({"user_embeddings": vector_str}).eq(
                "user_id", user_id
            ))

            await _invalidate_recommendations(user_id)
            await cache.set(synced_key, version, ttl_seconds=3600)

            return {"status": "success"}
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Embedding sync failed (%s).", type(exc).__name__)
            raise HTTPException(status_code=500, detail="Embedding sync failed.") from exc


@app.get("/recommend")
async def get_recommended_clothes(
    user_id: str = Depends(get_approved_user),
    gender: Literal["male", "female", "unisex"] | None = Query(default=None),
) -> dict:
    generation = await cache.get_or_create_generation(f"recommend:generation:{user_id}")
    return await _recommend_once(user_id, gender, generation)


@singleflight(lambda user_id, gender, generation: (user_id, gender, generation))
async def _recommend_once(user_id: str, gender: str | None, generation: str) -> dict:
    gender_pref = [gender] if gender else None
    feed_cache_key = f"recommend:feed:v2:{user_id}:{gender or 'all'}:{generation}"

    cached_feed = await cache.get(feed_cache_key)
    if cached_feed and isinstance(cached_feed, dict):
        return cached_feed

    gender_key = "-".join(sorted(gender_pref)) if gender_pref else "all"
    inventory_cache_key = f"catalog:lab_inventory:{gender_key}"

    async def load_profile() -> dict | None:
        db = await get_supabase()
        response = (
            await _execute(db.table("profiles")
            .select(
                "liked_clothes, disliked_clothes, skin_lab, hair_lab, "
                "w1_color, w2_content, w3_collaborative"
            )
            .eq("user_id", user_id)
            .maybe_single())
        )
        if response is None:
            return None
        return response.data

    async def load_inventory() -> list[dict]:
        cached = await cache.get(inventory_cache_key)
        if isinstance(cached, list):
            return cached
        data = await _fetch_inventory(gender_pref)
        await cache.set(inventory_cache_key, data, ttl_seconds=1800)
        return data

    async def load_content_scores() -> list[dict]:
        return await _fetch_rpc_pages(
            "match_clothes_by_user",
            {"target_user_id": user_id},
        )

    async def load_collaborative_scores() -> list[dict]:
        return await _fetch_rpc_pages(
            "get_similar_users",
            {"target_user_id": user_id},
        )

    profile, inventory_data, content_rows, collaborative_rows = await asyncio.gather(
        load_profile(),
        load_inventory(),
        load_content_scores(),
        load_collaborative_scores(),
        return_exceptions=True,
    )

    degraded = False
    if isinstance(inventory_data, Exception):
        logger.warning("Recommendation inventory fetch failed (%s).", type(inventory_data).__name__)
        raise HTTPException(status_code=503, detail="Catalog unavailable.") from inventory_data
    inventory_data = inventory_data or []

    if isinstance(profile, Exception):
        degraded = True
        logger.warning("Recommendation profile fetch failed (%s).", type(profile).__name__)
        profile = None

    if isinstance(content_rows, Exception):
        degraded = True
        logger.warning("Content filtering failed (%s).", type(content_rows).__name__)
        content_rows = []

    if isinstance(collaborative_rows, Exception):
        degraded = True
        logger.warning("Collaborative filtering failed (%s).", type(collaborative_rows).__name__)
        collaborative_rows = []

    n_interactions = 0
    skin_lab = [55, 5, 15]
    hair_lab = [25, 0, 0]
    interacted_clothes: list[int] = []
    stored_weights = {"w1_color": None, "w2_content": None, "w3_collaborative": None}

    if isinstance(profile, dict):
        liked = profile.get("liked_clothes") or []
        disliked = profile.get("disliked_clothes") or []
        interacted_set = {int(value) for value in liked + disliked}
        interacted_clothes = list(interacted_set)
        n_interactions = len(interacted_clothes)
        if profile.get("skin_lab"):
            try:
                skin_lab = [int(value) for value in profile["skin_lab"]]
            except (TypeError, ValueError):
                pass
        if profile.get("hair_lab"):
            try:
                hair_lab = [int(value) for value in profile["hair_lab"]]
            except (TypeError, ValueError):
                pass
        stored_weights = {
            "w1_color": profile.get("w1_color"),
            "w2_content": profile.get("w2_content"),
            "w3_collaborative": profile.get("w3_collaborative"),
        }

    id_dict: dict[int, float] = {}
    inventory: dict[int, list[int]] = {}
    for item in inventory_data:
        try:
            item_id = int(item["id"])
        except (KeyError, TypeError, ValueError):
            continue
        id_dict[item_id] = -1.0
        raw_lab = item.get("lab_value")
        if raw_lab is None:
            continue
        try:
            lab_values = [int(value) for value in raw_lab]
        except (TypeError, ValueError):
            continue
        if len(lab_values) == 3:
            inventory[item_id] = lab_values

    content_filtering_dict = id_dict.copy()
    for item in content_rows:
        try:
            item_id = int(item["id"])
            similarity = float(item["similarity"])
        except (KeyError, TypeError, ValueError):
            continue
        if item_id in content_filtering_dict:
            content_filtering_dict[item_id] = similarity

    collaborative_filtering_dict = id_dict.copy()
    n_similar_users = len(collaborative_rows)
    similar_users_dict: dict[Any, float] = {}
    for item in collaborative_rows:
        user_key = item.get("user_id")
        similarity = item.get("similarity")
        if user_key is None or similarity is None:
            continue
        try:
            similar_users_dict[user_key] = float(similarity)
        except (TypeError, ValueError):
            continue

    for item in collaborative_rows:
        user_key = item.get("user_id")
        if user_key not in similar_users_dict:
            continue
        for cloth_id in item.get("liked_clothes") or []:
            try:
                cloth_id = int(cloth_id)
            except (TypeError, ValueError):
                continue
            if cloth_id in id_dict and collaborative_filtering_dict.get(cloth_id) == -1.0:
                collaborative_filtering_dict[cloth_id] = similar_users_dict[user_key]

    for cloth_id in interacted_clothes:
        if cloth_id in collaborative_filtering_dict:
            collaborative_filtering_dict[cloth_id] = -1.0

    w2 = min(0.40, n_interactions * 0.04)
    w3 = min(0.40, n_similar_users * 0.08)
    w1 = 1.0 - w2 - w3

    def weight_changed(key: str, value: float) -> bool:
        stored = stored_weights.get(key)
        if stored is None:
            return True
        try:
            return abs(float(stored) - value) > 0.0001
        except (TypeError, ValueError):
            return True

    weights_changed = any(
        weight_changed(key, value)
        for key, value in (
            ("w1_color", w1),
            ("w2_content", w2),
            ("w3_collaborative", w3),
        )
    )

    if weights_changed:
        try:
            db = await get_supabase()
            await _execute(db.table("profiles").update(
                {
                    "w1_color": round(w1, 4),
                    "w2_content": round(w2, 4),
                    "w3_collaborative": round(w3, 4),
                }
            ).eq("user_id", user_id))
        except Exception as exc:
            degraded = True
            logger.warning("Recommendation weight sync failed (%s).", type(exc).__name__)

    try:
        color_scores = await asyncio.to_thread(rank_clothes, inventory, skin_lab, hair_lab)
    except Exception as exc:
        degraded = True
        logger.warning("Color scoring failed (%s).", type(exc).__name__)
        color_scores = {}

    final_scores: dict[int, float] = {}
    for cloth_id in id_dict:
        color_norm = color_scores.get(cloth_id, 0.0) / 100.0
        content_norm = (content_filtering_dict.get(cloth_id, -1.0) + 1) / 2
        collab_norm = (collaborative_filtering_dict.get(cloth_id, -1.0) + 1) / 2
        weighted_avg = (w1 * color_norm) + (w2 * content_norm) + (w3 * collab_norm)
        final_scores[cloth_id] = round(weighted_avg, 4)

    sorted_recommendations = sorted(
        final_scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    feed_result = {
        "user_id": user_id,
        "weights": {
            "color": round(w1, 2),
            "content": round(w2, 2),
            "collab": round(w3, 2),
        },
        "data_points": {
            "interactions": n_interactions,
            "similar_users": n_similar_users,
        },
        "degraded": degraded,
        "recommendations": sorted_recommendations,
    }
    await cache.set(feed_cache_key, feed_result, ttl_seconds=30 if degraded else 600)
    return feed_result


def _validate_tryon_result(data: bytes) -> None:
    if not isinstance(data, bytes) or not data:
        raise ValueError("Try-on service returned no image.")
    with Image.open(io.BytesIO(data)) as image:
        if image.format != "JPEG":
            raise ValueError("Try-on service returned a non-JPEG image.")
        image.verify()


@app.post("/tryon")
async def virtual_try_on(
    img: UploadFile = File(...),
    cloth_id: str = Form(..., min_length=1, max_length=128),
    user_id: str = Depends(get_approved_user),
) -> Response:
    await _enforce_rate_limit("tryon", user_id, TRYON_RATE_LIMIT, TRYON_RATE_WINDOW)
    img_bytes = await _read_image(img)
    resolved_id = cloth_id.strip()

    img_hash = hashlib.sha256(img_bytes).hexdigest()
    return await _tryon_once(img_bytes, resolved_id, img_hash)


@singleflight(lambda img_bytes, resolved_id, img_hash: (img_hash, resolved_id))
async def _tryon_once(img_bytes: bytes, resolved_id: str, img_hash: str) -> Response:
    tryon_cache_key = f"vton:result:{img_hash}:{resolved_id}"
    cached_b64 = await cache.get(tryon_cache_key)
    if cached_b64 and isinstance(cached_b64, str):
        try:
            cached_image = base64.b64decode(cached_b64, validate=True)
            await asyncio.to_thread(_validate_tryon_result, cached_image)
        except (ValueError, OSError):
            await cache.delete(tryon_cache_key)
        else:
            return Response(
                content=cached_image,
                media_type="image/jpeg",
                headers={"Cache-Control": "private, max-age=86400"},
            )

    try:
        resolved_name = await _resolve_cloth_name(resolved_id)
        if not resolved_name:
            raise HTTPException(
                status_code=404,
                detail=f"Garment ID '{resolved_id}' not found.",
            )

        runner = _cached_modal_class("VTONRunner")()
        result_bytes = await runner.process_photo.remote.aio(img_bytes, resolved_name)
        await asyncio.to_thread(_validate_tryon_result, result_bytes)

        await cache.set(
            tryon_cache_key,
            base64.b64encode(result_bytes).decode("ascii"),
            ttl_seconds=86400,
        )
        return Response(
            content=result_bytes,
            media_type="image/jpeg",
            headers={"Cache-Control": "private, max-age=86400"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Try-on processing failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Try-on processing failed.") from exc


@app.post("/text_search")
async def text_search_clothes(
    request: TextSearchRequest,
    user_id: str = Depends(get_approved_user),
) -> dict:
    await _enforce_rate_limit("search", user_id, SEARCH_RATE_LIMIT, SEARCH_RATE_WINDOW)
    feature_parts: list[str] = []

    color_desc = request.color or ""
    category_desc = request.sub_category or "clothing"
    if color_desc or category_desc:
        feature_parts.append(f"{color_desc} {category_desc}".strip())
    if request.neck_style:
        feature_parts.append(f"with {request.neck_style} neck")
    if request.sleeve_length:
        feature_parts.append(f"and {request.sleeve_length} sleeves")
    if request.occasion:
        feature_parts.append(f"perfect for {request.occasion}")
    if request.additional_input:
        feature_parts.append(f"({request.additional_input})")

    combined_text = " ".join(feature_parts) if feature_parts else "fashion apparel"
    synthesized_prompt = (
        f"a high-quality professional e-commerce product photo of a {combined_text.lower()}"
    )

    try:
        text_vector = await _embed_text(synthesized_prompt)
    except Exception as exc:
        logger.warning("Search embedding failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Search embedding failed.") from exc

    max_rows = request.limit if not request.gender_filter else min(5000, request.limit * 50)
    try:
        data = await _fetch_text_matches(text_vector, 0.05, max_rows)
        if not data:
            data = await _fetch_text_matches(text_vector, 0.01, max_rows)
    except Exception as exc:
        logger.warning("Text search query failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=500, detail="Search failed.") from exc

    if request.gender_filter:
        found_ids = [str(item["id"]) for item in data]
        valid_ids = await _filter_gender_ids(
            found_ids,
            [gender.lower() for gender in request.gender_filter],
        )
        final_data = [item for item in data if str(item["id"]) in valid_ids]
    else:
        final_data = data

    return {
        str(item["id"]): item.get("similarity", 1.0)
        for item in final_data[: request.limit]
    }
