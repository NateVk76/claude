"""Génère une conformation 3D du lugduname (SMILES -> SDF) avec RDKit.

Structure : acide N'-(4-cyanophényl)-N''-(2,3-méthylènedioxybenzyl)guanidinoacétique,
C18H16N4O4, 352,35 g/mol.

Méthode : 300 conformères ETKDGv3, optimisés au champ de force MMFF94.
Parmi ceux à moins de 1 kcal/mol du minimum, on garde celui qui remplit le
mieux un cadre 16:9 une fois vu de face : les trois bras de la molécule
restent lisibles sur le rendu.

Usage : python generate_conformer.py  ->  écrit lugduname.sdf à côté du script
"""
from pathlib import Path

import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem, rdMolDescriptors

SMILES = "N#CC1=CC=C(C=C1)NC(=NCC=2C=CC=C3OCOC32)NCC(=O)O"
ENERGY_WINDOW = 1.0  # kcal/mol au-dessus du minimum global trouvé


def projected_spread(conf_xyz: np.ndarray) -> tuple[float, float, float]:
    """Étendues (Å) le long des 3 axes principaux, du plus grand au plus petit."""
    centered = conf_xyz - conf_xyz.mean(axis=0)
    _, _, axes = np.linalg.svd(centered, full_matrices=False)
    proj = centered @ axes.T
    ext = proj.max(axis=0) - proj.min(axis=0)
    return tuple(float(e) for e in ext)


def main() -> None:
    mol = Chem.AddHs(Chem.MolFromSmiles(SMILES))
    mol.SetProp("_Name", "Lugduname")
    assert rdMolDescriptors.CalcMolFormula(mol) == "C18H16N4O4"

    params = AllChem.ETKDGv3()
    params.randomSeed = 1996  # année de sa mise au point à l'Université de Lyon
    params.pruneRmsThresh = 0.3
    conf_ids = list(AllChem.EmbedMultipleConfs(mol, numConfs=300, params=params))
    results = AllChem.MMFFOptimizeMoleculeConfs(mol, maxIters=10000)
    energies = np.array([e for _, e in results])
    e_min = energies.min()

    heavy = [a.GetIdx() for a in mol.GetAtoms() if a.GetAtomicNum() > 1]
    candidates = []
    for cid, e in zip(conf_ids, energies):
        if e - e_min > ENERGY_WINDOW:
            continue
        xyz = mol.GetConformer(cid).GetPositions()[heavy]
        ex, ey, ez = projected_spread(xyz)
        frame_w = max(ex, ey * 16 / 9)  # plus petit cadre 16:9 qui contient la molécule
        fill = ex * ey / (frame_w * frame_w * 9 / 16)
        candidates.append((fill, e - e_min, cid, ex, ey, ez))
    candidates.sort(reverse=True)

    print(f"{len(conf_ids)} conformères, {len(candidates)} à moins de {ENERGY_WINDOW} kcal/mol")
    for fill, de, cid, ex, ey, ez in candidates[:5]:
        print(f"  conf {cid:3d}  dE={de:4.2f}  {ex:4.1f} x {ey:4.1f} x {ez:3.1f} Å  remplissage 16:9 {fill:.0%}")

    best = candidates[0][2]
    out = Chem.Mol(mol)
    out.RemoveAllConformers()
    out.AddConformer(Chem.Conformer(mol.GetConformer(best)), assignId=True)
    out.SetProp("MMFF94_dE_kcal_mol", f"{energies[best] - e_min:.2f}")
    Chem.Kekulize(out, clearAromaticFlags=True)  # liaisons doubles explicites pour le rendu

    path = Path(__file__).with_name("lugduname.sdf")
    with Chem.SDWriter(str(path)) as w:
        w.SetKekulize(True)
        w.write(out)
    print(f"-> {path} (conformère {best})")


if __name__ == "__main__":
    main()
