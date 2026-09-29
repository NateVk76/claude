"""Détourage automatique des photos d'athlètes (rembg).

Lit tmp/photos/brut/*.jpg et écrit tmp/photos/detoure/*.png (fond transparent).
Le modèle se choisit avec la variable REMBG_MODEL (isnet-general-use par défaut).
"""

import os
import pathlib
import sys

from PIL import Image
from rembg import new_session, remove

ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW = ROOT / "tmp" / "photos" / "brut"
OUT = ROOT / "tmp" / "photos" / "detoure"
OUT.mkdir(parents=True, exist_ok=True)

session = new_session(os.environ.get("REMBG_MODEL", "isnet-general-use"))
files = sorted(RAW.glob("*.jpg"))
print(f"Détourage de {len(files)} photos", flush=True)
for index, source in enumerate(files):
    target = OUT / f"{source.stem}.png"
    if target.exists():
        continue
    try:
        image = Image.open(source).convert("RGB")
        remove(image, session=session, post_process_mask=True).save(target)
    except Exception as error:  # une photo ratée ne bloque pas les autres
        print(f"échec {source.name} : {error}", file=sys.stderr, flush=True)
    if index % 25 == 0:
        print(f"  {index}/{len(files)}", flush=True)
print("Détourage terminé", flush=True)
