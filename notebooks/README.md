# notebooks/

Kaggle competition notebooks and analysis scripts for WiDS Datathon 2026.

## Contents

| File | What it is |
|------|-----------|
| [`minutes_matter_wids2026.ipynb`](./minutes_matter_wids2026.ipynb) | **Primary competition notebook.** Full analysis pipeline: loading the 62,696-row WatchDuty fire dataset, SVI linkage, signal-gap computation, equity disparity findings, and evacuation timing statistics. |
| [`kaggle_wids_2026_minutes_matter.ipynb`](./kaggle_wids_2026_minutes_matter.ipynb) | Kaggle-formatted version of the competition notebook for platform submission. |
| [`minutes_matter_kaggle.py`](./minutes_matter_kaggle.py) | Python script version of the Kaggle notebook analysis. |
| [`_build_kaggle_nb.py`](./_build_kaggle_nb.py) | Utility script to package the Kaggle notebook for submission. Not analysis code — used for the submission workflow. |

## Related

- [`archive/widsdatathon/`](../archive/widsdatathon/) — Raw 62,696-row fire dataset used in analysis
- [`research/DATATHON_WRITEUP.md`](../research/DATATHON_WRITEUP.md) — Written summary of the research findings
