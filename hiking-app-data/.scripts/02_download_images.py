"""
02_download_images.py

Downloads plant observation images from iNaturalist/GBIF for the
Centre County label space defined in label_space.csv.

Geographic train/val/test split (per-species, longitude-sorted):
  For each species, observations are sorted by longitude west->east.
  The westernmost 80% -> train, next 10% -> val, easternmost 10% -> test.
  Split is assigned per observation (not per photo), so all photos from
  the same observation land in the same split.

All photos per observation are downloaded (not just the first).
Filenames: {obs_id}_{photo_idx}.jpg

Checkpoint:
  data/observations_raw.csv saved after phase 1, before any downloads.

Output structure:
  data/images/{train|val|test}/{species_name}/{obs_id}_{photo_idx}.jpg
  data/observations_raw.csv
  data/manifest.csv
"""

import time
import requests
import pandas as pd
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# ── config ────────────────────────────────────────────────────────────────────

LABEL_SPACE_CSV = "label_space.csv"
IMAGE_ROOT      = Path("data/images")
RAW_OBS_PATH    = Path("data/observations_raw.csv")
MANIFEST_PATH   = Path("data/manifest.csv")

BBOX        = "POLYGON((-78.1 40.6,-77.5 40.6,-77.5 41.0,-78.1 41.0,-78.1 40.6))"
DATASET_KEY = "50c9509d-22c7-4a22-a47d-8c48425ef4a7"

DOWNLOAD_WORKERS = 4
REQUEST_DELAY    = 0.1
MAX_RETRIES      = 3

# ── helpers ───────────────────────────────────────────────────────────────────

def assign_splits(df: pd.DataFrame) -> pd.DataFrame:
    """
    Per-species longitude-sorted split on observations (not photos).
    All photos from the same observation go to the same split.
    """
    splits = []
    for _, group in df.groupby("species"):
        # deduplicate to one row per observation for split assignment
        obs = group.drop_duplicates("obs_id").sort_values("lon").reset_index(drop=True)
        n = len(obs)
        train_end = int(n * 0.80)
        val_end   = int(n * 0.90)

        labels = (
            ["train"] * train_end +
            ["val"]   * (val_end - train_end) +
            ["test"]  * (n - val_end)
        )

        # guarantee at least 1 in val and test
        if n >= 3 and val_end == train_end:
            labels[train_end] = "val"
        if n >= 3 and n - val_end == 0:
            labels[-1] = "test"

        obs["split"] = labels

        # merge split back onto all photos for this species
        merged = group.merge(obs[["obs_id", "split"]], on="obs_id", how="left")
        splits.append(merged)

    return pd.concat(splits, ignore_index=True)


def safe_species_dir(species: str) -> str:
    return species.replace(" ", "_").replace("/", "_")

def fetch_observations(species_key: str, species_name: str) -> list[dict]:
    records = []
    offset  = 0
    limit   = 300

    while True:
        params = {
            "speciesKey":       species_key,
            "hasCoordinate":    "true",
            "hasMedia":         "true",
            "occurrenceStatus": "PRESENT",
            "geometry":         BBOX,
            "datasetKey":       DATASET_KEY,
            "mediaType":        "StillImage",
            "limit":            limit,
            "offset":           offset,
        }

        data = None
        for retry in range(MAX_RETRIES):
            try:
                r = requests.get(
                    "https://api.gbif.org/v1/occurrence/search",
                    params=params,
                    timeout=30,
                )
                r.raise_for_status()
                data = r.json()
                break  # exits retry loop only
            except Exception as e:
                if retry == MAX_RETRIES - 1:
                    print(f"  [WARN] giving up on {species_name} offset={offset}: {e}")
                    data = {"results": [], "endOfRecords": True}
                else:
                    wait = 2 ** retry
                    print(f"  [RETRY {retry+1}] {species_name}: {e} — waiting {wait}s")
                    time.sleep(wait)

        # outside retry loop, inside while loop
        for obs in data.get("results", []):
            lat    = obs.get("decimalLatitude")
            lon    = obs.get("decimalLongitude")
            obs_id = obs.get("gbifID") or obs.get("key")
            media  = obs.get("media", [])

            if not (lat and lon and obs_id and media):
                continue

            photos = [
                m.get("identifier")
                for m in media
                if m.get("type") == "StillImage" and m.get("identifier")
            ]
            if not photos:
                continue

            for idx, img_url in enumerate(photos):
                records.append({
                    "species_key": species_key,
                    "species":     species_name,
                    "obs_id":      str(obs_id),
                    "photo_idx":   idx,
                    "lat":         lat,
                    "lon":         lon,
                    "img_url":     img_url,
                })

        if data.get("endOfRecords", True) or not data.get("results"):
            break

        offset += limit
        time.sleep(REQUEST_DELAY)

    return records


def download_image(record: dict) -> dict | None:
    species_dir = safe_species_dir(record["species"])
    out_dir     = IMAGE_ROOT / record["split"] / species_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{record['obs_id']}_{record['photo_idx']}.jpg"
    out_path = out_dir / filename

    if out_path.exists():
        record["local_path"] = str(out_path)
        return record

    for attempt in range(MAX_RETRIES):
        try:
            r = requests.get(record["img_url"], timeout=20, stream=True)
            r.raise_for_status()
            with open(out_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            record["local_path"] = str(out_path)
            return record
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                print(f"  [FAIL] {filename}: {e}")
                return None
            time.sleep(1)

    return None


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    label_space = pd.read_csv(LABEL_SPACE_CSV)
    print(f"Label space: {len(label_space)} species")
    print(f"Output root: {IMAGE_ROOT.resolve()}\n")

    # ── phase 1: fetch observation records ───────────────────────────────────
    print("Phase 1: fetching observation records from GBIF...")
    all_records = []

    for i, row in label_space.iterrows():
        species_key  = str(row["speciesKey"])
        species_name = row["species"]

        records = fetch_observations(species_key, species_name)
        all_records.extend(records)

        n_obs    = len(set(r["obs_id"] for r in records))
        n_photos = len(records)
        print(f"  [{i+1:3d}/{len(label_space)}] {species_name:<40s} "
              f"{n_obs:4d} obs  {n_photos:5d} photos")
        time.sleep(REQUEST_DELAY)

    print(f"\nTotal observations : {len(set(r['obs_id'] for r in all_records))}")
    print(f"Total photos       : {len(all_records)}")

    # ── checkpoint ────────────────────────────────────────────────────────────
    raw_df = pd.DataFrame(all_records)
    RAW_OBS_PATH.parent.mkdir(parents=True, exist_ok=True)
    raw_df.to_csv(RAW_OBS_PATH, index=False)
    print(f"\nCheckpoint saved -> {RAW_OBS_PATH.resolve()}")
    print("Phase 2 can be re-run from this file if interrupted.\n")

    # ── assign splits (per observation, propagated to all photos) ─────────────
    print("Assigning per-species longitude-sorted splits...")
    split_df = assign_splits(raw_df)

    print("Split distribution (photos):")
    print(split_df["split"].value_counts())
    print(f"\nSpecies with test examples : "
          f"{split_df[split_df['split']=='test']['species'].nunique()}")
    print(f"Species with val examples  : "
          f"{split_df[split_df['split']=='val']['species'].nunique()}\n")

    records = split_df.to_dict("records")

    # ── phase 2: download images ──────────────────────────────────────────────
    print(f"Phase 2: downloading {len(records)} images "
          f"with {DOWNLOAD_WORKERS} workers...")

    manifest_rows = []
    failed = 0

    with ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as ex:
        futures = {ex.submit(download_image, r): r for r in records}
        for i, future in enumerate(as_completed(futures)):
            result = future.result()
            if result:
                manifest_rows.append(result)
            else:
                failed += 1
            if (i + 1) % 500 == 0:
                print(f"  {i+1}/{len(records)} processed  ({failed} failed)")

    # ── save manifest ─────────────────────────────────────────────────────────
    manifest = pd.DataFrame(manifest_rows)
    manifest.to_csv(MANIFEST_PATH, index=False)

    print(f"\nDone.")
    print(f"  Downloaded : {len(manifest_rows)}")
    print(f"  Failed     : {failed}")
    print(f"  Manifest   : {MANIFEST_PATH.resolve()}")
    print(f"\nSplit summary (photos):")
    print(manifest.groupby("split").size().rename("images"))
    print(f"\nTop 10 species by photo count:")
    print(manifest.groupby("species").size()
          .sort_values(ascending=False).head(10))
    print(f"\nBottom 10 species by photo count:")
    print(manifest.groupby("species").size()
          .sort_values().head(10))


if __name__ == "__main__":
    main()