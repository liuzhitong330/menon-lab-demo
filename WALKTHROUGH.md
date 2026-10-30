# Walkthrough for Cathy

## The question

The paper reports that spending more time in a shared brain state is associated with better performance across several tasks. This demonstration asks a narrower follow-up: **does a simple line fitted to those published pairs improve prediction over just using the other observations’ average, and how sensitive is the relationship to individual observations?**

This is a check of published processed outputs. It does not rerun MRI preprocessing, discover new brain states or diagnose anyone.

The authors already performed leave-one-out prediction with multivariate CCA. Our narrower contribution is the transparent single-feature baseline comparison and influence inspection, not introducing predictive evaluation to the paper.

## What goes in

Each dot is one directly paired row from the authors’ source-data workbook. Its horizontal position is shared-state occupancy; its vertical position is the published task-performance index. The page preserves the supplied values. A source-row label lets someone find that pair in the workbook; it is not a participant identifier.

There are seven fixed primary comparisons, plus an alternative-ROI stop-signal analysis. Some sheets contain fewer plotted pairs than their nominal cohort size. The authors report a ≥3-SD exclusion rule for univariate analyses; the exact exclusion mask is not reconstructed here. The demo retains all exported pairs and adds no further filtering. It does not infer diagnostic groups or join participant records across tasks.

The performance measures differ by task. Use the labels and definitions, not the absolute height of one task’s values versus another’s. Several tasks or sessions involve the same people, so multiple plots are not independent replications.

## How to read the result

Start with the stop-signal task:

1. The 44 supplied pairs give a correlation of about **0.339**. That describes association in these observations; it is not prediction accuracy.
2. For each row, the analysis fits a line without that row and predicts its outcome. It compares this prediction with the average outcome of those same training rows.
3. The line reduces RMSE by about **2.72%** relative to that average-only baseline. RMSE gives more weight to large misses; MAE reports average absolute error. Neither number is a clinical accuracy percentage.
4. The correlation ranges from approximately **0.291 to 0.463** when one row at a time is omitted. This shows influence. It is not a confidence interval and does not justify deleting a row.
5. With the published alternative ROI definition, correlation is about **0.317** and RMSE improvement is **2.36%**. This comparison changes the neural feature definition, not the cohort. Both analyses retain their literal source outcomes.

The useful decision is whether a result deserves closer source-data review or a genuinely held-out follow-up. A positive association with only a small improvement over a simple baseline calls for caution before making individual predictions. The demo does not impose a clinical or statistical pass/fail threshold.

## What you can say

“I prepared an AI-assisted, reproducible audit of the lab’s published brain-state and behavioral pairs. It checks source counts and units, compares a simple linear readout with a training-only mean baseline, and makes single-observation influence visible. The code pins the original inputs and includes tests.”

The contribution is the transparent audit and comparison workflow. The authors supplied the participant data, brain-state estimates and original scientific findings. AI assistance contributed to implementing and documenting this demo; it should not be presented as proof of independently implementing the whole analysis stack.

## What you should not claim

- “I independently validated the brain-imaging pipeline.” Only the downstream line is refitted; upstream state estimation and selection are fixed.
- “This predicts ADHD” or “this is clinically useful.” The demo makes neither claim and does not expose diagnostic-group comparisons.
- “The effect is causal” or “this shows what happens within one person.” These are between-person source pairs.
- “I reproduced the original multivariate CCA.” The upstream-code exercise is only a one-column recipe check.
- “Seven tasks mean seven independent samples.” Cohorts overlap across tasks and sessions.

A stronger next study would require a separately held-out cohort or a design that repeats preprocessing, state estimation and feature selection inside the training folds. That is outside this demonstration.
