# Weave: Autonomous AI Fashion Recommendation Pipeline

Weave is a full-stack, AI-native virtual try-on and recommendation platform. It features autonomous semantic matching, adaptive collaborative filtering, and on-demand cloud GPU integration for seamless fashion generation.

## 🚀 System Architecture

1. **Frontend (Vercel)**
   - **Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS
   - **Key Features:** Aesthetic component tracking, DNA onboarding, real-time Virtual Try-On previews.

2. **Backend Engine (Render)**
   - **Tech Stack:** FastAPI, Python, pgvector, NumPy.
   - **Key Features:** REST endpoints handling math-heavy aesthetic vector manipulation, peer-to-peer collaborative weights, and Cloud GPU handshakes.
   
3. **Cloud GPU Inference (Modal)**
   - **Models:** SigLIP (for feature scaling & matching), YOLO/Human-Parsing Models (for DNA profiling), Custom VTON.
   - **Function:** Receives dynamic instructions from the FastAPI engine, crunches heavy tensor models, and streams bytes securely back to the frontend.

4. **Database (Supabase)**
   - **Role:** Centralized memory vault. Handles all users, relationships, semantic fashion items (`pgvector`), and dynamically calculated aesthetic `w1/w2/w3` limits natively.

## 🛠 Features Native to the Pipeline

- **Self-Balancing Recommender:** Automatically updates your 768-D design vectors using `np.mean()` vector math whenever you interact with the UI.
- **Dynamic Content & Collaborative Matrix:** Merges Color Similarity vs. Peer Similarity weights to ensure your recommendations are specifically tailored.
- **Semantic Text Search:** Uses high-fidelity prompt generation via OpenAI/SigLIP to map vague text styles ("blue linen shirt for vacation") directly into high-dimensional geometric spaces against the inventory.

## 📦 Deployment Instructions

### 1. Deploying the Backend (Render API)
1. Commit this entire repository to GitHub.
2. Sign into [Render.com](https://render.com/) and create a new **Web Service**.
3. Connect your GitHub repository.
4. **Configuration Settings:**
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables:** Map the following from your local `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MODAL_TOKEN_ID`
   - `MODAL_TOKEN_SECRET`
6. Click **Deploy**. Render will grant you a URL `(e.g., https://weave-backend.onrender.com)`.

### 2. Deploying the Frontend (Vercel)
1. Ensure your Render backend URL is copied.
2. Sign into [Vercel](https://vercel.com/) and create a **New Project**.
3. Import the exact same GitHub repository.
4. **Configuration Settings:**
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend` (crucial: ensure you hit "Edit" and change this to `frontend`).
   - **Install Command:** `npm install`
   - **Build Command:** `npm run build`
5. **Environment Variables:**
   - `VITE_API_URL` -> Set this to your new **Render URL** (e.g., `https://weave-backend.onrender.com`).
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**. Vercel will install dependencies, build the React bundle, and map it to a global edge network.

## 🔐 Environment Variables Blueprint
Do not commit `.env`! You will need a `.env` in the root folder for python, and a `.env` in the `frontend` folder for Vite.

```env
# ROOT FOLDER (backend)
SUPABASE_URL="YOUR_URL"
SUPABASE_SERVICE_ROLE_KEY="YOUR_KEY"
MODAL_TOKEN_ID="ak-..."
MODAL_TOKEN_SECRET="as-..."

# FRONTEND FOLDER (/frontend)
VITE_SUPABASE_URL="YOUR_URL"
VITE_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
VITE_API_URL="http://localhost:8000" # Remember to change to Render URL in Prod
```

## 🧪 Running Locally
1. Startup Backend: `uvicorn backend:app --reload`
2. Startup Frontend: `cd frontend && npm run dev`
