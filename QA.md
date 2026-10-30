# Verification record

2026-10-30, before initial publication.

- Original source workbook SHA-256 verified; all eight selected sheets retained exactly.
- 18 automated tests cover frozen sheet counts, literal input values, finite occupancies, independent SciPy/NumPy/sklearn estimates, training-only baselines, held-out-outcome leakage checks, source alignment, deterministic outputs and pinned upstream recipe execution.
- An independent reviewer recomputed all row-level predictions, baselines, correlations, influence ranges and summary metrics using NumPy/PRESS, without calling the implementation functions. Maximum discrepancy was below 5 × 10^-13.
- The review prompted explicit acknowledgment of the authors' existing multivariate leave-one-out prediction and their ≥3-SD univariate exclusion rule. Exact exclusion masks are not reconstructed; original filtering remains outside the present resampling.
- Desktop browser checks covered all seven task selectors, both ROI definitions, association/prediction views, individual source-row inspection and RMSE/MAE comparison.
- Keyboard Return selected a plotted observation and updated the source-row readout. The row selector provides a larger alternative to selecting small plot marks.
- Responsive layout inspected in a 390px-wide iframe, not a physical-phone test. Main plot labels and source-row readout remain readable.
- The first viewport was visually compared with the live Ramani reference. The shared shell validator passed.

These checks establish computational consistency and scoped UI behavior. They do not establish external validity, causal inference, clinical utility or independent fMRI-method expertise.
