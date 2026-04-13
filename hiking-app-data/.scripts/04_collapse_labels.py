"""
04_collapse_labels.py

Adds a `label` column to manifest.csv that collapses visually
indistinguishable or photo-ambiguous species to genus level.

Species not in the collapse list keep their full species name as label.
The `label` column is what the training script uses — never `species`.

Collapsed genera (reason):
  Definitely collapse — photo-indistinguishable:
    Solidago, Symphyotrichum, Lysimachia, Cardamine,
    Persicaria, Thalictrum, Melilotus, Uvularia

  Borderline — thin data or visually similar:
    Viburnum, Hepatica, Erigeron, Spiraea, Silene
"""

import pandas as pd

MANIFEST_PATH = "data/manifest.csv"

# genera to collapse to genus-level label
COLLAPSE_GENERA = {
    # definitely collapse
    "Solidago",
    "Symphyotrichum",
    "Lysimachia",
    "Cardamine",
    "Persicaria",
    "Thalictrum",
    "Melilotus",
    "Uvularia",
    # borderline
    "Viburnum",
    "Hepatica",
    "Erigeron",
    "Spiraea",
    "Silene",
}


def assign_label(species: str) -> str:
    genus = species.split()[0]
    if genus in COLLAPSE_GENERA:
        return f"{genus} sp."
    return species


def main():
    df = pd.read_csv(MANIFEST_PATH)
    print(f"Loaded manifest: {len(df)} images, {df['species'].nunique()} species")

    df["label"] = df["species"].apply(assign_label)

    # summary of what changed
    collapsed = df[df["label"] != df["species"]][["species", "label"]].drop_duplicates()
    print(f"\nCollapsed {len(collapsed)} species into "
          f"{collapsed['label'].nunique()} genus-level labels:\n")

    for label, group in collapsed.groupby("label"):
        species_list = group["species"].tolist()
        counts = df[df["label"] == label].groupby("species").size()
        print(f"  {label}")
        for s in species_list:
            print(f"    {s:<45s} {counts.get(s, 0):4d} images")

    n_before = df["species"].nunique()
    n_after  = df["label"].nunique()
    print(f"\nLabel space: {n_before} species -> {n_after} labels "
          f"({n_before - n_after} classes removed)")

    print("\nNew training counts for collapsed labels:")
    train = df[df["split"] == "train"]
    collapsed_labels = collapsed["label"].unique()
    print(train[train["label"].isin(collapsed_labels)]
          .groupby("label").size()
          .sort_values(ascending=False)
          .to_string())

    df.to_csv(MANIFEST_PATH, index=False)
    print(f"\nManifest updated -> {MANIFEST_PATH}")
    print("New column `label` added. Use this for training, not `species`.")


if __name__ == "__main__":
    main()