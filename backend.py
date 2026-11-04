import asyncio
import hashlib
import json
import os
import threading
import time
from functools import lru_cache
from typing import Literal

import cv2 as cv
import modal
import numpy as np
import pydantic
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

from recommendation.skin_recom import rank_clothes

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

APP_NAME = os.environ.get("MODAL_APP_NAME", "vton-service")
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
TOKEN_CACHE_TTL = int(os.environ.get("TOKEN_CACHE_TTL", "60"))
EMBEDDING_CACHE_TTL = int(os.environ.get("EMBEDDING_CACHE_TTL", "3600"))
EMBEDDING_CACHE_SIZE = int(os.environ.get("EMBEDDING_CACHE_SIZE", "256"))

_allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="Weave API", docs_url=None, redoc_url=None, openapi_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)
app.add_middleware(GZipMiddleware, minimum_size=1024)

_bearer = HTTPBearer(auto_error=False)
_token_cache: dict[str, tuple[float, dict]] = {}
_token_lock = threading.Lock()
_embedding_cache: dict[str, tuple[float, list[float]]] = {}
_embedding_lock = threading.Lock()
_warmup_cache: dict[str, float] = {}


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

    cache_key = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = time.monotonic()

    with _token_lock:
        cached = _token_cache.get(cache_key)
        if cached and cached[0] > now:
            return cached[1]

    try:
        response = await asyncio.to_thread(supabase.auth.get_user, token)
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

    with _token_lock:
        if len(_token_cache) >= 2048:
            stale = [key for key, value in _token_cache.items() if value[0] <= now]
            for key in stale:
                _token_cache.pop(key, None)
            if len(_token_cache) >= 2048:
                _token_cache.clear()
        _token_cache[cache_key] = (now + TOKEN_CACHE_TTL, claims)

    return claims


async def get_current_user(claims: dict = Depends(get_current_claims)) -> str:
    return claims["id"]


def _is_approved(user_id: str) -> bool:
    response = (
        supabase.table("profiles")
        .select("is_approved")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return bool(response.data and response.data[0].get("is_approved"))


async def get_approved_user(claims: dict = Depends(get_current_claims)) -> str:
    if not await asyncio.to_thread(_is_approved, claims["id"]):
        raise HTTPException(status_code=403, detail="Account pending approval.")
    return claims["id"]


async def get_approved_claims(claims: dict = Depends(get_current_claims)) -> dict:
    if not await asyncio.to_thread(_is_approved, claims["id"]):
        raise HTTPException(status_code=403, detail="Account pending approval.")
    return claims


def _pg_int_array(values: list[int]) -> str:
    return "{" + ",".join(str(int(value)) for value in values) + "}"


def _validate_image_bytes(data: bytes) -> None:
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload.")
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
    for name in ("SkinAnalyzer", "FashionAnalyzer", "VTONRunner"):
        try:
            _cached_modal_class(name)().warmup.spawn()
        except Exception as exc:
            print(f"[WARMUP]: Dispatch failed for {name}: {exc}")


@lru_cache(maxsize=4096)
def _resolve_cloth_name(cloth_id: str) -> str | None:
    response = (
        supabase.table("fashion_items")
        .select("cloth_name")
        .eq("id", cloth_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        return None
    row = response.data[0]
    return str(row.get("cloth_name") or cloth_id)


def _fetch_item_vectors(item_ids: list[int]) -> list[dict]:
    rows: list[dict] = []
    for index in range(0, len(item_ids), 150):
        chunk = item_ids[index : index + 150]
        response = (
            supabase.table("fashion_items")
            .select("id, vector_features")
            .in_("id", chunk)
            .execute()
        )
        rows.extend(response.data or [])
    return rows


def _filter_gender_ids(found_ids: list[str], genders: list[str]) -> set[str]:
    valid_ids: set[str] = set()
    for index in range(0, len(found_ids), 200):
        chunk = found_ids[index : index + 200]
        response = (
            supabase.table("fashion_items")
            .select("id")
            .in_("id", chunk)
            .in_("gender", genders)
            .execute()
        )
        valid_ids.update(str(row["id"]) for row in (response.data or []))
    return valid_ids


async def _embed_text(prompt: str) -> list[float]:
    now = time.monotonic()
    with _embedding_lock:
        cached = _embedding_cache.get(prompt)
        if cached and cached[0] > now:
            return cached[1]

    analyzer = _cached_modal_class("FashionAnalyzer")()
    result = await analyzer.get_features.remote.aio(prompt)
    features = result.get("text_features") or []
    vector = features[0] if features and isinstance(features[0], list) else features
    if not vector:
        raise ValueError("Embedding service returned no features.")

    with _embedding_lock:
        if len(_embedding_cache) >= EMBEDDING_CACHE_SIZE:
            stale = [key for key, value in _embedding_cache.items() if value[0] <= now]
            for key in stale:
                _embedding_cache.pop(key, None)
            if len(_embedding_cache) >= EMBEDDING_CACHE_SIZE:
                _embedding_cache.clear()
        _embedding_cache[prompt] = (now + EMBEDDING_CACHE_TTL, vector)

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


@app.post("/warmup")
async def warmup(user_id: str = Depends(get_approved_user)) -> dict:
    now = time.monotonic()
    with _token_lock:
        last_warmup = _warmup_cache.get(user_id, 0.0)
        if now - last_warmup < 300:
            return {"status": "ready"}
        _warmup_cache[user_id] = now

    try:
        await asyncio.to_thread(_spawn_modal_warmup)
    except Exception as exc:
        print(f"[WARMUP]: Failed to start warmup: {exc}")
        raise HTTPException(status_code=503, detail="Warmup unavailable.") from exc
    return {"status": "warming"}


@app.get("/username_available")
def username_available(
    username: str = Query(min_length=1, max_length=64),
) -> dict:
    response = (
        supabase.table("profiles")
        .select("user_id")
        .eq("username", username)
        .limit(1)
        .execute()
    )
    return {"available": not bool(response.data)}


@app.post("/profile/ensure")
def ensure_profile(claims: dict = Depends(get_current_claims)) -> dict:
    user_id = claims["id"]
    email = claims.get("email") or ""
    requested_name = str(
        claims.get("name") or (email.split("@")[0] if email else "User")
    ).strip()[:64] or "User"

    existing = (
        supabase.table("profiles")
        .select("user_id, is_approved")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return {
            "created": False,
            "is_approved": bool(existing.data[0].get("is_approved")),
        }

    payload = {
        "user_id": user_id,
        "username": requested_name,
        "email": email or None,
        "is_approved": False,
    }

    try:
        supabase.table("profiles").insert(payload).execute()
    except Exception as exc:
        print(f"[PROFILE]: Ensure insert failed: {exc}")
        retry = (
            supabase.table("profiles")
            .select("user_id, is_approved")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if retry.data:
            return {
                "created": False,
                "is_approved": bool(retry.data[0].get("is_approved")),
            }

        payload["username"] = f"{requested_name[:55]}-{user_id[:8]}"
        try:
            supabase.table("profiles").insert(payload).execute()
        except Exception as retry_exc:
            print(f"[PROFILE]: Ensure retry failed: {retry_exc}")
            raise HTTPException(
                status_code=500, detail="Unable to create user profile."
            ) from retry_exc

    return {"created": True, "is_approved": False}


@app.get("/profile")
def get_profile(user_id: str = Depends(get_current_user)) -> dict:
    response = (
        supabase.table("profiles")
        .select(
            "user_id, username, email, is_approved, skin_lab, hair_lab, "
            "liked_clothes, disliked_clothes, w1_color, w2_content, w3_collaborative"
        )
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return {"profile": response.data[0] if response.data else None}


@app.post("/profile/preferences")
def update_preferences(
    request: PreferencesRequest,
    user_id: str = Depends(get_approved_user),
) -> dict:
    liked = list(dict.fromkeys(request.liked_clothes))
    liked_set = set(liked)
    disliked = [value for value in dict.fromkeys(request.disliked_clothes) if value not in liked_set]

    response = (
        supabase.table("profiles")
        .update(
            {
                "liked_clothes": _pg_int_array(liked),
                "disliked_clothes": _pg_int_array(disliked),
            }
        )
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="User profile missing.")
    return {"status": "success"}


@app.get("/items")
def list_items(
    user_id: str = Depends(get_approved_user),
    ids: str | None = Query(default=None, max_length=8000),
    limit: int = Query(default=24, ge=1, le=100),
) -> list[dict]:
    query = supabase.table("fashion_items").select("*")

    if ids:
        parsed_ids: list[int] = []
        for raw_id in ids.split(","):
            raw_id = raw_id.strip()
            if raw_id.isdigit():
                parsed_ids.append(int(raw_id))
        if not parsed_ids:
            return []
        query = query.in_("id", parsed_ids[:100])
    else:
        query = query.limit(limit)

    response = query.execute()
    return response.data or []


@app.get("/items/{item_id}")
def get_item(
    item_id: str,
    user_id: str = Depends(get_approved_user),
) -> dict:
    if not item_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid garment id.")
    response = (
        supabase.table("fashion_items")
        .select("*")
        .eq("id", item_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Garment not found.")
    return response.data[0]


@app.post("/skin_color")
async def skin_hair_lab(
    img: UploadFile = File(...),
    claims: dict = Depends(get_approved_claims),
) -> dict:
    img_bytes = await _read_image(img)
    try:
        analyzer = _cached_modal_class("SkinAnalyzer")()
        result = await analyzer.analyze.remote.aio(img_bytes)
        skin_lab = result["avg_skin_lab"]
        hair_lab = result["avg_hair_lab"]
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[SKIN]: Analysis failed: {exc}")
        raise HTTPException(status_code=502, detail="Skin analysis failed.") from exc

    email = claims.get("email") or ""
    username = claims.get("name") or (email.split("@")[0] if email else "User")

    try:
        supabase.table("profiles").upsert(
            {
                "user_id": claims["id"],
                "username": str(username)[:64],
                "email": email or None,
                "skin_lab": skin_lab,
                "hair_lab": hair_lab,
            },
            on_conflict="user_id",
        ).execute()
    except Exception as exc:
        print(f"[SKIN]: Profile sync failed: {exc}")
        raise HTTPException(status_code=500, detail="Profile sync failed.") from exc

    return {"skin_lab": skin_lab, "hair_lab": hair_lab}


@app.post("/sync_embedding")
async def sync_user_embedding(user_id: str = Depends(get_approved_user)) -> dict:
    try:
        profile_response = (
            supabase.table("profiles")
            .select("liked_clothes, disliked_clothes")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not profile_response.data:
            raise HTTPException(status_code=404, detail="User profile missing.")

        profile = profile_response.data[0]
        liked_ids = {int(value) for value in profile.get("liked_clothes") or []}
        disliked_ids = {int(value) for value in profile.get("disliked_clothes") or []}
        interacted_ids = list(liked_ids | disliked_ids)

        if not interacted_ids:
            return {"status": "no interactions"}

        item_rows = await asyncio.to_thread(_fetch_item_vectors, interacted_ids)
        if not item_rows:
            return {"status": "no vectors generated"}

        liked_vectors: list[np.ndarray] = []
        disliked_vectors: list[np.ndarray] = []

        for item in item_rows:
            item_id = int(item["id"])
            raw_vector = item.get("vector_features")
            if raw_vector is None:
                continue
            if isinstance(raw_vector, str):
                raw_vector = json.loads(raw_vector)
            vector = np.asarray(raw_vector, dtype=np.float64)
            if item_id in liked_ids:
                liked_vectors.append(vector)
            elif item_id in disliked_ids:
                disliked_vectors.append(vector)

        if not liked_vectors and not disliked_vectors:
            return {"status": "no vectors generated"}

        user_embedding = np.zeros(768, dtype=np.float64)
        if liked_vectors:
            user_embedding += np.mean(liked_vectors, axis=0)
        if disliked_vectors:
            user_embedding -= 0.5 * np.mean(disliked_vectors, axis=0)

        norm = np.linalg.norm(user_embedding)
        if norm <= 0:
            return {"status": "no vectors generated"}

        user_embedding = user_embedding / norm
        vector_str = "[" + ",".join(str(round(value, 6)) for value in user_embedding.tolist()) + "]"

        supabase.table("profiles").update({"user_embeddings": vector_str}).eq(
            "user_id", user_id
        ).execute()
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[EMBEDDING]: Sync failed: {exc}")
        raise HTTPException(status_code=500, detail="Embedding sync failed.") from exc


@app.get("/recommend")
def get_recommended_clothes(
    user_id: str = Depends(get_approved_user),
    gender: Literal["male", "female", "unisex"] | None = Query(default=None),
) -> dict:
    gender_pref = [gender] if gender else None

    n_interactions = 0
    skin_lab = [55, 5, 15]
    hair_lab = [25, 0, 0]
    interacted_clothes: list[int] = []
    stored_weights = {"w1_color": None, "w2_content": None, "w3_collaborative": None}

    try:
        profile_response = (
            supabase.table("profiles")
            .select(
                "liked_clothes, disliked_clothes, skin_lab, hair_lab, user_embeddings, "
                "w1_color, w2_content, w3_collaborative"
            )
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if profile_response.data:
            profile = profile_response.data
            liked = profile.get("liked_clothes") or []
            disliked = profile.get("disliked_clothes") or []
            interacted_clothes = [int(value) for value in liked + disliked]
            n_interactions = len(interacted_clothes)
            if profile.get("skin_lab"):
                skin_lab = [int(value) for value in profile["skin_lab"]]
            if profile.get("hair_lab"):
                hair_lab = [int(value) for value in profile["hair_lab"]]
            stored_weights = {
                "w1_color": profile.get("w1_color"),
                "w2_content": profile.get("w2_content"),
                "w3_collaborative": profile.get("w3_collaborative"),
            }
    except Exception as exc:
        print(f"[RECOMMEND]: Profile fetch failed: {exc}")

    query = supabase.table("fashion_items").select("id, lab_value")
    if gender_pref:
        query = query.in_("gender", gender_pref)

    inventory_response = query.execute()
    inventory_data = inventory_response.data or []

    id_dict = {int(item["id"]): -1.0 for item in inventory_data}
    inventory = {
        int(item["id"]): [int(value) for value in item["lab_value"]]
        for item in inventory_data
        if item.get("lab_value") is not None
    }

    content_filtering_dict = id_dict.copy()
    try:
        similarity_response = supabase.rpc(
            "match_clothes_by_user", {"target_user_id": user_id}
        ).execute()
        for item in similarity_response.data or []:
            item_id = int(item["id"])
            if item_id in id_dict:
                content_filtering_dict[item_id] = item["similarity"]
    except Exception as exc:
        print(f"[RECOMMEND]: Content filtering failed: {exc}")

    collaborative_filtering_dict = id_dict.copy()
    n_similar_users = 0
    try:
        users_response = supabase.rpc(
            "get_similar_users", {"target_user_id": user_id}
        ).execute()
        similar_users = users_response.data or []
        n_similar_users = len(similar_users)
        similar_users_dict = {item["user_id"]: item["similarity"] for item in similar_users}

        for item in similar_users:
            for cloth_id in item.get("liked_clothes") or []:
                cloth_id = int(cloth_id)
                if cloth_id in id_dict and collaborative_filtering_dict.get(cloth_id) == -1.0:
                    collaborative_filtering_dict[cloth_id] = similar_users_dict[item["user_id"]]

        for cloth_id in interacted_clothes:
            if cloth_id in collaborative_filtering_dict:
                collaborative_filtering_dict[cloth_id] = -1.0
    except Exception as exc:
        print(f"[RECOMMEND]: Collaborative filtering failed: {exc}")

    w2 = min(0.40, n_interactions * 0.04)
    w3 = min(0.40, n_similar_users * 0.08)
    w1 = 1.0 - w2 - w3

    weights_changed = any(
        stored_weights[key] is None or abs(float(stored_weights[key]) - value) > 0.0001
        for key, value in (
            ("w1_color", w1),
            ("w2_content", w2),
            ("w3_collaborative", w3),
        )
    )

    if weights_changed:
        try:
            supabase.table("profiles").update(
                {
                    "w1_color": round(w1, 4),
                    "w2_content": round(w2, 4),
                    "w3_collaborative": round(w3, 4),
                }
            ).eq("user_id", user_id).execute()
        except Exception as exc:
            print(f"[RECOMMEND]: Weight sync failed: {exc}")

    color_scores = rank_clothes(inventory, skin_lab, hair_lab)

    final_scores: dict[int, float] = {}
    for cloth_id in id_dict:
        color_norm = color_scores.get(cloth_id, 0.0) / 100.0
        content_norm = (content_filtering_dict.get(cloth_id, -1.0) + 1) / 2
        collab_norm = (collaborative_filtering_dict.get(cloth_id, -1.0) + 1) / 2
        weighted_avg = (w1 * color_norm) + (w2 * content_norm) + (w3 * collab_norm)
        final_scores[cloth_id] = round(weighted_avg, 4)

    sorted_recommendations = dict(
        sorted(final_scores.items(), key=lambda item: item[1], reverse=True)
    )

    return {
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
        "recommendations": list(sorted_recommendations.items()),
    }


@app.post("/tryon")
async def virtual_try_on(
    img: UploadFile = File(...),
    cloth_id: str = Form(..., min_length=1, max_length=128),
    _: str = Depends(get_approved_user),
) -> Response:
    img_bytes = await _read_image(img)
    try:
        resolved_name = await asyncio.to_thread(_resolve_cloth_name, cloth_id.strip())
        if not resolved_name:
            raise HTTPException(
                status_code=404,
                detail=f"Garment ID '{cloth_id}' not found.",
            )

        runner = _cached_modal_class("VTONRunner")()
        result_bytes = await runner.process_photo.remote.aio(img_bytes, resolved_name)
        if not result_bytes:
            raise HTTPException(status_code=502, detail="Try-on service returned no image.")
        return Response(content=result_bytes, media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[VTON]: Processing failed: {exc}")
        raise HTTPException(status_code=502, detail="Try-on processing failed.") from exc


@app.post("/text_search")
async def text_search_clothes(
    request: TextSearchRequest,
    _: str = Depends(get_approved_user),
) -> dict:
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
        print(f"[SEARCH]: Embedding failed: {exc}")
        raise HTTPException(status_code=502, detail="Search embedding failed.") from exc

    try:
        response = supabase.rpc(
            "match_clothes_by_text",
            {"query_embedding": text_vector, "match_threshold": 0.05},
        ).execute()
        data = response.data or []

        if not data:
            response = supabase.rpc(
                "match_clothes_by_text",
                {"query_embedding": text_vector, "match_threshold": 0.01},
            ).execute()
            data = response.data or []
    except Exception as exc:
        print(f"[SEARCH]: Database search failed: {exc}")
        raise HTTPException(status_code=500, detail="Search failed.") from exc

    if request.gender_filter:
        found_ids = [str(item["id"]) for item in data]
        valid_ids = await asyncio.to_thread(
            _filter_gender_ids,
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
