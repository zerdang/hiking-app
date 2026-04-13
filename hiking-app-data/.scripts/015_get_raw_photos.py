import pandas as pd

# reload from the raw checkpoint
raw = pd.read_csv("data/observations_raw.csv")

# re-apply splits
def assign_splits(df):
    splits = []
    for _, group in df.groupby("species"):
        obs = group.drop_duplicates("obs_id").sort_values("lon").reset_index(drop=True)
        n = len(obs)
        train_end = int(n * 0.80)
        val_end   = int(n * 0.90)
        labels = (
            ["train"] * train_end +
            ["val"]   * (val_end - train_end) +
            ["test"]  * (n - val_end)
        )
        if n >= 3 and val_end == train_end:
            labels[train_end] = "val"
        if n >= 3 and n - val_end == 0:
            labels[-1] = "test"
        obs["split"] = labels
        merged = group.merge(obs[["obs_id", "split"]], on="obs_id", how="left")
        splits.append(merged)
    return pd.concat(splits, ignore_index=True)

df = assign_splits(raw)

# add local_path
def make_path(row):
    species_dir = row["species"].replace(" ", "_").replace("/", "_")
    filename = f"{row['obs_id']}_{row['photo_idx']}.jpg"
    return f"data/images/{row['split']}/{species_dir}/{filename}"

df["local_path"] = df.apply(make_path, axis=1)
df.to_csv("data/manifest.csv", index=False)

print(f"Restored manifest: {len(df)} images, {df['species'].nunique()} species")
print(df["split"].value_counts())