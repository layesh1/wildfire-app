# scripts/

Build and data export utility scripts. These are **not** part of the Next.js application bundle — they support research deliverables and data pipeline maintenance.

## Contents

| File | What it does | How to run |
|------|-------------|-----------|
| [`build_wids_poster_docx.py`](./build_wids_poster_docx.py) | Generates `research/WiDS_Poster_MinutesMatter.docx` — the 48×36" landscape competition poster — from `research/WIDS_POSTER_CONTENT_FOR_WORD.md` using python-docx. | `pip install python-docx && python3 scripts/build_wids_poster_docx.py` |
| [`export-hazard-facilities-csv.mts`](./export-hazard-facilities-csv.mts) | Exports the `hazard_facilities` table from Supabase to `data/hazard_facilities.csv`. | `npx tsx scripts/export-hazard-facilities-csv.mts` |
| [`prep_fire_data.js`](./prep_fire_data.js) | Preprocesses fire data for use in the app's static references. | `node scripts/prep_fire_data.js` |
