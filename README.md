# Weave: AI-Driven Fashion Recommendation and Virtual Try-On System
Visit the website at: https://weave-curator.vercel.app/
Weave is a comprehensive platform designed for personalized fashion recommendations and high-fidelity virtual try-on (VTON). The system leverages high-dimensional vector embeddings, adaptive collaborative filtering, and cloud-based GPU inference to provide an intelligent outfitting experience.

## System Architecture

The project consists of three primary components integrated into a cohesive pipeline:

### 1. Frontend Infrastructure
*   **Technologies:** React 18, TypeScript, Vite, Tailwind CSS.
*   **Functions:** Handles aesthetic profile management, user DNA onboarding, and serves as the primary interface for real-time virtual try-on previews.

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
5. Configure Environment Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET`.

### Frontend (Vercel)
1. Initialize a new Project on Vercel.
2. Link the repository and set the root directory to `frontend`.
3. Configure the Build and Output settings (Framework Preset: Vite).
4. Configure Environment Variables: `VITE_API_URL` (pointing to the Render instance), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Setup and Development

### Local Execution
1. **Backend Integration:**
   `uvicorn backend:app --reload`
2. **Frontend Integration:**
   `cd frontend && npm run dev`

### Environment Configuration
Ensure all sensitive information is stored in non-committed `.env` files located at the root and within the `frontend/` directory as specified in the deployment documentation.

## Technical Documentation
Further details regarding specific API endpoints and architectural decisions can be found within the internal documentation files.
