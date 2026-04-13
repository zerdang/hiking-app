import requests
import pandas as pd

# --- Step 1: get facet counts (what you already have working) ---
bbox = "POLYGON((-78.1 40.6,-77.5 40.6,-77.5 41.0,-78.1 41.0,-78.1 40.6))"

params = {
    "taxonKey": 6,
    "hasCoordinate": "true",
    "occurrenceStatus": "PRESENT",
    "geometry": bbox,
    "datasetKey": "50c9509d-22c7-4a22-a47d-8c48425ef4a7",
    "facet": "speciesKey",
    "facetLimit": 1000,
    "limit": 0
}

r = requests.get("https://api.gbif.org/v1/occurrence/search", params=params)
data = r.json()

counts = data["facets"][0]["counts"]
df = pd.DataFrame(counts).rename(columns={"name": "speciesKey", "count": "obs_count"})
df["obs_count"] = df["obs_count"].astype(int)
df = df.sort_values("obs_count", ascending=False).reset_index(drop=True)

print(f"Total species: {len(df)}")
print(f"Species ≥20 obs: {len(df[df['obs_count'] >= 20])}")

# --- Step 2: resolve names in bulk using the species/list endpoint ---
# Send up to 20 keys per request, run concurrently
from concurrent.futures import ThreadPoolExecutor, as_completed

def fetch_name(key):
    r = requests.get(f"https://api.gbif.org/v1/species/{key}", timeout=10)
    d = r.json()
    return key, d.get("canonicalName") or d.get("scientificName", "unknown")

keys = df["speciesKey"].tolist()

print(f"\nResolving {len(keys)} names with 20 threads...")
names = {}
with ThreadPoolExecutor(max_workers=5) as ex:
    futures = {ex.submit(fetch_name, k): k for k in keys}
    for i, f in enumerate(as_completed(futures)):
        key, name = f.result()
        names[key] = name
        if i % 50 == 0:
            print(f"  {i}/{len(keys)}")

df["species"] = df["speciesKey"].map(names)

# --- Step 3: filter and save ---
label_space = df[df["obs_count"] >= 20].copy()
print(f"\nFinal label space: {len(label_space)} species")
print(label_space.head(30)[["species", "obs_count"]].to_string(index=False))

label_space.to_csv("label_space.csv", index=False)
print("\nSaved to label_space.csv")