# data/

Static data files used by the Next.js application at runtime.

## Contents

| File | What it is |
|------|-----------|
| [`hazard_facilities.csv`](./hazard_facilities.csv) | Pre-identified hazardous facilities (nuclear, chemical, LNG) near populated areas. Used by `lib/hazard-facilities.ts` to populate evacuation route warnings and Flameo AI context. |

This file is exported from the application database via `scripts/export-hazard-facilities-csv.mts`.

## Note for judges

This is **application runtime data**, not the competition dataset. The 62,696-row WiDS fire dataset is in [`archive/widsdatathon/`](../archive/widsdatathon/).
