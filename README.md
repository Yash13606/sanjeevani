# Sanjeevani: synthetic outbreak ML study

This repository contains the Sanjeevani React demonstration and a reproducible
college ML experiment in [ml/](ml/). The experiment studies two questions at a
weekly prediction time in a generated district world:

- **M1, early warning:** Will a new simulated outbreak start in the next seven days?
- **M2, detection:** Is a simulated outbreak active now?

All model training and test data are **synthetic**. The citizen, ASHA worker and
hospital dashboards read the saved synthetic model run (area scores, weekly case
counts and water/weather signals); their patient, case, survey and article
records are demo content. No score here establishes a real outbreak, patient
diagnosis, or drinking water safety.

The single project specification, dataset explanation, evaluation status, and
friend handoff are in [docs/SANJEEVANI_ML_PROJECT.md](docs/SANJEEVANI_ML_PROJECT.md).
A matching PDF is provided beside it.
The revised [research paper](docs/paper_fixed4.docx) describes the same synthetic
study and its single-world smoke test. Its title and three-student roster match
the supplied project presentation. Real-world validation and the full
multiworld study remain pending.
For the presentation revision, see the [Claude Code handoff](presentation/PPT_HANDOFF_FOR_CLAUDE.md)
and its two conceptual illustration assets in `presentation/assets/`.

## Folder structure

```
sanjeevani/
├─ src/, public/, index.html      React web app (citizen, ASHA worker and hospital dashboards, ML Lab)
├─ package.json + config files    Vite, TypeScript, Tailwind, ESLint and Vitest settings (must stay at the root)
├─ ml/                            Simulator, ML pipeline, tests and the local results service
├─ notebooks/                     sanjeevani_ml.ipynb, the Colab notebook (Review II and III analysis)
├─ docs/                          Project specification, research paper, and the original product spec
├─ presentation/                  Project deck, its build script and image assets
├─ results/                       Outputs downloaded from Colab runs (local only, git-ignored)
└─ archive/                       Superseded files (local only, git-ignored)
```

## Run on a Windows laptop

Install Python 3.12 or 3.13, Node.js 20 or newer, and Git. Then in PowerShell:

```powershell
git clone https://github.com/Yash13606/sanjeevani.git
cd sanjeevani
npm ci
npm run dev
```

Open `http://localhost:8080`. The dashboards use a small bundled snapshot of a
saved synthetic run until the local ML service is running (the amber bar at the
top says which source is in use; press Reload after starting the service). The
Simulation Lab page needs the service.

In a second PowerShell window, from the repository root:

```powershell
cd ml
.\setup.ps1
.\run.ps1 -Mode Test
.\run.ps1 -Mode Smoke
.\.venv\Scripts\python.exe service.py --verbose
```

The smoke run uses one independent world each for training, validation, and
testing. It is a **code check**, not the final study result. Outputs are written
under `ml/runs/smoke-<UTC timestamp>/`; the viewer reads the newest completed
run and listens on `127.0.0.1:8000`. Reload the Simulation Lab page.

For the planned 20/5/10 world experiment, use `.\run.ps1 -Mode Full` from
the `ml` directory after
reviewing the frozen `ml/config/simulation_config.yaml`. This is substantially
slower. The generated tables, model files, and metrics stay under a timestamped
`ml/runs/` folder and are intentionally excluded from Git. The exact command
and run manifest let another laptop reproduce them.

## What is included

- `ml/sanjeevani_sim/`: synthetic world and observation generator
- `ml/sanjeevani_ml/`: point-in-time features, labels, training and evaluation
- `ml/sanjeevani_ml/clustering.py`: unsupervised clustering (see below)
- `ml/config/`: smoke and full experiment settings and synthetic district units
- `ml/sample_data/`: 120 generated training-world rows for schema inspection only
- `ml/data_provenance.json`: real-source context and synthetic provenance
- `ml/service.py`: local read-only API for results, weekly area boards and saved-model replay on generated rows
- `ml/export_ui_snapshot.py`: writes the bundled snapshot (`src/data/mlSnapshot.json`) the dashboards use when the service is offline
- `notebooks/sanjeevani_ml.ipynb`: Colab notebook (clones this repository, runs the benchmark, then the Review II and III analysis)
- `src/`: React UI, including the dashboards and the Simulation Lab

The historical EpiClim, NFHS-5, and NASA POWER files used as context in earlier
work are not training inputs for this simulation-only version. The old hybrid
scores and model files are excluded from this repository.

## Clustering

Next to the supervised M1 / M2 models, `ml/sanjeevani_ml/clustering.py` adds six unsupervised clusterings. They
describe areas, weeks and events so people can see what kind of situation they are looking at; they never replace
the classifiers and never group people. All are fitted on the **training worlds only** and assigned to the
validation and test worlds. Outcome labels are used only to describe and check the clusters afterwards.

| Clustering | Method | Used for |
|---|---|---|
| Area archetypes | K-means on static unit profile | "Areas like yours" (citizen), planning groups (hospital) |
| Weekly regimes | K-means on weekly water, weather, case and sensor signals | "What kind of week is this" (all roles) |
| Surveillance blind spots | K-means on sensor uptime, lab recency, report completeness | How closely an area is watched, and how far to trust its scores |
| Seasonal patterns | K-means on each unit's 12-month OPD profile | Staffing and supply planning (ASHA, hospital) |
| Outbreak types | K-means on outbreak length, size, cholera share | Surge planning (hospital) |
| Hotspots | DBSCAN on neighbour-graph distance, Review tier only | Linked areas flagged in the same week |

K is chosen by silhouette plus split-half stability, not the elbow alone. Run it on a finished run with
`python -m sanjeevani_ml.clustering --run-dir runs/<run-id>`; `service.py` serves it at `/api/ml/clusters` and the
dashboards show it. The Colab notebook (`notebooks/sanjeevani_ml.ipynb`, Review III Part 4) reports each clustering
with its checks against the simulated truth.

## App checks

```powershell
npm run build
npm run lint
```

The Gemini chat is optional. Copy `.env.example` to `.env` only if you want
to configure local demo chat. Every `VITE_` value is visible in a browser
bundle, so never put a private server credential or real patient data there.
The previously tracked API key must be rotated by its owner; removing it from
the current files does not remove it from Git history.
