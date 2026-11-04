# Weave: AI-Driven Fashion Recommendation and Virtual Try-On System
## Visit the website at: https://weave-curator.vercel.app/<br>


<video src="https://github.com/user-attachments/assets/cb3d4c37-54ef-43f0-a8c3-2e3ed4457b56" autoplay loop muted playsinline width="100%"></video>
Weave is a comprehensive platform designed for personalized fashion recommendations and high-fidelity virtual try-on (VTON). The system leverages high-dimensional vector embeddings, adaptive collaborative filtering, and cloud-based GPU inference to provide an intelligent outfitting experience.

## System Architecture

The project consists of three primary components integrated into a cohesive pipeline:

### 1. Frontend Infrastructure
*   **Technologies:** React 19, TypeScript, Vite, Tailwind CSS, Express SSR.
*   **Functions:** Renders the interface on the server, handles user DNA onboarding, and serves as the primary interface for real-time virtual try-on previews. User data is read and written through authenticated backend endpoints.

### 2. Backend Engine
*   **Technologies:** FastAPI, Python, pgvector, NumPy.
*   **Functions:** Manages RESTful API endpoints for aesthetic vector synthesis, user preference synchronization, and orchestration of cloud GPU requests.

### 3. Cloud GPU Inference
*   **Platform:** Modal.
*   **Models:** SigLIP (feature extraction), YOLO/Human-Parsing (DNA profiling), and custom VTON models.
*   **Functions:** Executes computationally intensive tensor operations and streams processed results back to the backend.

### 4. Data Persistence
*   **Platform:** Supabase (PostgreSQL with pgvector).
*   **Functions:** Stores user profiles, relationship data, and high-dimensional semantic fashion embeddings. It also manages dynamically updated aesthetic preference weights (w1, w2, w3).

## Key Features

### Adaptive Recommendation Engine
The platform implements a self-balancing recommendation algorithm that dynamically adjusts feature weights based on user metadata and interaction history:
*   **Color-Based Ranking:** Initial profiling using skin and hair LAB values.
*   **Content Filtering:** Matching using 768-dimensional vector embeddings.
*   **Collaborative Filtering:** Peer-based similarity scoring through matrix factorization logic.

### High-Fidelity Virtual Try-On
Integrated pipeline for garment warping and human image generation, allowing users to preview items locally through a cloud-accelerated inference process.

## Deployment Specifications

### Backend (Render)
1. Initialize a new Web Service on Render.
2. Link the repository and set the root directory.
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn backend:app --host 0.0.0.0 --port $PORT`
5. Configure Environment Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`, `ALLOWED_ORIGINS` (comma-separated frontend origins), `MODAL_APP_NAME` (optional).

### Frontend (Vercel SSR, recommended)
1. Import the repository into Vercel and set the Root Directory to `frontend`.
2. Keep the Framework Preset as `Express`; `frontend/vercel.json` sets the Express preset, build command, and function include paths.
3. Build Command: `npm run build`; Install Command: `npm ci`.
4. Configure Environment Variables: `VITE_API_BASE_URL` (the direct Render backend URL), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. These are baked into the build, so rebuild after changing them.
5. Vercel Hobby is free for personal, non-commercial use. The Express app is deployed as one Vercel Function and uses Vercel's free function allowance within its monthly limits.
6. `npm run build` copies hashed browser assets from `dist/client/assets` to `public/assets`. Vercel serves `public/**` from its CDN; the Express function serves the SSR HTML. Do not add an SPA rewrite to the SSR deployment.
7. Set `ALLOWED_ORIGINS` on Render to the exact Vercel production origin. Do not proxy `/api` through Vercel because its proxy timeout is 120 seconds; point `VITE_API_BASE_URL` directly at Render.
8. Set the Supabase Auth Site URL and redirect URLs to the Vercel production origin, including `/verify-waiting`.

Vercel ignores `express.static()`, which is why the build copies browser assets into `public/assets`. The SSR function still reads `dist/client/index.html` and `dist/server/entry-server.js`; both are included by `frontend/vercel.json`.

#### Static fallback
If the Vercel Express SSR function cannot be deployed or fails, use the static SPA fallback:
1. Replace the contents of `frontend/vercel.json` with `frontend/vercel.static.json`.
2. Build Command becomes `npm run build:static`; Output Directory is `dist/static`; all routes rewrite to `/index.html`.
3. Redeploy. `src/main.tsx` detects the absence of server-rendered markup and mounts with `createRoot` instead of `hydrateRoot`.

The static fallback keeps all client behavior but loses SSR HTML and must still call the Render backend directly.

### Frontend (Render Node SSR, alternative)
1. Initialize a new Web Service and set the root directory to `frontend`.
2. Build Command: `npm ci && npm run build`
3. Start Command: `npm start`
4. Configure Environment Variables: `VITE_API_BASE_URL` (pointing to the Render backend), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. These are baked into the build, so rebuild after changing them.

The frontend renders on the server through `server.js` and hydrates in the browser. The anon key is used only for Supabase Auth; profiles, preferences, garments, recommendations, and try-on requests go through the backend. Never place `SUPABASE_SERVICE_ROLE_KEY` in any `VITE_*` variable.

## Setup and Development

### Local Execution
1. **Backend Integration:**
   `uvicorn backend:app --reload`
2. **Frontend Integration:**
   `cd frontend && npm install && npm run dev`

All backend routes except `/health` and `/username_available` require a Supabase access token in the `Authorization: Bearer <token>` header. Logging in triggers `/warmup`, which starts the Modal containers before the first try-on request. Keep RLS enabled on application tables; the frontend no longer queries them directly.

### Invitation-Only Access
1. Run `supabase/migrations/20261104000000_add_profile_approval.sql` in the Supabase SQL editor **before deploying the updated backend**. It adds `profiles.is_approved`, backfills existing profiles to approved, defaults new profiles to pending, and installs the signup trigger.
2. New signups get a pending profile automatically via the `auth.users` trigger, or on first login if the trigger is missing. A curator opens **Supabase Dashboard → Table Editor → profiles**, filters `is_approved = false`, and sets the row to `true`.

   ```sql
   select user_id, username, email from public.profiles where is_approved = false;
   ```

4. The migration enables RLS on `profiles`, drops existing profile policies, and revokes anon/authenticated access so only the backend service role and dashboard can read or write approval state. Keep it that way; do not add a policy that lets authenticated users update `is_approved`. Inspect existing policies with:

   ```sql
   select policyname, cmd, roles, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename = 'profiles';
   ```
3. Pending users see `/pending-approval` and cannot access onboarding, dashboard, garments, recommendations, or try-on until approved. The page checks again automatically every 15 seconds.

### Environment Configuration
Ensure all sensitive information is stored in non-committed `.env` files located at the root and within the `frontend/` directory as specified in the deployment documentation.

## Technical Documentation
Further details regarding specific API endpoints and architectural decisions can be found within the internal documentation files.
