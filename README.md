# Brain–behavior readout audit

A research demonstration prepared by Cathy Liu with AI-assisted implementation. It examines how much a simple linear readout adds beyond a mean-only baseline when applied to published brain-state/behavior pairs from Cai, Taghia and Menon (2024). This is not an official Stanford or SCSNL project.

The website is static. `analysis.py` regenerates `analysis.json` and `data.js`; the browser does not train a model or transmit observations.

## Inputs and scope

The analysis plan fixes seven primary sheets and one stop-signal sensitivity sheet from the authors’ original source-data workbook. Every available pair in these sheets is retained. There is no imputation, participant-ID reconstruction, cross-sheet participant join, or raw MRI/MAT analysis. A displayed row number identifies a row of the named Excel sheet, not a person.

| Source sheet | Task | Exported pairs | Nominal cohort |
|---|---|---:|---:|
| Figure3e | AX-CPT | 50 | 50 |
| Figure3f | Cued task switching | 49 | 50 |
| Figure3g | Sternberg working memory | 50 | 50 |
| Figure3h | Stroop | 48 | 50 |
| Figure5b | Stop-signal | 44 | 45 |
| Figure7c | Relational processing, session 1 | 90 | 90 |
| Figure7d | Relational processing, session 2 | 87 | 90 |
| FigureS22b | Stop-signal, alternative ROI definition | 44 | 45 |

The four DMCC tasks share a cohort. The two HCP sessions share a cohort. The alternative ROI analysis reuses the stop-signal observations. These are not independent replications, and their counts must not be summed as unique participants. Supplementary Methods section H reports an exclusion rule of at least 3 standard deviations from the mean for univariate analyses. This audit retains every exported pair; it does not reconstruct the exact exclusion mask or apply further filtering.

Column A is shared-state occupancy, a fraction. Column B is the authors’ task-specific performance index, retained in **source units**. Supplementary Table S9 defines the underlying measures: AX-CPT uses a normalized AY–BX reaction-time difference; cued switching and Stroop use congruent-minus-incongruent reaction time; Sternberg and relational processing use accuracy/reaction time; stop-signal uses inverse stop-signal reaction time. The supplied normalization is not fully documented for every task. These are univariate indices, not the publication’s multivariate CCA scores. Absolute errors are therefore not comparable across tasks.

## Analysis and interpretation

The authors already evaluated multivariate CCA using leave-one-out prediction. This demonstration is a complementary single-feature, mean-baseline and influence audit, not the first test of individual prediction and not a replacement for their multivariate analysis.

For each sheet, calculate Pearson correlation and ordinary least squares with an intercept. Then leave out each row in turn, fit on the remaining rows, and predict the omitted outcome. Compare these predictions with the **training rows’ mean**, using RMSE and MAE. Positive percentage improvement means lower error than that baseline. The range of correlations after one-row omissions is an influence diagnostic, not a confidence interval.

Only this linear readout is held out. The published brain states, feature selection, original filtering and behavioral transformations are already fixed and may use the whole sample. This is **conditional leave-one-out evaluation**, not validation of the full imaging pipeline, external validation, clinical prediction, or evidence about within-person mechanisms.

The stop-signal example has 44 pairs: correlation 0.339 and conditional RMSE improvement 2.72%. The alternative ROI definition gives 0.317 and 2.36%, respectively. The alternate definition uses working-memory meta-analysis ROIs plus the original PCC/VMPFC regions. These modest changes do not establish clinical usefulness.

## Reproduce

From this repository, with Python 3.12 installed:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python analysis.py
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python analysis.py --check
.venv/bin/python -m http.server 8000
```

Open `http://localhost:8000`. The unchanged workbook is included in `inputs/`; its SHA-256 is checked before use. Regeneration also fetches one fixed upstream script and verifies its hash before executing its reviewed CCA recipe. An offline run can supply that exact file with `--upstream-source /path/to/brainbehav_cca.py`; the hash check still applies. `--check` recomputes outputs and fails if they differ from the checked-in files.

The upstream check uses only the AX-CPT sheet’s single occupancy and outcome columns. Four configuration assignments are substituted in memory. Its first canonical correlation agrees with the absolute Pearson correlation. This exercises the published code recipe; it does **not** reproduce the paper’s original multivariate CCA or fit BSDS. The upstream code is not vendored here.

## Sources and reuse

- Cai, W., Taghia, J. & Menon, V. (2024). [A multi-demand operating system underlying diverse cognitive tasks](https://doi.org/10.1038/s41467-024-46511-5). *Nature Communications*, 15, 2185. [Official lab publication listing](https://med.stanford.edu/scsnl/publications.html).
- Original source workbook: `41467_2024_46511_MOESM3_ESM.xlsx`, included unchanged; obtained through the [EuropePMC supplementary bundle](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC10928152/supplementaryFiles). SHA-256: `469d69d4303c7321c093f19d5f390293fb55b10cb6b02673ca7afc34269f90ee`.
- [Upstream repository](https://github.com/scsnl/Cai_Multiple_Demand_System_2023), pinned commit `cfe1931b2ac317c992642a0011eedac33cad2534` (`v0.20`). Script: `brainbehav/brainbehav_cca.py`; SHA-256: `d880fc28f80fe4c4b69508e36f7ac1bcfc871f33ae49678916e8be474de9df1b`.
- The article/source data and the [archived repository release](https://zenodo.org/records/10702914) identify [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) reuse terms. The GitHub checkout itself has no license file. Source attribution is retained; the new extraction, diagnostics and interactive presentation are changes made for this demonstration. No upstream code is redistributed.

AI assistance was used for implementation and documentation. The artifact demonstrates an inspectable analytical workflow, not independent mastery of every upstream method or hands-on imaging experience.
