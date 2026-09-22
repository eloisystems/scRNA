# CellAudit

**A Single-Cell RNA Sequencing Analysis Engine**  
*From raw sequencing reads to explainable, interactive single-cell insights*

---

## Overview

CellAudit is a config-driven, reproducible scRNA-seq analysis engine that takes a cell count matrix as input and produces fully annotated, interactively visualised, and mathematically explained cluster outputs — without any manual scripting by the user.

Its defining features are:

- **Three selectable mathematical backends** — Linear (PCA), Kernel (KernelPCA / SIMLR-inspired), and Neural Network (Variational Autoencoder) — switchable with a single YAML config line.
- **Automated SHAP-based explainability** — every cluster receives a mathematical explanation of which genes drove its identity, not just a label.
- **YAML-driven reproducibility** — every analysis parameter is recorded in a config file, enabling exact replication of any run.
- **Browser-accessible interface** — a Streamlit MVP and Next.js production UI let non-coding researchers upload data and view results without writing any code.
- **Lightweight and self-hostable** — designed to run locally on CPU, making it viable in low-bandwidth, resource-constrained research environments.

---

## Background: What Is scRNA-seq?

Single-cell RNA sequencing (scRNA-seq) measures gene activity in each individual cell of a tissue sample, separately. Traditional sequencing averages the signal of millions of cells together — scRNA-seq gives every cell its own readout.

The wet-lab process captures individual cells in oil droplets, tags each cell's mRNA with a unique DNA barcode, sequences the tagged molecules on an Illumina machine, and writes the output to a FASTQ file. That raw file is pre-processed by **Cell Ranger** (10x Genomics) into a **count matrix** — a table where each row is a cell, each column is a gene, and each value is how many times that gene was detected in that cell.

> **CellAudit starts from the count matrix.** The FASTQ → Cell Ranger step is a prerequisite, not part of the engine.

A typical count matrix is **5,000–20,000 cells × 20,000–33,000 genes**, with 90–99% of entries being zero (sparse by design, not error). The goal of the analysis pipeline is to group cells into biologically meaningful clusters, label them by cell type, and explain what drives each grouping.

---

## The Problem: Gaps in Existing Tools

| Existing Tool | Limitation |
|---|---|
| **Seurat (R)** | R-only; slow on large datasets; no built-in explainability. |
| **Scanpy (Python)** | A library, not a pipeline — researchers write the same boilerplate every project, choose parameters manually, no standard output format. |
| **Cell Ranger (10x)** | Handles FASTQ → count matrix only; proprietary and hardware-specific. |
| **Galaxy / Orange3** | Browser-based but slow, generic, poor scalability beyond small datasets. |

### Specific Gaps CellAudit Addresses

| Gap | CellAudit's Solution |
|---|---|
| No selectable math backend | Three backends (linear, kernel, NN) behind a single API. |
| No built-in explainability | XGBoost + SHAP attribution per cluster. |
| Not config-driven or reproducible | Every parameter encoded in YAML; re-run identically from a config file. |
| No accessible web interface | Streamlit MVP + Next.js production dashboard. |
| Poor accessibility in low-resource contexts | Self-hostable, runs on CPU, no cloud dependency. |

---

## The CellAudit Pipeline

```
INPUT
  └─ Stage 0:  Ingest        →  Load MEX / H5AD / Loom / CSV → AnnData
  └─ Stage 1:  QC            →  Filter dead cells, doublets, low-quality genes
  └─ Stage 2:  Normalise     →  CP10k / log1p / SCTransform
  └─ Stage 3:  Feature Select → Identify 2,000–5,000 Highly Variable Genes
  └─ Stage 4:  Dim. Reduce   →  [LINEAR | KERNEL | NEURAL NETWORK] backend
  └─ Stage 5:  Build Graph   →  k-nearest-neighbour graph (hnswlib / pynndescent)
  └─ Stage 6:  Cluster       →  Leiden algorithm (multi-resolution sweep)
  └─ Stage 7:  Annotate      →  CellTypist / marker-based / manual CSV override
  └─ Stage 8:  DE & GSEA     →  Wilcoxon / DESeq2 + gseapy pathway enrichment
  └─ Stage 9:  Explain       →  XGBoost classifier + SHAP attribution per cluster
  └─ Stage 10: Report        →  Interactive UMAP + HTML report + YAML config export
OUTPUT
```

### Stage 1 — Quality Control
Six metrics per cell (gene count, UMI total, % mitochondrial reads, % ribosomal reads, doublet score via Scrublet, and min cells per gene) are computed and filtered using **MAD-based adaptive thresholds** rather than hard-coded cutoffs. Cells with >20% mitochondrial reads or doublet scores above 0.25 are removed.

### Stage 2 — Normalisation
Default: Library-size normalisation (CP10k) followed by log1p transformation. The Kernel and Neural Network backends use SCTransform (Pearson residuals) by default for more statistically robust correction.

### Stage 3 — Feature Selection
~2,000–5,000 Highly Variable Genes (HVGs) — those showing the most cell-to-cell variation — are retained. This reduces noise, lowers computational cost, and improves cluster quality.

### Stage 6 — Clustering
The **Leiden algorithm** (current gold standard, replacing Louvain) performs community detection on the kNN graph. CellAudit automatically sweeps across multiple resolution values (0.3, 0.5, 0.8, 1.0) and reports all results.

### Stage 7 — Cell Type Annotation
Automated via **CellTypist** (logistic regression trained on Human Cell Atlas), supplemented by marker gene lookup against CellMarker 2.0. Manual override via a user-supplied CSV is supported.

### Stage 8 — Differential Expression & GSEA
- **DE**: Wilcoxon rank-sum test (default) or negative binomial model (pydeseq2), with Benjamini-Hochberg FDR correction.
- **GSEA**: Pathway enrichment via gseapy against MSigDB, outputting NES, FDR p-value, and bar charts per comparison.

---

## Three Mathematical Backends

This is CellAudit's defining differentiator. All three backends feed into the same downstream stages (graph → cluster → annotate → explain). Switching backend requires changing one line in the YAML config.

### Backend A — Linear (PCA)
Uses Principal Component Analysis to project each cell's 3,000-gene HVG profile into 50 principal components. Fast, reproducible, directly comparable to published Scanpy/Seurat results. **Best for:** clean, well-separated datasets; when reproducibility and literature comparability matter most.

### Backend B — Kernel (KernelPCA / SIMLR-inspired)
Uses a Radial Basis Function (RBF) kernel to capture nonlinear relationships that linear PCA misses. Cell differentiation follows curved, branching trajectories through gene expression space — linear methods flatten these curves. **Best for:** developmental biology data; datasets where PCA produces overlapping clusters that should be distinct.

### Backend C — Neural Network (Variational Autoencoder)
A PyTorch VAE (Encoder: 3,000 → 512 → 256 → 20 latent dims; Decoder: 20 → 256 → 512 → 3,000) learns a compressed, denoised representation of each cell. The latent space filters out dropout noise while preserving biological signal. **Best for:** high-sparsity datasets; large datasets (>50k cells) where VAE denoising provides cleaner separation than PCA.

> **How to choose:** Start with Linear. If the UMAP produces overlapping clusters where distinct ones are expected, switch to Kernel. If the dataset is large or very sparse, try Neural Network.

---

## Explainability: SHAP Attribution

Standard pipelines stop at cluster labels and marker gene tables. CellAudit adds a mathematical explanation layer via **SHAP (SHapley Additive exPlanations)**.

**How it works:**
1. An **XGBoost classifier** is trained to predict cluster membership from each cell's gene expression profile (80/20 train/test split; target >85% accuracy on the PBMC 3k benchmark).
2. **SHAP values** are computed for every cell and every gene using `shap.TreeExplainer`. SHAP fairly distributes the "credit" for each cluster assignment among all genes — genes that contributed strongly to the decision receive high SHAP values; irrelevant genes receive values near zero.

**Outputs per cluster:**
- SHAP summary beeswarm plot (gene × impact direction)
- Top 20 genes by mean absolute SHAP value (the mathematical marker gene list)
- Silhouette score (how cleanly the cluster separates from neighbours); clusters scoring <0.15 are automatically flagged for review
- Per-cell waterfall plot showing why that specific cell was assigned to its cluster

---

## System Architecture

CellAudit uses a standard client-server architecture.

```
Browser (Streamlit MVP / Next.js)
       │
       │  REST API (FastAPI)
       ▼
┌──────────────────────────┐
│  POST /jobs/submit        │  ← file + YAML config
│  GET  /jobs/{id}/status   │  ← polling every 5s
│  GET  /jobs/{id}/results  │  ← Plotly JSON + tables
└───────────┬──────────────┘
            │  Celery task queue
            ▼
        Redis queue
            │
            ▼
    Celery Worker
    (runs scrna/ pipeline)
            │
            ▼
    Output: .h5ad + HTML report + YAML config
```

Celery + Redis decouple the API from the analysis: a full pipeline run on 10,000 cells takes 5–20 minutes, which would time out a synchronous HTTP request. The frontend polls for status and fetches results when the job completes.

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Core pipeline** | Python 3.11, Scanpy, AnnData | Pipeline orchestration and data model |
| **Linear backend** | scikit-learn PCA | Standard dimensionality reduction |
| **Kernel backend** | scikit-learn KernelPCA | Nonlinear dimensionality reduction |
| **NN backend** | PyTorch, scvi-tools | Variational Autoencoder |
| **Clustering** | leidenalg, igraph | Leiden community detection |
| **Annotation** | CellTypist | Automated cell type labelling |
| **DE / GSEA** | pydeseq2, gseapy | Differential expression and pathway analysis |
| **Explainability** | XGBoost, shap | SHAP attribution per cluster |
| **Visualisation** | Plotly | Interactive UMAP and analysis charts |
| **API** | FastAPI, Pydantic | REST backend |
| **Task queue** | Celery, Redis | Background job execution |
| **UI (MVP)** | Streamlit | Rapid browser interface |
| **UI (production)** | Next.js, Tailwind, shadcn/ui | Polished multi-user dashboard |
| **Config** | YAML + Pydantic | Reproducibility and parameter validation |
| **Dependency management** | uv | Fast, reproducible Python environments |

---

## Project Structure

```
cellaudit/
├── scrna/                    # Core pipeline package
│   ├── io.py                 # Stage 0: data ingestion
│   ├── qc.py                 # Stage 1: quality control
│   ├── norm.py               # Stage 2: normalisation
│   ├── features.py           # Stage 3: HVG selection
│   ├── backends/
│   │   ├── linear.py         # PCA backend
│   │   ├── kernel.py         # Kernel PCA backend
│   │   └── neural.py         # VAE backend (PyTorch)
│   ├── graph.py              # Stage 5: kNN graph
│   ├── cluster.py            # Stage 6: Leiden / Louvain / k-Means
│   ├── annotate.py           # Stage 7: CellTypist + manual override
│   ├── de.py                 # Stage 8: DE + GSEA
│   ├── explain.py            # Stage 9: XGBoost + SHAP
│   ├── plot.py               # Stage 10: Plotly figures
│   ├── report.py             # Stage 10: Jinja2 HTML report
│   └── pipeline.py           # Orchestrator (runs all stages)
├── api/
│   ├── main.py               # FastAPI entry point
│   ├── routes/jobs.py        # /jobs/* endpoints
│   ├── models.py             # Pydantic schemas
│   └── tasks.py              # Celery task definitions
├── ui/app.py                 # Streamlit MVP
├── frontend/                 # Next.js production UI
├── tests/                    # pytest test suite
├── configs/                  # Example YAML configs
│   ├── linear_default.yaml
│   ├── kernel_advanced.yaml
│   └── nn_denoising.yaml
├── pyproject.toml
└── README.md
```

---

## Goals & Key KPIs

| KPI | Target | Deadline |
|---|---|---|
| Data ingestion speed | Load PBMC 3k in <5 seconds | Week 1 |
| QC filtering accuracy | ~2,600 cells remain from PBMC 3k (matches published Scanpy result) | Week 1 |
| All three backends producing UMAP | ≥8 distinct clusters; silhouette >0.25 (Linear), >0.20 (NN) | Week 2 |
| Cell type annotation | CellTypist correct on ≥7 of 8 known PBMC cell types | Week 3 |
| SHAP accuracy | Top SHAP gene for B-cell cluster = CD79A or MS4A1 | Week 3 |
| API response time | `POST /jobs/submit` returns job_id in <1 second | Week 4 |
| Full pipeline runtime | Linear backend on PBMC 3k completes in <3 minutes (CPU) | Week 4 |
| Test coverage | ≥75% line coverage across `scrna/` | Week 4 |
| HTML report | Self-contained, viewable offline, <10 MB | Week 4 |

---

## Four-Week Roadmap

| Week | Focus | Key Deliverable |
|---|---|---|
| **1** | Foundation, ingestion, QC | Working QC pipeline on PBMC 3k; YAML config system; per-stage AnnData checkpointing |
| **2** | Three backends + clustering | All three backends produce valid UMAP and Leiden clusters; backend switcher in `pipeline.py` |
| **3** | Annotation, DE, GSEA, SHAP | CellTypist labels; marker gene tables; GSEA pathway reports; XGBoost + SHAP per cluster; HTML report |
| **4** | API, UI, testing, docs | FastAPI + Celery backend; Streamlit UI; ≥75% test coverage; full README; v1.0.0 tagged in Git |

**Benchmark dataset:** PBMC 3k (2,700 peripheral blood mononuclear cells, 10x Genomics) — publicly available, fully documented, with published ground-truth cluster labels for direct validation.

---

## Output Formats

Every pipeline run produces:

| Output | Format |
|---|---|
| Interactive UMAP | Plotly scatter (colour by cluster / cell type / gene / QC metric) |
| QC summary | Violin and scatter plots of all QC metrics (before and after filtering) |
| Marker gene table | Top 10 genes per cluster: gene name, log2FC, adjusted p-value, SHAP score |
| GSEA pathway report | Bar charts of top enriched/depleted pathways per comparison; CSV export |
| SHAP explanation cards | Per-cluster: top 20 genes by SHAP value, silhouette score, CellTypist label |
| Final AnnData | `.h5ad` file with all computed results embedded (shareable, re-loadable in Scanpy/Seurat) |
| HTML report | Self-contained, offline-viewable, <10 MB |
| Pipeline config | `.yaml` file recording every parameter used — re-run identically by another researcher |

---

## Key Terms

| Term | Plain English |
|---|---|
| **AnnData** | The Python data container for scRNA-seq: count matrix + cell metadata + gene metadata + all computed results in one object. |
| **Count matrix** | Rows = cells, Columns = genes, Values = UMI counts. The primary input to CellAudit. |
| **UMI** | Unique Molecular Identifier — a short DNA barcode that prevents counting the same mRNA molecule twice after PCR amplification. |
| **HVG** | Highly Variable Gene — a gene that varies meaningfully across cells, carrying signal for cluster distinction. |
| **UMAP** | 2D visualisation where similar cells are placed close together. A visualisation tool only — not an analysis method. |
| **Leiden** | Graph-based clustering algorithm; current gold standard for scRNA-seq. Finds communities of cells in the kNN graph. |
| **SHAP** | SHapley Additive exPlanations — a game-theory method that fairly attributes a model's prediction to each input feature (gene). |
| **Silhouette score** | Measures how cleanly a cluster separates from its neighbours. Range: -1 to +1; scores <0.15 are automatically flagged. |
| **VAE** | Variational Autoencoder — a neural network that compresses data into a compact latent space, denoising it in the process. |
| **GSEA** | Gene Set Enrichment Analysis — tests whether a set of biologically related genes is significantly up- or down-regulated between two conditions. |
| **MAD** | Median Absolute Deviation — a robust spread measure used for adaptive QC thresholds. |
| **Doublet** | Two cells captured in the same droplet; produces a hybrid barcode that must be identified and removed before analysis. |

---

*CellAudit v1.0 — September 2026*  
*The first scRNA-seq pipeline to combine three selectable mathematical backends, automated SHAP-based explainability, YAML-driven reproducibility, and a self-hostable browser interface.*
