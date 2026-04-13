"""
03_resize_images.py
Resizes all downloaded images to 224x224 in-place.
Run once before training.
"""

from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed

IMAGE_ROOT = Path("data/images")
TARGET_SIZE = (224, 224)

def resize_image(path: Path) -> tuple[Path, bool]:
    try:
        with Image.open(path) as img:
            img = img.convert("RGB")          # drop alpha, normalize modes
            img = img.resize(TARGET_SIZE, Image.LANCZOS)
            img.save(path, "JPEG", quality=90)
        return path, True
    except Exception as e:
        print(f"  [FAIL] {path}: {e}")
        return path, False

def main():
    paths = list(IMAGE_ROOT.rglob("*.jpg"))
    print(f"Resizing {len(paths)} images to {TARGET_SIZE}...")

    failed = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(resize_image, p): p for p in paths}
        for i, f in enumerate(as_completed(futures)):
            _, ok = f.result()
            if not ok:
                failed += 1
            if (i + 1) % 1000 == 0:
                print(f"  {i+1}/{len(paths)} done  ({failed} failed)")

    print(f"\nDone. {len(paths) - failed} resized, {failed} failed.")

if __name__ == "__main__":
    main()