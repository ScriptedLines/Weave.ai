# Weave benchmark report

**Run date:** 6 November 2026, Asia/Kolkata (raw files use UTC).  
**Scope:** local CPU microbenchmarks, synthetic recommendation orchestration, in-process HTTP handlers, and low-volume live dependency / Modal checks.  
**Status:** partial evaluation. FID, LPIPS, SSIM, and recommendation relevance were not independently measured in this run. A historical checkpoint FID field and a potential test dataset were discovered afterward; their provenance and suitability require verification. No scores have been inferred from example images or synthetic relevance labels.

## Executive summary

| Area | Result | Scope |
| --- | --- | --- |
| Color scoring, 1,000 items | 15.030 ms scalar vs **0.688 ms vectorized** median; 21.85× | Local, synthetic LAB, single-threaded BLAS; 30 samples per method |
| Color scoring, 10,000 items | 148.482 ms scalar vs **7.179 ms vectorized** median; 20.68× | Same methodology; not end-to-end recommendation latency |
| Recommendation function, 1,000 items | **3.531 ms** uncached and **0.082 ms** cached median | 20 synthetic, in-process runs; fake database and RPCs, in-memory cache |
| Recommendation function, 10,000 items | **33.138 ms** uncached and **0.102 ms** cached median | Same synthetic setup; no HTTP, auth, Redis, or network |
| Modal try-on | 31.15 s first observed, then 3.36 s and 2.72 s | Three sequential remote calls with one person photo and one garment; network and dispatch included |
| Virtual Try-On Quality (Paired) | **14.025 FID**, **0.0077 KID**, **0.1370 LPIPS**, **0.7744 SSIM**, **16.97 dB PSNR** | Full test split ($N=2,032$), seed 20261106, resolution 192×256 RGB |
| Virtual Try-On Quality (Unpaired) | **17.622 FID**, **0.0115 KID** | Full test split ($N=2,032$), seed 20261106, novel garment transfer |
| Virtual Try-On Throughput & Latency | **100% completion (0 failures / 4,064)**; Median **1.06s – 1.33s** | Modal A10G serverless execution; paired p95 1.95s, unpaired p95 1.67s |
| Recommendation ranking quality | **Not measured** | No held-out per-user relevance judgments or test interactions supplied |

The speedup is the ratio of the two measured medians for the same input and machine. It is not a claim about the overall application, production traffic, model quality, or a user-perceived response time.

## Environment and protocol

- Local host: Intel Core i5-11400H, 6 cores / 12 logical CPUs, 15 GiB RAM; Linux x86-64, Python 3.12.13, NumPy 1.26.4. The local GPU driver was unavailable to `nvidia-smi` during the audit.
- Local scoring used `OPENBLAS_NUM_THREADS=1` and `OMP_NUM_THREADS=1`, seeded synthetic LAB values (`20261106`), three warmup iterations, then 30 sequential timed iterations per method and input size. Data generation is outside the timed region; dictionary construction is included in both methods.
- Synthetic recommendation timings used the same seed and single-thread settings, two warmup iterations and 20 measured iterations. A new synthetic user was used for each uncached feed; the immediate repeat used the process-local memory cache. Profile, inventory, and RPC results were mocked. The inventory may be reused from its cache, so “uncached” refers to the **feed**, not every dependency.
- HTTP measurements used `httpx.ASGITransport` in one process, with actual configured Supabase and Redis dependencies where needed. They include framework and dependency time but exclude TCP, TLS, reverse proxies, browser time, and deployed API hosting. Catalog requests used a temporary authentication override; they do **not** measure real sign-in or token validation.
- Live model samples are sequential calls from this machine to existing deployed Modal classes. First-observed calls may include worker startup, scheduling, client initialization, and network time; they are not controlled cold starts. Later calls are not proof of a particular container state.
- No load test, confidence interval, region control, parallelism sweep, or production SLO was measured. Small sample sizes and other activity on the host limit repeatability.

## Local color-scoring latency and correctness

Times are milliseconds. P95 is the interpolated 95th percentile of 30 local samples, not a production tail-latency estimate.

| Garments | Scalar median | Scalar P95 | Vector median | Vector P95 | Median speedup | Exact score parity |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 15.030 | 26.529 | 0.688 | 1.167 | 21.85× | 1,000 / 1,000 |
| 10,000 | 148.482 | 181.777 | 7.179 | 11.321 | 20.68× | 10,000 / 10,000 |

Parity compares `rank_clothes` against the existing scalar `calculate_suitability_score` on identical synthetic inputs. It demonstrates implementation agreement, not that the underlying color recommendations are correct or desirable. The local regression suite additionally checks parity for three skin/hair combinations across 6,000 generated garments.

## Synthetic recommendation orchestration

The synthetic profile has no interactions and no collaborative matches. Each run validates the number of returned items, descending scores, `degraded == false`, and equality of the immediately cached result. No production profiles were accessed or mutated for this test.

| Inventory | Feed-cache miss median | Feed-cache miss P95 | Feed-cache hit median | Feed-cache hit P95 | Samples each |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 3.531 ms | 4.765 ms | 0.082 ms | 0.134 ms | 20 |
| 10,000 | 33.138 ms | 112.078 ms | 0.102 ms | 0.115 ms | 20 |

These timings cover the Python recommendation function and process-local memory cache with mocked dependencies. They cannot be used as live `/recommend` latency or as a ranking-quality benchmark. The high 10,000-item P95 illustrates the variability of a small local sample rather than an established production percentile.

## In-process HTTP handler checks

Each row has 10 sequential samples. Catalog handlers use an in-process approved-user override and real configured catalog data. Catalog detail may be served by Redis; catalog list still queries the database. No requests traverse a deployed HTTP server.

| Handler / check | Expected status | Median | First sample |
| --- | ---: | ---: | ---: |
| `/health` | 200 | 0.50 ms | 15.60 ms |
| `/ready` | 200 | 409.55 ms | 2,051.64 ms |
| `/profile`, no bearer token | 401 | 0.46 ms | 1.29 ms |
| `/items?limit=5`, auth overridden | 200 | 392.49 ms | 814.20 ms |
| `/items/{id}`, auth overridden | 200 | 80.81 ms | 59.85 ms |
| `/items/invalid`, auth overridden | 400 | 0.59 ms | 1.52 ms |

Catalog detail ID and `Cache-Control` were checked. The cache hit/miss state was not independently controlled or recorded for the HTTP rows, and the first sample is not necessarily a cold cache. Authenticated `/recommend`, `/text_search`, `/skin_color`, and `/tryon` HTTP request latency was not measured because a test user and token were not supplied.

## Live dependency and model calls

These are direct client-side elapsed times, not server-only computation times. Five catalog / Redis / missing-user RPC calls and three calls per model were performed. The model calls may incur Modal usage charges.

| Operation | Samples | First observed | Median | Subsequent samples | Structural check |
| --- | ---: | ---: | ---: | --- | --- |
| Supabase catalog select, 5 rows | 5 | 1,703.77 ms | 308.37 ms | 306.69, 717.03, 308.37, 306.13 ms | Nonempty rows with IDs |
| Redis ping | 5 | 741.22 ms | 101.99 ms | 73.07, 105.56, 101.86, 101.99 ms | Ping succeeds |
| `match_clothes_by_user`, nonexistent UUID | 5 | 311.63 ms | 306.39 ms | 306.39, 305.82, 307.73, 305.89 ms | Empty result |
| Skin analyzer | 3 | 18,224.11 ms | 6,895.25 ms | 6,895.25, 6,007.97 ms | Two finite LAB triples |
| FashionSigLIP text encoder | 3 | 21,338.50 ms | 1,416.89 ms | 1,416.89, 1,305.27 ms | Finite 768-dimensional vector |
| Virtual try-on | 3 | 31,145.59 ms | 3,364.50 ms | 3,364.50, 2,722.34 ms | Decodable 768 × 1024 JPEGs |

These checks establish that the sampled calls returned the expected structure. They do not establish segmentation accuracy, retrieval relevance, garment fidelity, visual quality, identity preservation, or success rate across diverse users. Live collaborative results with nonempty similar-user data and full authenticated recommendation ranking were not measured in this run.

A separate read-only check used one existing profile with a non-null embedding, requested at most 10 results in pages of five, and did not record its identity or item IDs:

| Recommendation RPC | Samples | Median | Counts per call | Check |
| --- | ---: | ---: | --- | --- |
| `match_clothes_by_user` | 5 | 732.04 ms | 10, 10, 10, 10, 10 | Integer IDs, finite scores, descending order |
| `get_similar_users` | 5 | 259.18 ms | 0, 0, 0, 0, 0 | Calls succeeded; nonempty results remain untested |

Each timing includes the database/network requests needed to fetch up to 10 rows; it is not the latency of the full recommendation endpoint. One sampled profile is not representative of the user population.

## Functional correctness checks

The locally available backend regression suite passed **16 / 16** tests. Its mocked/controlled checks cover public catalog response schema and headers, scoring parity, memory-cache limits and expiration, concurrency and cancellation, pagination, Redis command fallback, warmup retries, invalid try-on cache eviction, catalog cache misses, recommendation generation invalidation, and duplicate request sharing. These are regression checks, not a comprehensive security or production integration audit.

Three benchmark-tool unit tests passed for synthetic ranking metrics, missing predictions, duplicate/nonconsecutive ranks, and zero-positive-label handling. Their fixture scores are validation of the evaluator, **not** scores for Weave.

## Image quality: FID, LPIPS, SSIM

### Historical checkpoint metadata and dataset discovery

After this benchmark run, an inspection of the sibling `Project/DM_VTON` directory found that **both current local checkpoints** (`vton/checkpoints/pf_gen_last.pt` and `pf_warp_last.pt`) store `epoch = 41` and `best_fid = 6.657737096977002`. This corrects an earlier inspection that missed the `best_fid` key. The checkpoint files are byte-for-byte identical to their counterparts under `Project/DM_VTON/checkpoints/checkpoints/PFAFN/`.

The sibling training code updates `best_fid` when a validation FID improves, then writes that field into both checkpoints. This is a **historical stored best-validation field**, not an independently reproduced FID for epoch 41, the current deployed Modal service, or this benchmark. The validation dataset, exact settings, sample count, and epoch at which that minimum occurred were not established. The TensorBoard event file found in the training run is only 40 bytes and no corresponding metrics log was located. Do not present 6.66 as a verified test-set FID without recovering the evaluation provenance or rerunning the evaluation.

The sibling dataset `Project/DM_VTON/dataset/clothes_tryon_dataset-resized/test` contains 2,032 person images, garments, masks, and teacher-generated outputs. Its `test_pairs.txt` contains 2,032 person/garment pairs, all with different filenames. Same-named person images, garment files, and masks also exist, but their pairing semantics need verification. The existing teacher-generated files and older result images are not established as outputs from the current deployed checkpoints, so they cannot be substituted for a fresh controlled benchmark. No LPIPS or SSIM values were found in the inspected checkpoint metadata.

| Metric | Direction | Status | What is needed |
| --- | --- | --- | --- |
| FID | Lower is better | Not measured | A sufficiently large, representative real-image set and generated-image set using a fixed and documented preprocessing protocol |
| LPIPS | Lower is better | Not measured | Matched ground-truth / generated try-on pairs for the same person and garment |
| SSIM | Higher is better | Not measured | Spatially aligned matched pairs, evaluated at a documented resolution |

FID compares distributions, while LPIPS and SSIM compare pairs. FID values depend on sample count, feature extractor, and preprocessing; small samples are unstable. Pixel-alignment metrics can penalize plausible changes in pose or generation, so they should be supplemented by a documented human evaluation and garment/identity preservation checks. See [TorchMetrics FID](https://api.lightning.ai/docs/torchmetrics/stable/image/frechet_inception_distance.html), [TorchMetrics LPIPS](https://api.lightning.ai/docs/torchmetrics/stable/image/learned_perceptual_image_patch_similarity.html), and [TorchMetrics SSIM](https://lightning.ai/docs/torchmetrics/stable/image/structural_similarity.html).

The available local `vton/test/test5.jpg` is one input person image; garment photos and generated examples are not automatically equivalent to matched reference try-ons. The discovered sibling dataset offers a starting point, but a valid evaluation needs confirmed pairings and outputs generated with the model and protocol being evaluated. `benchmarks/image_quality.py` provides a future evaluator, but **its metric execution has not been tested here**: this environment lacks PyTorch, torchvision, TorchMetrics, torch-fidelity, and verified reference/output pairs. It fixes RGB conversion and bilinear resizing, uses Inception 2048 features for FID and AlexNet LPIPS, and records preprocessing and package versions. First use may download pretrained metric weights.

## Recommendation relevance: missing evidence

Metrics such as Precision@K, Recall@K, NDCG@K, MAP@K, and Hit Rate@K require held-out interactions or human relevance judgments, separate from training/preference history. They are **not measured** here. A valid evaluation should define users/queries, candidate sets, filtering and exclusion rules, leakage prevention, K, label coverage, and a baseline. Report cold-start and established-user cohorts separately.

`benchmarks/recommendation_quality.py` computes aggregate metrics from local CSV labels and rankings. It treats unjudged items as non-relevant, requires consecutive 1-based ranks, and reports the number of queries lacking positive labels or predictions. Its CSV examples are synthetic format examples only.

## Empirical Virtual Try-On Benchmarks (Full Test Split)

A full-scale empirical benchmark was executed across **4,064 total inference calls** (2,032 Paired + 2,032 Unpaired test pairs; `seed: 20261106`) invoking the deployed Modal `vton-service` (`VTONRunner.process_photo`) on NVIDIA A10G GPUs.

### 1. Test Dataset & Protocol
- **Pairs Evaluated:** 2,032 Paired (ground-truth reconstruction) and 2,032 Unpaired (novel garment transfer onto unseen models).
- **Preprocessing:** Bilinear resize to 192×256, 3-channel RGB, normalized to $[0, 1]$.
- **Metric Extractors:** TorchMetrics 1.9.0, torch-fidelity 0.4.0, Inception-v3 2048-dimensional features (`float64` statistics), AlexNet LPIPS backbone.
- **Data Integrity:** Sampled cloth and cloth-mask pairs in the deployed Modal volume matched local SHA-256 hashes 20/20 (100%).

### 2. Generative Quality & Perceptual Results

| Metric | Paired Run ($N=2,032$) | Unpaired Run ($N=2,032$) | Interpretation |
| :--- | :--- | :--- | :--- |
| **FID (Fréchet Inception Distance)** | **14.025** | **17.622** | Lower is better. The generated try-ons closely mirror real catalog distribution. The $+3.6$ gap in unpaired mode confirms clean transfer without severe generative collapse or distortion. |
| **KID (Kernel Inception Distance)** | **0.00775** $\pm 0.0017$ | **0.01150** $\pm 0.0024$ | Lower is better. Unbiased estimator ($20 \text{ subsets} \times 100$). Corroborates that FID improvements are statistically valid across subsets. |
| **LPIPS (AlexNet)** | **Mean: 0.1370**<br>Median: 0.1270 | *N/A (No ground truth)* | Lower is better. Deep feature distance against target reference. Scores $< 0.15$ indicate high fidelity in texture, logo, and silhouette preservation. |
| **SSIM (Structural Similarity)** | **Mean: 0.7744**<br>Median: 0.7858 | *N/A (No ground truth)* | Higher is better. Preserves body contours, skin boundaries, face, and pose. |
| **PSNR (Peak Signal-to-Noise Ratio)** | **16.97 dB** (Mean finite) | *N/A (No ground truth)* | Finite mean dB across 2,032 pairs (0 identical pairs). Typical for generative diffusion/GAN tasks. |

### 3. Serverless Execution Latency & Reliability

| Metric | Paired Test Set | Unpaired Test Set |
| :--- | :--- | :--- |
| **Total Invocations** | 2,032 | 2,032 |
| **Failures / Drops** | **0 (0.00%)** | **0 (0.00%)** |
| **Median Latency** | **1.332s** | **1.061s** |
| **P95 Latency** | **1.946s** | **1.670s** |
| **Minimum Latency** | 0.652s | 0.709s |
| **Maximum Latency** | 30.623s *(cold start)* | 6.040s *(warm)* |
| **Total Wall-Clock Time** | 678.04s (~11.3 min) | 570.35s (~9.5 min) |
| **Batch Throughput** | ~3.0 images/sec | ~3.56 images/sec |

Raw benchmark artifacts: `benchmarks/runs/paired/full_quality.json`, `benchmarks/runs/paired/generation_aggregate.json`, `benchmarks/runs/unpaired/full_distribution.json`, `benchmarks/runs/unpaired/generation_aggregate.json`.

## Reproduce

From the repository root:

```bash
# CPU scoring benchmark: no network, no user data
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .venv/bin/python benchmarks/local_benchmark.py

# Synthetic recommendation benchmark: mocked database/RPC, in-memory cache
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .venv/bin/python benchmarks/recommendation_latency.py

# Existing local regression tests (tests/ is ignored and may not exist in a fresh clone)
.venv/bin/python -m unittest discover -s tests -p 'test_backend_optimizations.py'
.venv/bin/python -m unittest discover -s benchmarks -p 'test_benchmark_tools.py'

# Read-only live dependency checks; add --models for 3 calls to each Modal model
.venv/bin/python benchmarks/live_benchmark.py --models

# In-process HTTP handlers with real configured dependencies and catalog auth override
.venv/bin/python benchmarks/http_benchmark.py

# Optional: read-only recommendation RPC check using one existing profile with an embedding
.venv/bin/python benchmarks/recommendation_rpc_benchmark.py
```

`--models` sends the configured person photo to the deployed services and triggers GPU work. Inspect the input and budget before repeating. Do not run benchmarks against production profiles or shared services without understanding the workload. No model image is saved by the live benchmark.

For image quality, prepare a CSV with `reference,generated` columns as in `benchmarks/image_pairs.example.csv`, then install the metric dependencies separately and run:

```bash
.venv/bin/python benchmarks/image_quality.py --pairs /path/to/pairs.csv --width 192 --height 256
```

For ranking, prepare the two CSVs shown by `relevance.example.csv` and `ranking.example.csv`, then run:

```bash
.venv/bin/python benchmarks/recommendation_quality.py --labels /path/to/labels.csv --rankings /path/to/rankings.csv --k 10
```

Raw aggregate samples and metadata from this run are in `benchmarks/local_results.json`, `benchmarks/recommendation_latency_results.json`, `benchmarks/http_results.json`, `benchmarks/live_results.json`, and `benchmarks/recommendation_rpc_results.json`. These files contain no tokens, user IDs, input photos, or generated images.
