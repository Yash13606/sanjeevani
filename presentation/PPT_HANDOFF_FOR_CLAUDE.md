# Sanjeevani PPT handoff for Claude Code

## Task and current state

Edit the existing PowerPoint at `D:\ML for dataScience\ML PPT TEMPLATE.pdf.pptx` so it presents the **same ML project** as the revised paper and repository. The file is a valid 24-slide PPTX despite its `.pdf.pptx` name. The source deck has not been edited by Codex. It currently mixes an old water-potability classification project with an outbreak-warning concept. Replace the stale material, remove the blank slide, and make every result explicitly synthetic. Save a backup before replacing the source file. Export a PDF for visual checking, inspect every slide, and publish the finished PPTX to `presentation/` in the repository for the teammate who will clone it.

The repository root in this workspace is `D:\ML for dataScience\github_sanjeevani`. Paths below are relative to that directory unless an absolute path is shown. A teammate's clone can use the same relative paths.

The current paper at `D:\ML for dataScience\paper_fixed4.docx` and the repository copy `paper_fixed4.docx` already match the PPT cover title and team. **Use this exact title and roster in the deck and paper:**

> Sanjeevani: Early Warning of Water-Borne Disease Risk Using Machine Learning  
> A Synthetic Simulation Study

| Student | Register number |
| --- | --- |
| Ayush Kr. Burnwal | RA2411056010256 |
| Yash A | RA2411056010262 |
| Arya Phanase | RA2411056010308 |

The source cover omits a closing parenthesis for Ayush. Correct that typographical error. Do not reintroduce the former five-person paper author list.

## Source of truth

- Project explanation and reproduction instructions: `SANJEEVANI_ML_PROJECT.md` and the matching PDF.
- Synthetic-data declaration: `ml/data_provenance.json` (`classification: SYNTHETIC`, `real_world_validation: false`).
- Completed run configuration: `ml/config/smoke.yaml` (train seed 1001, validation 2001, test 3001).
- Configured but **unexecuted** larger study: `ml/config/simulation_config.yaml` (20 train, five validation, ten test worlds).
- Unit configuration: `ml/config/tamil_nadu_districts.yaml` (43 Tamil Nadu-style *simulated geographical units*, including smaller clusters; do not call them 43 observed official districts).
- Actual saved local smoke run: `ml/runs/smoke-final-20261104T045840Z/`. This folder is ignored by Git. On another laptop, regenerate with `ml/run.ps1 -Mode Smoke`.
- Exact prediction metrics: `ml/runs/smoke-final-20261104T045840Z/results/benchmark_metrics_summary.csv`.
- Exact event metrics: `ml/runs/smoke-final-20261104T045840Z/results/event_metrics_summary.csv`.
- Reproducibility details and artifact hashes: `ml/runs/smoke-final-20261104T045840Z/provenance_manifest.json` and `ml/runs/smoke-final-20261104T045840Z/results/run_manifest.json`.
- ML implementation: `ml/sanjeevani_sim/` and `ml/sanjeevani_ml/`.
- Demonstration: `src/pages/SimulationLab.tsx` and `ml/service.py`.
- The revised research paper: `paper_fixed4.docx`.

The historical EpiClim/IDSP, NFHS-5, NASA POWER, and old water-quality CSV files elsewhere in the workspace are background material from earlier exploration. They are **not** features, labels, or a real-data test for this final synthetic study.

## What the project actually does

The generator simulates daily weather, water-system conditions, exposure and cases, outbreak events, and delayed/noisy surveillance observations. A world spans 1 January 2017 to 31 December 2022 with a 365-day warm-up. There are 259 weekly end-of-Monday decisions from 1 January 2018 through 12 December 2022 for each of 43 simulated units. Each of three surveillance scenarios has 11,137 unit-week rows in one world. Baseline, improved, and enhanced scenarios vary observation availability and delay, but **share the same hidden event truth within that world**. Pooled scenario rows are correlated views of the same events.

At decision time `t`:

- **M1 early warning** scores a unit with no active operational outbreak. Its positive target is a **new simulated operational onset in `(t, t + 7 days]`**. A warning before this threshold may still occur after first simulated symptoms. Never call it prediction before infection.
- **M2 current detection** scores every unit-week. Its positive target is an **operational outbreak active at `t`**. A detection may precede a later simulated formal report while still occurring after onset. These are separate clocks.

The feature builder produces **34 as-of inputs** from simulated calendar/static traits, weather, water/sensor/lab observations, ASHA-style reports, outpatient activity, formal reports, and neighborhood context. It excludes future backfill and hidden truth. Training includes a seasonal baseline, a weather/water rule, a handwritten NumPy logistic regression, scikit-learn logistic regression and random forest, and XGBoost. Missing-value/scaling fit happens on training worlds. Model choice by average precision and alert thresholds happen on validation worlds. XGBoost was selected for both tasks in the completed smoke run.

The split is by **independent simulation seed/world**, not by chronological year or held-out geography. The full 20/5/10-world study has not run. The saved local Python service and React Simulation Lab inspect and replay **saved generated test rows**. Other role dashboards still show mock records. There is no live sensor feed, clinical diagnosis, public-health deployment, or automatic citizen alert proved by this ML work.

## Results allowed in the slides

Every results slide needs a visible qualifier such as **“Single synthetic test-world smoke run; no real-world validation.”** The numbers below come from the local saved CSV files. Do not reuse the earlier hybrid project scores or the PPT's water-potability statistics.

### One test world, each surveillance scenario

| Measure | Baseline | Improved | Enhanced |
| --- | ---: | ---: | ---: |
| M1 eligible unit-weeks | 8,197 | 8,197 | 8,197 |
| M1 positives | 428 | 428 | 428 |
| M1 positive prevalence | 5.22% | 5.22% | 5.22% |
| XGBoost M1 average precision | 0.514 | 0.548 | 0.575 |
| M2 eligible unit-weeks | 11,137 | 11,137 | 11,137 |
| M2 positives | 2,940 | 2,940 | 2,940 |
| M2 positive prevalence | 26.40% | 26.40% | 26.40% |
| XGBoost M2 average precision | 0.742 | 0.775 | 0.795 |

### Model comparison, three correlated scenario views pooled

| Model | M1 AP | M2 AP |
| --- | ---: | ---: |
| Seasonal baseline | 0.117 | 0.446 |
| Weather/water rule | 0.063 | 0.265 |
| Handwritten logistic regression | 0.464 | 0.724 |
| Library logistic regression | 0.503 | 0.743 |
| Random forest | 0.492 | 0.768 |
| XGBoost, selected on validation | 0.545 | 0.771 |

The pooled M1 and M2 test row counts are 24,591 and 33,411, respectively, because each scenario gives another view of one hidden world. Do not present these as independent district-weeks or use them for uncertainty intervals. Brier was measured but no separate probability calibration was fitted.

### Event timing at the validation target-recall threshold

| Event measure | Baseline | Improved | Enhanced |
| --- | ---: | ---: | ---: |
| M1 operational events warned | 290 / 427 | 304 / 427 | 303 / 427 |
| M1 median days **before operational onset** | 3 | 3 | 3 |
| M2 active events detected | 416 / 427 | 420 / 427 | 424 / 427 |
| M2 median days **after onset** | 4 | 4 | 3 |
| M2 detected while unreported | 395 / 424 | 352 / 370 | 233 / 254 |
| M2 median days **before formal report**, where report exists | 8 | 4 | 3 |

Ninety-two censored events per scenario were excluded from the event-recall denominator. The before-report median applies only to detected events that have a simulated report date. Event metrics use a validation target-recall threshold, which differs from the threshold maximizing F1.

## Recommended revised slide sequence

Use the source deck's 16:9 white academic canvas, deep-blue SRM/School of Computing marks, and restrained rules. A compact **19-slide** final deck is enough; remove duplicated potability literature and the empty slide. Use clear text rather than squeezing old tables into new content.

| New slide | Main content | Source slide(s) to adapt |
| --- | --- | --- |
| 1. Title and team | Exact title, subtitle, three names and IDs; cover concept image | 1 |
| 2. Problem | Weak, delayed water and health observations motivate areas-for-review ranking; do not claim real impact | 2, 14 |
| 3. Relevant research | 2–3 outbreak-warning studies, each with its own geography/target; short citations | 10–13; discard 3–4, 6–9 as project evidence |
| 4. Research question | Can as-of **simulated** observations help rank synthetic unit-weeks for review? | 15 |
| 5. Two prediction tasks | M1 onset within seven days among inactive units; M2 active now; native editable timeline | 16 |
| 6. Data provenance | 100% generated final training/test; EpiClim, NFHS-5, NASA POWER context only | New |
| 7. Synthetic world | 43 simulated units, daily 2017–2022, warm-up and generated event truth; world concept image | 17 |
| 8. Three observation scenarios | Baseline/improved/enhanced; shared truth, different reporting/sensor availability | 18 |
| 9. Decision and label timing | End of Monday; as-of cutoff; operational versus first-symptom onset; native editable timeline | New |
| 10. Feature construction | 34 grouped features; no hidden truth/future data | 20 |
| 11. Split and cohorts | One train/val/test world in smoke; 43 × 259 = 11,137 per scenario; M1/M2 eligibility and prevalence | 21 |
| 12. Model comparison | Six methods including scratch logistic; short readable equation if useful | 20 |
| 13. Evaluation protocol | Train preprocessing; validation model/threshold selection; one held-out synthetic test world | New |
| 14. Scenario results | Editable grouped chart or table for M1/M2 AP and prevalence | 22 |
| 15. Algorithm results | Editable table with the six AP pairs above; explain correlated pooled views | 22 |
| 16. Event timing | Keep operational-onset and formal-report clocks separate; show denominators | New |
| 17. Application demonstration | Actual Simulation Lab + local read-only API; saved-model replay on generated rows; mock role views | 18–19 |
| 18. Limits and remaining work | Simulator coupling, one test world, 20/5/10 run pending, external validation and human review pending | 23 |
| 19. References | Complete source details/DOIs plus repository/provenance | 24 |

## Source-slide changes to check

- **Slide 3** contains a literal `Your paragraph text` placeholder. Remove it.
- **Slide 5** is completely blank. Delete it.
- **Slides 3–4 and 6–9** describe static potability/WQI datasets, a binary `Potability` target, nine features, or SHAP/LIME work. Those are not this experiment. Remove or restrict to clearly labeled unrelated background if the course requires them.
- **Slides 10–13** are closer to the topic. Verify exact authors, titles, methods, and reported metrics against the publishers. Do not compare their real-data performance numerically with Sanjeevani's synthetic AP.
- **Slides 14–16** contain useful problem framing but overstate live IoT, 7–14-day forecasts, explanations, automatic alerts, and multilingual assistant as ML deliverables. State the implemented M1/M2 tasks and planned work separately.
- **Slide 17** is a flattened image/text composition about public-health impact. Rebuild with editable text and avoid claiming measured health outcomes.
- **Slide 18** is a flattened workflow image with a potability model and automatic citizen/ASHA/hospital actions. Rebuild with actual synthetic generator, observations, as-of features, M1/M2, saved test predictions, and a human-review-oriented demo.
- **Slides 19–20** describe real multisource ingestion, cloud/IoT stack, extra potability/anomaly models, SHAP, and complete alert validation. Replace with the executed synthetic pipeline and exact remaining gates.
- **Slide 21** is entirely the wrong dataset: 2,153 water samples, seven water parameters, and four water-risk classes. Replace with synthetic unit-week cohort and binary M1/M2 statistics.
- **Slide 22** charts the wrong four water-risk classes and EC–TDS correlation. Replace with native editable charts based on the saved result CSVs; do not fabricate a new correlation matrix.
- **Slide 23** has an image-based 12-week roadmap that implies deployment at the end. Mark actual completed work and pending full-run/real-data validation. Rebuild editable.
- **Slide 24** mainly cites potability/WQI papers. Use complete references relevant to the new study.
- Fix visible typos such as `INTRODUCTIO N`, `Sailent`, `Objevtives`, and `STASTICAL`, remove inconsistent old slide numbers, and avoid tiny overflowing literature tables.

## Generated illustration assets

These assets were generated for **conceptual presentation use**. They are not photographs of a Sanjeevani pilot, actual Tamil Nadu units, actual sensors, or measured results. Keep the original institutional logos from the source deck; do not fabricate or regenerate logos. Use each illustration once unless a background reuse is intentional.

| Asset | Suggested placement | Description |
| --- | --- | --- |
| `presentation/assets/cover_concept.png` | Slide 1, behind/right of title | 1672 × 941, wide RGB; South Indian-style water setting with left-side negative space. |
| `presentation/assets/synthetic_world_concept.png` | Slide 7, right of generator summary | 1672 × 941 RGBA with transparent background; illustrative world diorama. |

Make prediction timelines, workflow boxes, sample tables, and numerical results charts as **editable PowerPoint objects** using the verified numbers. Do not use image generation for quantitative charts, maps that pretend to show actual unit geography, or model outputs.

## Primary references for a short literature slide

- A. M. Campbell et al., “Cholera Risk: A Machine Learning Approach Applied to Essential Climate Variables,” *International Journal of Environmental Research and Public Health* 17(24), 9378 (2020), https://www.mdpi.com/1660-4601/17/24/9378. Its environmental cholera-risk result is not Sanjeevani performance.
- A. H. Chowdhury and M. S. Rahman, “Machine learning and spatio-temporal analysis of meteorological factors on waterborne diseases in Bangladesh,” *PLOS Neglected Tropical Diseases* (2025), https://journals.plos.org/plosntds/article?id=10.1371/journal.pntd.0012800. The paper uses yearly aggregated district disease counts from 2017–2020; it is not a weekly outbreak forecast.
- A. K. Sahai et al., “Development of a probabilistic early health warning system based on meteorological parameters,” *Scientific Reports* (2020), https://www.nature.com/articles/s41598-020-71668-6. Its reported outlook and validation setting differ from this simulator.
- I. Villanueva-Miranda et al., “Artificial intelligence in early warning systems for infectious disease surveillance: a systematic review,” *Frontiers in Public Health* (2025), https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2025.1609615/full.
- J. S. Brownstein, C. C. Freifeld, and L. C. Madoff, “Digital Disease Detection—Harnessing the Web for Public Health Surveillance,” *New England Journal of Medicine* 360:2153–2157 (2009), https://www.nejm.org/doi/full/10.1056/NEJMp0900702.
- G. Kaur et al., *EpiClim* dataset, Zenodo (2024), https://zenodo.org/records/14580510. Cite as historical context, **not as model training data**.
- F. Pedregosa et al., “Scikit-learn: Machine Learning in Python,” *JMLR* 12:2825–2830 (2011), https://jmlr.org/papers/v12/pedregosa11a.html.
- T. Chen and C. Guestrin, “XGBoost: A Scalable Tree Boosting System,” *KDD* (2016), https://doi.org/10.1145/2939672.2939785.

## Delivery checks for Claude

1. Back up the source PPTX. Edit the PPTX itself or save the final under a clear name and update the source file the user will open.
2. Keep the title/team identical to the paper and the source cover. Treat the two generated illustrations as conceptual artwork.
3. Remove the old water-potability dataset, four-class chart, placeholder, empty slide, and unsupported deployment claims. Search slide text and speaker notes for these terms after editing.
4. Read numbers from the saved CSV files. Label every result as a single synthetic test-world smoke run and keep the two event clocks distinct.
5. Preserve editability for tables, charts, timelines, and workflow. Preserve SRM and School of Computing marks and their proportions.
6. Export to PDF and inspect every slide at presentation size for overflow, tiny text, misleading figures, missing citations, and image cropping.
7. Save the finished PPTX into `presentation/` and push it to `https://github.com/Yash13606/sanjeevani` so the teammate can continue on another laptop. Include the generated assets used by the deck.
