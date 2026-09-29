"""Détourage automatique des photos d'athlètes (rembg).

Lit tmp/photos/brut/*.jpg et écrit tmp/photos/detoure/*.png (fond transparent).
Le modèle se choisit avec la variable REMBG_MODEL (isnet-general-use par défaut).
Après le détourage, on ne garde que l'athlète : les petites taches et les personnes
séparées de lui (coéquipiers, public) sont effacées, pour que le recadrage le mette en grand.
"""

import os
import pathlib
import sys

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW = ROOT / "tmp" / "photos" / "brut"
OUT = ROOT / "tmp" / "photos" / "detoure"
OUT.mkdir(parents=True, exist_ok=True)


def isoler(image: Image.Image) -> Image.Image:
    """Garde la plus grande silhouette et ce qui la touche presque (raquette, trophée, main)."""
    alpha = np.array(image.getchannel("A"))
    visible = alpha > 24
    labels, count = ndimage.label(visible)
    if count <= 1:
        return image
    sizes = ndimage.sum(visible, labels, range(1, count + 1))
    boxes = ndimage.find_objects(labels)
    main = int(np.argmax(sizes))
    rows, cols = boxes[main]
    margin_y = 0.08 * (rows.stop - rows.start)
    margin_x = 0.12 * (cols.stop - cols.start)
    keep = np.zeros(count + 1, dtype=bool)
    for index, (r, c) in enumerate(boxes):
        center_y = (r.start + r.stop) / 2
        center_x = (c.start + c.stop) / 2
        near = (
            rows.start - margin_y <= center_y <= rows.stop + margin_y
            and cols.start - margin_x <= center_x <= cols.stop + margin_x
        )
        keep[index + 1] = index == main or (near and sizes[index] >= 0.004 * sizes[main])
    alpha = np.where(keep[labels], alpha, 0).astype(np.uint8)
    image.putalpha(Image.fromarray(alpha))
    return image


session = new_session(os.environ.get("REMBG_MODEL", "isnet-general-use"))
files = sorted(RAW.glob("*.jpg"))
print(f"Détourage de {len(files)} photos", flush=True)
for index, source in enumerate(files):
    target = OUT / f"{source.stem}.png"
    if target.exists():
        continue
    try:
        image = Image.open(source).convert("RGB")
        isoler(remove(image, session=session, post_process_mask=True)).save(target)
    except Exception as error:  # une photo ratée ne bloque pas les autres
        print(f"échec {source.name} : {error}", file=sys.stderr, flush=True)
    if index % 25 == 0:
        print(f"  {index}/{len(files)}", flush=True)
print("Détourage terminé", flush=True)
