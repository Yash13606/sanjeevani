# Sanjeevani: synthetic outbreak ML study

This repository contains the Sanjeevani React demonstration and a reproducible
college ML experiment in [ml/](ml/). The experiment studies two questions at a
weekly prediction time in a generated district world:

- **M1, early warning:** Will a new simulated outbreak start in the next seven days?
- **M2, detection:** Is a simulated outbreak active now?

All model training and test data are **synthetic**. The dashboard is a prototype;
its existing role views contain mock records. No score here establishes a real
outbreak, patient diagnosis, or drinking water safety.

The single project specification, dataset explanation, evaluation status, and
friend handoff are in [SANJEEVANI_ML_PROJECT.md](SANJEEVANI_ML_PROJECT.md).
A matching PDF is provided beside it.

## Run on a Windows laptop

Install Python 3.12 or 3.13, Node.js 20 or newer, and Git. Then in PowerShell:

```powershell
git clone https://github.com/Yash13606/sanjeevani.git
cd sanjeevani
npm ci
npm run dev
```

Open `http://localhost:8080`. The Simulation Lab page will show an unavailable
state until an ML run has finished and the local viewer is started.

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
- `ml/config/`: smoke and full experiment settings and synthetic district units
- `ml/sample_data/`: 120 generated training-world rows for schema inspection only
- `ml/data_provenance.json`: real-source context and synthetic provenance
- `ml/service.py`: local read-only API for results and saved-model replay on generated rows
- `src/`: React UI, including the Simulation Lab

The historical EpiClim, NFHS-5, and NASA POWER files used as context in earlier
work are not training inputs for this simulation-only version. The old hybrid
scores and model files are excluded from this repository.

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
