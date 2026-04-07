import os
from dotenv import load_dotenv
import fastapi
import pydantic
from fastapi import File,UploadFile, Form
from fastapi.responses import Response 
import numpy as np
import cv2 as cv
from supabase import create_client
import random
from recommendation.skin_recom import rank_clothes

# Load secure environment variables from .env vault
load_dotenv()

URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not URL or not KEY:
    raise RuntimeError("CRITICAL FAILURE: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from environment.")

supabase = create_client(URL, KEY)

app=fastapi.FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.post("/skin_color")
async def skin_hair_lab(img:UploadFile=File(...)):
    img_bytes = await img.read()
    import modal
    runner = modal.Cls.from_name("vton-service", "SkinAnalyzer")()
    result = await runner.analyze.remote.aio(img_bytes)
    skin=result["avg_skin_lab"]
    hair=result["avg_hair_lab"]
    return skin,hair

@app.post("/sync_embedding/{user_id}")
async def sync_user_embedding(user_id: str):
    try:
        profile_res = supabase.table('profiles').select('liked_clothes, disliked_clothes').eq('user_id', user_id).single().execute()
        if not profile_res.data:
            return fastapi.responses.JSONResponse(status_code=404, content={"error": "User profile missing"})
            
        profile = profile_res.data
        liked = profile.get('liked_clothes') or []
        disliked = profile.get('disliked_clothes') or []
        interacted_clothes = liked + disliked
        
        if len(interacted_clothes) == 0:
            return {"status": "no interactions"}
            
        item_res = supabase.table('fashion_items').select('id, vector_features').in_('id', interacted_clothes).execute()
        if item_res.data:
            liked_vectors = []
            disliked_vectors = []
            
            import json
            for item in item_res.data:
                item_id = int(item['id'])
                
                # pgvector returns as a string ex: "[0.1, 0.2]" instead of a list
                raw_vec = item['vector_features']
                if isinstance(raw_vec, str):
                    raw_vec = json.loads(raw_vec)
                    
                if item_id in [int(x) for x in liked]:
                    liked_vectors.append(np.array(raw_vec))
                elif item_id in [int(x) for x in disliked]:
                    disliked_vectors.append(np.array(raw_vec))
                    
            user_emb = np.zeros(768)
            if liked_vectors:
                user_emb += np.mean(liked_vectors, axis=0)
            if disliked_vectors:
                user_emb -= 0.5 * np.mean(disliked_vectors, axis=0)
                
            if liked_vectors or disliked_vectors:
                norm = np.linalg.norm(user_emb)
                if norm > 0:
                    user_emb = user_emb / norm
                    
                # Format to explicit pgvector string to prevent casting errors
                vector_str = "[" + ",".join(str(round(x, 6)) for x in user_emb.tolist()) + "]"
                
                supabase.table('profiles').update({'user_embeddings': vector_str}).eq('user_id', user_id).execute()
                print(f"[EMBEDDING]: Highly-tuned aesthetic vector synced for {user_id}")
                return {"status": "success"}
                
        return {"status": "no vectors generated"}
    except Exception as e:
        print(f"Embedding sync failed: {str(e)}")
        return fastapi.responses.JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/recommend/{user_id}")
def get_recommended_clothes(user_id:str, gender: str | None = None):
    # Normalize 'all' or empty strings to None
    if gender and gender.lower() in ['all', '']:
        gender = None
        
    gender_pref = [gender.lower()] if gender else None

    # 2. Fetch User Profile
    n_interactions = 0
    skin_lab = [55, 5, 15]
    hair_lab = [25, 0, 0]
    interacted_clothes = []

    try:
        profile_res = supabase.table('profiles') \
            .select('liked_clothes, disliked_clothes, skin_lab, hair_lab, user_embeddings') \
            .eq('user_id', user_id) \
            .single() \
            .execute()
        
        if profile_res.data:
            profile = profile_res.data
            liked = profile.get('liked_clothes') or []
            disliked = profile.get('disliked_clothes') or []
            interacted_clothes = liked + disliked
            n_interactions = len(interacted_clothes)
            
            if profile.get('skin_lab'):
                skin_lab = [int(v) for v in profile["skin_lab"]]
            if profile.get('hair_lab'):
                hair_lab = [int(v) for v in profile["hair_lab"]]
    except Exception as e:
        print(f"Profile fetch failed: {str(e)}")
        pass

    # 1. Fetch Inventory (Apply optional gender filter)
    query = supabase.table('fashion_items').select('id, lab_value')
    if gender_pref:
        query = query.in_('gender', gender_pref)
        
    response_cloth_ids = query.execute()
    
    inventory_data = response_cloth_ids.data or []
    # Create the master list of valid IDs for this specific gender selection
    id_dict = {item['id']: -1.0 for item in inventory_data}
    inventory = {
        item["id"]: [int(val) for val in item["lab_value"]]
        for item in inventory_data if item["lab_value"] is not None
    }

    # 3. Content Filtering (Strictly valid IDs only)
    content_filtering_dict = id_dict.copy()
    try:
        # Call RPC to get overall similarities
        response_similarity = supabase.rpc('match_clothes_by_user', {'target_user_id': user_id}).execute()
        if response_similarity.data:
            for item in response_similarity.data:
                # ONLY acknowledge if the item matches our current gender profile
                if item['id'] in id_dict:
                    content_filtering_dict[item['id']] = item['similarity']
    except:
        pass

    # 4. Collaborative Filtering (Strictly valid IDs only)
    collaborative_filtering_dict = id_dict.copy()
    n_similar_users = 0
    try:
        response_users_similarity = supabase.rpc('get_similar_users', {'target_user_id': user_id}).execute()
        sim_data = response_users_similarity.data or []
        n_similar_users = len(sim_data)
        
        similar_users_dict = {item['user_id']: item['similarity'] for item in sim_data}
        for item in sim_data:
            liked_ids = item.get("liked_clothes") or []
            for cloth_id in liked_ids:
                # ONLY acknowledge if the liked item from a peer matches our current gender profile
                if cloth_id in id_dict and collaborative_filtering_dict.get(cloth_id) == -1.0:
                    collaborative_filtering_dict[cloth_id] = similar_users_dict[item['user_id']]
        
        # Filter already interacted items
        for cloth_id in interacted_clothes:
            if cloth_id in collaborative_filtering_dict:
                collaborative_filtering_dict[cloth_id] = -1.0
    except:
        pass

    # 5. Dynamic Weight Calculation
    # Scale: Content reaches 0.40 at 10 interactions; Collab reaches 0.40 at 5 similar users
    # If nothing exists, Color = 1.0. If both mature, Color = 0.20
    w2 = min(0.40, n_interactions * 0.04)
    w3 = min(0.40, n_similar_users * 0.08)
    w1 = 1.0 - w2 - w3
    
    # Sync Weights to Vault
    try:
        supabase.table('profiles').update({
            'w1_color': round(w1, 4),
            'w2_content': round(w2, 4),
            'w3_collaborative': round(w3, 4)
        }).eq('user_id', user_id).execute()
    except Exception as e:
        print(f"[WARNING]: Failed to sync dynamic weights: {e}")

    # 6. Color-Based Ranking
    skin_color_recom_dict = rank_clothes(inventory, skin_lab, hair_lab)

    # 7. Weighted Final Score
    final_scores = {}
    # Strictly iterate ONLY over gender-filtered keys
    for cloth_id in id_dict.keys():
        color_raw = skin_color_recom_dict.get(cloth_id, 0.0)
        color_norm = color_raw / 100.0

        content_raw = content_filtering_dict.get(cloth_id, -1.0)
        content_norm = (content_raw + 1) / 2

        collab_raw = collaborative_filtering_dict.get(cloth_id, -1.0)
        collab_norm = (collab_raw + 1) / 2
        
        weighted_avg = (w1 * color_norm) + (w2 * content_norm) + (w3 * collab_norm)
        jitter = random.uniform(-0.02, 0.02)
        # Final safety check before adding to scores
        final_scores[cloth_id] = round(weighted_avg + jitter, 4)

    sorted_recommendations = dict(
        sorted(final_scores.items(), key=lambda item: item[1], reverse=True)
    )

    return {
        "user_id": user_id,
        "weights": {"color": round(w1, 2), "content": round(w2, 2), "collab": round(w3, 2)},
        "data_points": {"interactions": n_interactions, "similar_users": n_similar_users},
        "recommendations": list(sorted_recommendations.items())
    }
    
    

@app.post("/tryon")
async def virtual_try_on(img: UploadFile = File(...), cloth_id: str = Form(...), user_id: str = Form(None)):
    try:
        img_bytes = await img.read()

        # 0. AUTOMATED SKIN/HAIR PROFILING (Dynamic Handshake)
        # If user_id is provided, we analyze their photo and store their current LAB profile
        if user_id:
            try:
                print(f"🧬 [STAGE 0]: Profile Sync Requested for User '{user_id}'...")
                import modal
                analyzer = modal.Cls.from_name("vton-service", "SkinAnalyzer")()
                analysis = await analyzer.analyze.remote.aio(img_bytes)
                
                skin_lab = analysis["avg_skin_lab"]
                hair_lab = analysis["avg_hair_lab"]
                
                print(f"🧬 [STAGE 0]: Profile Extracted | Skin: {skin_lab} | Hair: {hair_lab}")
                
                # Update Database Vault
                supabase.table('profiles').update({
                    "skin_lab": skin_lab,
                    "hair_lab": hair_lab
                }).eq('user_id', user_id).execute()
                print("🧬 [STAGE 0]: Supabase Profile Vault updated successfully.")
            except Exception as e:
                print(f"⚠️ [PROFILING FAILED]: Could not sync LAB profile: {str(e)}")
        
        # 1. RESOLVE ID TO CLOTH_NAME (Handshake between DB and AI Volume)
        print(f"[VTON]: Resolving Cloth ID '{cloth_id}' to filesystem name...")
        db_res = supabase.table('fashion_items').select('cloth_name').eq('id', cloth_id).single().execute()
        
        if not db_res.data:
            return fastapi.responses.JSONResponse(
                status_code=404, 
                content={"error": f"Garment ID '{cloth_id}' not found in database registry."}
            )
            
        real_cloth_name = db_res.data.get('cloth_name')
        if not real_cloth_name:
            # Fallback if cloth_name is missing, use ID itself
            real_cloth_name = str(cloth_id)

        import modal
        runner = modal.Cls.from_name("vton-service", "VTONRunner")()
        print(f"🚀 [MODAL HANDSHAKE]: Sending image and resolved name '{real_cloth_name}' to Cloud GPU...")
        
        result_bytes = await runner.process_photo.remote.aio(img_bytes, real_cloth_name)
        return Response(content=result_bytes, media_type="image/jpeg")

    except Exception as e:
        return fastapi.responses.JSONResponse(
            status_code=500, 
            content={"error": f"VTON Processing Failed: {str(e)}"}
        )


class TextSearchRequest(pydantic.BaseModel):        
    gender_filter: list[str] | None = None
    color: str | None = None           
    neck_style: str | None = None     
    occasion: str | None = None
    sleeve_length: str | None = None
    sub_category: str | None = None
    additional_input: str | None = None 
    limit: int = 40                  

@app.post("/text_search")
async def text_search_clothes(request: TextSearchRequest):
    try:
        print(f"\n[STAGE 1]: Received Request | Filters: {request.dict()}")
        
        # A. Build a highly descriptive prompt for SigLIP (GENDER NEUTRAL for better embeddings)
        query_parts = []
        # B. AESTHETIC SYNTHESIS (Translating Filters to AI Semantic Understanding)
        # We create a rich descriptive anchor for the 768-D AI Model
        feature_parts = []
        
        # 1. Base Attributes
        color_desc = request.color if request.color else ""
        cat_desc = request.sub_category if request.sub_category else "clothing"
        if color_desc or cat_desc:
            feature_parts.append(f"{color_desc} {cat_desc}".strip())
        
        # 2. Structural Details
        if request.neck_style: feature_parts.append(f"with {request.neck_style} neck")
        if request.sleeve_length: feature_parts.append(f"and {request.sleeve_length} sleeves")
        
        # 3. Use Case & Context
        if request.occasion: feature_parts.append(f"perfect for {request.occasion}")
        
        # 4. User Custom Prompt Overlay
        if request.additional_input: feature_parts.append(f"({request.additional_input})")
        
        combined_text = " ".join(feature_parts) if feature_parts else "fashion apparel"
        
        # We wrap it in a natural language prompt for better model performance
        # SigLIP and CLIP prefer high-fidelity, descriptive anchors
        synthesized_prompt = f"a high-quality professional e-commerce product photo of a {combined_text.lower()}"
        
        print(f"[STAGE 2]: Synthesized Rich Prompt: \"{synthesized_prompt}\"")

        # B. Get feature vector from Modal
        import modal
        import time
        
        start_cloud = time.time()
        try:
            start_cloud = time.time()
            analyzer = modal.Cls.from_name("vton-service", "FashionAnalyzer")()
            
            # CORRECTIVE FIX: Ensure the rich synthesized_prompt is actually sent
            print(f"[STAGE 3.1]: Initializing High-Fidelity Handshake with Modal...")
            print(f"[MODAL]: Requesting Signature for Prompt: \"{synthesized_prompt}\"")
            result = await analyzer.get_features.remote.aio(synthesized_prompt)
            
            # CORRECTIVE FIX: Flatten the nested list from Modal [[...]] -> [...]
            # Supabase RPC expects a single-dimension vector
            text_vector = result["text_features"][0] if isinstance(result["text_features"][0], list) else result["text_features"]
            
            cloud_latency = time.time() - start_cloud
            print(f"[MODAL]: Cloud Success! AI Response received in {cloud_latency:.2f}s")
            print("[STAGE 3.2]: Feature Vector Synthesized and Flattened successfully.")
        except Exception as e:
            print(f"[MODAL ERROR]: Cloud connection failed or timed out: {str(e)}")
            raise e

        # C. Primary similarity search (DATABASE-FIRST SEMANTIC INTELLIGENCE)
        print(f"[STAGE 4]: Handshaking with Supabase for Semantic Search...")
        try:
            # Initial Search with Looser Threshold (Discovery First)
            response = supabase.rpc(
                'match_clothes_by_text', 
                {
                    'query_embedding': text_vector, 
                    'match_threshold': 0.05, 
                }
            ).execute()
            
            data = response.data or []
            
            # ATTEMPT 2: Fallback to basic search if AI is too picky
            if not data:
                print("[STAGE 4.1]: No matches at 0.05, retrying with wider net (0.01)...")
                response = supabase.rpc(
                    'match_clothes_by_text', 
                    {
                        'query_embedding': text_vector, 
                        'match_threshold': 0.01, 
                    }
                ).execute()
                data = response.data or []

            if data:
                top_score = data[0].get('similarity', 0)
                print(f"[STAGE 4.2]: Search Complete | Raw Matches: {len(data)} | Top Match Score: {top_score:.4f}")
            else:
                print("[STAGE 4.2]: Discovery yielded ZERO matches. Database might be empty or misaligned.")
                
        except Exception as e:
            print(f"[STAGE 4 ERROR]: Database similarity search failed: {str(e)}")
            raise e
        
        # D. Hard Gender Filter (STRICT AUTHORITY)
        if request.gender_filter:
            target_genders = [g.lower() for g in request.gender_filter]
            print(f"[STAGE 5]: Applying Hard Gender Filter (Target: {target_genders})")
            
            # Optimization: Only check the gender of the IDs we actually found
            found_ids = [str(item['id']) for item in data]
            
            if found_ids:
                try:
                    items_res = supabase.table('fashion_items') \
                        .select('id, gender') \
                        .in_('id', found_ids) \
                        .in_('gender', target_genders) \
                        .execute()
                    
                    valid_ids = {str(it['id']) for it in items_res.data}
                    
                    # DIAGNOSTIC: Show exactly what tags we matched among these 1000 items
                    if items_res.data:
                        found_tags = list(set([it['gender'] for it in items_res.data]))
                        print(f"[DIAGNOSTIC]: Verified genders for matches: {found_tags}")
                    
                    final_data = [item for item in data if str(item['id']) in valid_ids]
                    print(f"[STAGE 6]: Filter applied | Similarity matches was {len(data)}, resulting in {len(final_data)} valid gender items.")
                except Exception as e:
                    print(f"[STAGE 5 ERROR]: Targeted gender filtering failed: {str(e)}")
                    final_data = data
            else:
                final_data = []
        else:
            final_data = data

        # E. Final results
        final_results = {item['id']: item.get('similarity', 1.0) for item in final_data[:request.limit]}
        print(f"[SUCCESS]: Returning {len(final_results)} items to dashboard.")
        return final_results

    except Exception as e:
        return fastapi.responses.JSONResponse(
            status_code=500,
            content={"error": f"Text Search Failed: {str(e)}"}
        )

