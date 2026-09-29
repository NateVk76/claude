"""Vue 3D du lugduname dans Blender : modèle boules-bâtons sur un grand fond dégradé.

Construit toute la scène à partir d'un fichier SDF (coordonnées 3D en Å) :
atomes, liaisons simples/doubles/triples, matériaux, fond dégradé, éclairage,
caméra, puis (optionnel) rend l'image et enregistre le .blend.

Testé avec Blender 4.2 LTS (compatible 4.x). Trois façons de l'utiliser :

  1. Dans Blender : onglet Scripting > Ouvrir ce fichier > Run Script
     (lugduname.sdf doit être à côté du script, ou dans le .blend comme texte).
     Attention : le script remplace le contenu de la scène courante.
  2. En ligne de commande :
       blender -b -P build_scene.py -- --render renders/lugduname.png --save lugduname.blend
  3. Avec le module Python bpy (pip install bpy) :
       python build_scene.py --render renders/lugduname.png --save lugduname.blend

La scène contient aussi un tourniquet (rotation de 360° sur la durée de
l'animation, image 1 = vue principale) : Ctrl+F12 dans Blender, ou
  --animation renders/tourniquet.mp4 --resolution 1280 720

Échelle : 1 unité Blender = 1 Å.
"""
import argparse
import math
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Euler, Matrix, Vector

SCRIPT_DIR = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()

# --------------------------------------------------------------------------
# Réglages artistiques
# --------------------------------------------------------------------------

# Grand dégradé diagonal (haut-gauche -> bas-droite), couleurs sRGB.
GRADIENT = [
    (0.00, "#1B0B45"),  # indigo profond
    (0.32, "#5B1E8C"),  # violet
    (0.62, "#D2477E"),  # framboise
    (0.84, "#FF8A6B"),  # corail
    (1.00, "#FFC98A"),  # pêche
]
GLOW_COLOR = "#FFD6E8"   # halo doux derrière la molécule
GLOW_STRENGTH = 0.12
VIGNETTE = 0.22          # assombrissement des coins (0 = aucun)

# Couleurs CPK légèrement stylisées (sRGB) et rayons des boules (Å).
ELEMENTS = {
    "C": {"color": "#5A5A6E", "radius": 0.38},
    "H": {"color": "#F4F2F7", "radius": 0.25},
    "N": {"color": "#2E6BFF", "radius": 0.36},
    "O": {"color": "#FF2638", "radius": 0.35},
}
FALLBACK_ELEMENT = {"color": "#FF4FD8", "radius": 0.40}

BOND_RADIUS = {1: 0.12, 2: 0.085, 3: 0.068}   # rayon de chaque cylindre
BOND_OFFSET = {1: 0.0, 2: 0.13, 3: 0.165}     # écart entre cylindres parallèles

# Orientation de la molécule devant la caméra (degrés), après alignement
# de ses axes principaux sur le cadre.
VIEW_ROTATION = (22.0, 0.0, -28.0)  # (X, Y, Z)
FRAME_FILL = 0.80  # largeur de l'image occupée par la molécule
FOCAL_LENGTH = 85.0  # mm
TURNTABLE_FRAMES = 240  # un tour complet : 10 s à 24 images/s

# Éclairage studio : (nom, position en multiples de la distance caméra-molécule,
# taille en multiples de cette distance, puissance / distance², couleur sRGB).
# Clé chaude, débouchage froid, contre-jours rose et pêche assortis au fond.
LIGHTS = [
    ("Clé", (-0.55, -0.75, 0.60), 0.45, 20.0, "#FFF4EA"),
    ("Débouchage", (0.80, -0.55, -0.10), 0.50, 4.0, "#E8E4FF"),
    ("Contre-jour rose", (-0.45, 0.60, 0.45), 0.30, 16.0, "#FF5FB0"),
    ("Contre-jour pêche", (0.55, 0.55, -0.35), 0.30, 14.0, "#FFB070"),
]
ENVIRONMENT_STRENGTH = 0.9  # reflets et éclairage indirect aux couleurs du fond


# --------------------------------------------------------------------------
# Outils
# --------------------------------------------------------------------------

def srgb_to_linear(hex_color: str, alpha: float = 1.0) -> tuple:
    hex_color = hex_color.lstrip("#")
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return (*lin, alpha)


def set_input(node, names, value):
    """Affecte la première entrée existante (les noms changent selon les versions)."""
    for name in (names if isinstance(names, (list, tuple)) else [names]):
        sock = node.inputs.get(name)
        if sock is not None:
            sock.default_value = value
            return sock
    return None


def socket(sockets, identifier):
    """Récupère une entrée/sortie par identifiant (ex. 'A_Color' du nœud Mix)."""
    for s in sockets:
        if s.identifier == identifier:
            return s
    raise KeyError(identifier)


def parse_args():
    if "--" in sys.argv:                 # blender -b -P build_scene.py -- ...
        argv = sys.argv[sys.argv.index("--") + 1:]
    elif sys.argv and sys.argv[0].endswith(".py"):  # python build_scene.py ... (module bpy)
        argv = sys.argv[1:]
    else:                                # éditeur de texte de Blender
        argv = []
    p = argparse.ArgumentParser(description=__doc__, allow_abbrev=False,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--sdf", help="fichier SDF/MOL à afficher (défaut : lugduname.sdf)")
    p.add_argument("--render", metavar="PNG", help="rend l'image fixe vers ce fichier")
    p.add_argument("--save", metavar="BLEND", help="enregistre la scène dans ce .blend")
    p.add_argument("--samples", type=int, default=256)
    p.add_argument("--resolution", type=int, nargs=2, default=(3840, 2160), metavar=("W", "H"))
    p.add_argument("--percentage", type=int, default=100, help="échelle de résolution (aperçus)")
    p.add_argument("--animation", metavar="MP4", help="rend le tourniquet en vidéo H.264")
    p.add_argument("--frames", type=int, default=TURNTABLE_FRAMES, help="durée du tourniquet (images)")
    return p.parse_args(argv)


# --------------------------------------------------------------------------
# Lecture du SDF (V2000)
# --------------------------------------------------------------------------

def load_molblock(path_arg):
    if path_arg:
        return Path(path_arg).read_text()
    candidates = [SCRIPT_DIR / "lugduname.sdf", Path(bpy.path.abspath("//lugduname.sdf"))]
    for c in candidates:
        if c.is_file():
            return c.read_text()
    text = bpy.data.texts.get("lugduname.sdf")
    if text is not None:
        return text.as_string()
    raise FileNotFoundError("lugduname.sdf introuvable : placez-le à côté du script ou passez --sdf")


def parse_molblock(block: str):
    lines = block.splitlines()
    name = lines[0].strip()
    n_atoms, n_bonds = int(lines[3][0:3]), int(lines[3][3:6])
    atoms = []
    for line in lines[4:4 + n_atoms]:
        xyz = (float(line[0:10]), float(line[10:20]), float(line[20:30]))
        atoms.append((line[31:34].strip(), np.array(xyz)))
    bonds = []
    for line in lines[4 + n_atoms:4 + n_atoms + n_bonds]:
        a, b, order = int(line[0:3]) - 1, int(line[3:6]) - 1, int(line[6:9])
        bonds.append((a, b, order if order in (1, 2, 3) else 1))
    return name, atoms, bonds


def principal_axes_frame(atoms):
    """Centre la molécule et aligne ses axes principaux : le plus long à
    l'horizontale (X), le second à la verticale (Z), le plus court vers la
    caméra (-Y). Rotation propre (pas de miroir)."""
    xyz = np.array([p for _, p in atoms])
    heavy = np.array([p for el, p in atoms if el != "H"]) if any(el != "H" for el, _ in atoms) else xyz
    center = heavy.mean(axis=0)
    _, _, vt = np.linalg.svd(heavy - center, full_matrices=False)
    if np.linalg.det(vt) < 0:
        vt[2] *= -1
    pcs = (xyz - center) @ vt.T
    # (pc1, pc2, pc3) -> (X, Z, -Y) : déterminant +1
    return np.stack([pcs[:, 0], -pcs[:, 2], pcs[:, 1]], axis=1)


# --------------------------------------------------------------------------
# Scène
# --------------------------------------------------------------------------

def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in list(bpy.data.collections):
        bpy.data.collections.remove(coll)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.lights,
                       bpy.data.cameras, bpy.data.worlds):
        for block in list(datablocks):
            datablocks.remove(block)


def make_material(name, hex_color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = srgb_to_linear(hex_color)  # couleur dans la vue Solid
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    set_input(bsdf, "Base Color", srgb_to_linear(hex_color))
    set_input(bsdf, "Roughness", 0.32)
    set_input(bsdf, ["Specular IOR Level", "Specular"], 0.5)
    # Vernis façon bonbon : le lugduname est l'un des édulcorants les plus puissants connus.
    set_input(bsdf, ["Coat Weight", "Clearcoat"], 0.8)
    set_input(bsdf, ["Coat Roughness", "Clearcoat Roughness"], 0.04)
    return mat


def make_sphere_mesh(name, radius, material):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=radius)
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    return mesh


def make_cylinder_mesh(name, material):
    """Cylindre ouvert de rayon 1, de z=0 à z=1 (mis à l'échelle par liaison)."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=32, radius1=1.0, radius2=1.0,
                          depth=1.0, matrix=Matrix.Translation((0, 0, 0.5)))
    for f in bm.faces:
        f.smooth = True
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    return mesh


def bond_offset_direction(i, j, order, positions, neighbors, view_dir):
    """Direction perpendiculaire à la liaison i-j : dans le plan des substituants
    pour une liaison double, dans le plan de l'image pour une triple liaison
    (ou quand les voisins sont alignés)."""
    axis = positions[j] - positions[i]
    axis /= np.linalg.norm(axis)
    for a, b in ((i, j), (j, i)) if order == 2 else ():
        for k in neighbors[a]:
            if k == b:
                continue
            arm = positions[k] - positions[a]
            normal = np.cross(axis, arm / np.linalg.norm(arm))
            if np.linalg.norm(normal) > 0.2:  # voisin à plus de ~12° de l'axe
                d = np.cross(normal, axis)
                return d / np.linalg.norm(d)
    d = np.cross(axis, view_dir)
    if np.linalg.norm(d) < 1e-3:
        d = np.cross(axis, (0.0, 0.0, 1.0))
    return d / np.linalg.norm(d)


def add_cylinder(name, mesh, start, end, radius, collection, parent):
    vec = Vector(end) - Vector(start)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = start
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(vec)
    obj.scale = (radius, radius, vec.length)
    obj.parent = parent
    collection.objects.link(obj)
    return obj


def build_molecule(atoms, bonds, positions, root_name, rotation):
    scene = bpy.context.scene
    mol_coll = bpy.data.collections.new(root_name)
    scene.collection.children.link(mol_coll)
    atom_coll = bpy.data.collections.new("Atomes")
    bond_coll = bpy.data.collections.new("Liaisons")
    mol_coll.children.link(atom_coll)
    mol_coll.children.link(bond_coll)

    root = bpy.data.objects.new(root_name, None)
    root.empty_display_type = "SPHERE"
    root.empty_display_size = 1.0
    mol_coll.objects.link(root)

    elements = sorted({el for el, _ in atoms})
    style = {el: ELEMENTS.get(el, FALLBACK_ELEMENT) for el in elements}
    mats = {el: make_material(f"Atome {el}", style[el]["color"]) for el in elements}
    spheres = {el: make_sphere_mesh(f"Boule {el}", style[el]["radius"], mats[el]) for el in elements}
    cylinders = {el: make_cylinder_mesh(f"Bâton {el}", mats[el]) for el in elements}

    counters = {}
    for idx, (el, _) in enumerate(atoms):
        counters[el] = counters.get(el, 0) + 1
        obj = bpy.data.objects.new(f"{el}{counters[el]:02d}", spheres[el])
        obj.location = positions[idx]
        obj.parent = root
        atom_coll.objects.link(obj)

    neighbors = {i: [] for i in range(len(atoms))}
    for a, b, _ in bonds:
        neighbors[a].append(b)
        neighbors[b].append(a)

    # axe de visée de la caméra (+Y) exprimé dans le repère de la molécule
    view_dir = np.array(rotation.to_matrix().transposed() @ Vector((0.0, 1.0, 0.0)))
    for n, (a, b, order) in enumerate(bonds, start=1):
        pa, pb = positions[a], positions[b]
        mid = (pa + pb) / 2
        if order == 1:
            offsets = [np.zeros(3)]
        else:
            d = bond_offset_direction(a, b, order, positions, neighbors, view_dir) * BOND_OFFSET[order]
            offsets = [d / 2, -d / 2] if order == 2 else [np.zeros(3), d, -d]
        for k, off in enumerate(offsets):
            for side, (atom_idx, start) in enumerate(((a, pa), (b, pb))):
                el = atoms[atom_idx][0]
                add_cylinder(f"Liaison {n:02d}{'abc'[k]}{side + 1} {el}", cylinders[el],
                             start + off, mid + off, BOND_RADIUS[order], bond_coll, root)
    return root


def build_world(aspect):
    world = bpy.data.worlds.new("Grand dégradé")
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nodes, links = nt.nodes, nt.links
    nodes.clear()

    def node(kind, x, y, **props):
        n = nodes.new(kind)
        n.location = (x, y)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def op(operation, x, y, a=None, b=None, c=None, clamp=False):
        n = node("ShaderNodeMath", x, y, operation=operation, use_clamp=clamp)
        for i, v in enumerate((a, b, c)):
            if v is None:
                continue
            if isinstance(v, bpy.types.NodeSocket):
                links.new(v, n.inputs[i])
            else:
                n.inputs[i].default_value = v
        return n.outputs[0]

    coords = node("ShaderNodeTexCoord", -1400, 200)
    sep = node("ShaderNodeSeparateXYZ", -1200, 200)
    links.new(coords.outputs["Window"], sep.inputs["Vector"])
    x, y = sep.outputs["X"], sep.outputs["Y"]

    # t = 0 en haut à gauche, 1 en bas à droite
    t = op("MULTIPLY_ADD", -800, 400, op("SUBTRACT", -1000, 400, x, y), 0.5, 0.5, clamp=True)
    ramp = node("ShaderNodeValToRGB", -600, 400)
    ramp.color_ramp.interpolation = "B_SPLINE"
    elems = ramp.color_ramp.elements
    while len(elems) < len(GRADIENT):
        elems.new(0.5)
    for el, (pos, color) in zip(elems, GRADIENT):
        el.position, el.color = pos, srgb_to_linear(color)
    links.new(t, ramp.inputs["Fac"])

    # distance au centre, corrigée du format d'image (1 dans les coins)
    u = op("MULTIPLY", -1000, 0, op("SUBTRACT", -1100, 0, x, 0.5), aspect)
    v = op("SUBTRACT", -1000, -150, y, 0.5)
    r2 = op("ADD", -800, -50, op("POWER", -900, 0, u, 2.0), op("POWER", -900, -150, v, 2.0))
    r = op("DIVIDE", -600, -50, op("SQRT", -700, -50, r2), math.hypot(aspect / 2, 0.5))

    glow = node("ShaderNodeMapRange", -400, -50, interpolation_type="SMOOTHSTEP")
    links.new(r, glow.inputs["Value"])
    glow.inputs["From Min"].default_value, glow.inputs["From Max"].default_value = 0.0, 0.8
    glow.inputs["To Min"].default_value, glow.inputs["To Max"].default_value = GLOW_STRENGTH, 0.0

    vignette = node("ShaderNodeMapRange", -400, -300, interpolation_type="SMOOTHSTEP")
    links.new(r, vignette.inputs["Value"])
    vignette.inputs["From Min"].default_value, vignette.inputs["From Max"].default_value = 0.45, 1.1
    vignette.inputs["To Min"].default_value, vignette.inputs["To Max"].default_value = 1.0, 1.0 - VIGNETTE

    screen = node("ShaderNodeMix", -200, 300, data_type="RGBA", blend_type="SCREEN")
    links.new(glow.outputs["Result"], socket(screen.inputs, "Factor_Float"))
    links.new(ramp.outputs["Color"], socket(screen.inputs, "A_Color"))
    socket(screen.inputs, "B_Color").default_value = srgb_to_linear(GLOW_COLOR)

    darken = node("ShaderNodeMix", 0, 300, data_type="RGBA", blend_type="MULTIPLY")
    socket(darken.inputs, "Factor_Float").default_value = 1.0
    links.new(socket(screen.outputs, "Result_Color"), socket(darken.inputs, "A_Color"))
    vig_rgb = node("ShaderNodeCombineXYZ", -200, -300)
    for i in range(3):
        links.new(vignette.outputs["Result"], vig_rgb.inputs[i])
    links.new(vig_rgb.outputs["Vector"], socket(darken.inputs, "B_Color"))

    bg_camera = node("ShaderNodeBackground", 200, 300)
    links.new(socket(darken.outputs, "Result_Color"), bg_camera.inputs["Color"])

    # Environnement vu par les reflets et l'éclairage indirect : même palette,
    # orientée comme le fond (violet en haut à gauche, pêche en bas à droite).
    dir_sep = node("ShaderNodeSeparateXYZ", -1200, -600)
    links.new(coords.outputs["Generated"], dir_sep.inputs["Vector"])
    diag = op("SUBTRACT", -1000, -600, dir_sep.outputs["X"], dir_sep.outputs["Z"])
    t_env = op("MULTIPLY_ADD", -800, -600, diag, 0.35, 0.5, clamp=True)
    env_ramp = node("ShaderNodeValToRGB", -600, -600)
    env_ramp.color_ramp.interpolation = "B_SPLINE"
    e = env_ramp.color_ramp.elements
    while len(e) < len(GRADIENT):
        e.new(0.5)
    for el, (pos, color) in zip(e, GRADIENT):
        el.position, el.color = pos, srgb_to_linear(color)
    links.new(t_env, env_ramp.inputs["Fac"])
    bg_env = node("ShaderNodeBackground", 200, -600)
    links.new(env_ramp.outputs["Color"], bg_env.inputs["Color"])
    bg_env.inputs["Strength"].default_value = ENVIRONMENT_STRENGTH

    is_cam = node("ShaderNodeLightPath", 200, 700)
    mix = node("ShaderNodeMixShader", 450, 100)
    links.new(is_cam.outputs["Is Camera Ray"], mix.inputs["Fac"])
    links.new(bg_env.outputs["Background"], mix.inputs[1])
    links.new(bg_camera.outputs["Background"], mix.inputs[2])
    out = node("ShaderNodeOutputWorld", 650, 100)
    links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return world


def add_area_light(name, location, target, size, power, hex_color, collection, camera_visible=False):
    light = bpy.data.lights.new(name, type="AREA")
    light.shape = "DISK"
    light.size = size
    light.energy = power
    light.color = srgb_to_linear(hex_color)[:3]
    obj = bpy.data.objects.new(name, light)
    obj.location = location
    direction = Vector(target) - Vector(location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    obj.visible_camera = camera_visible
    collection.objects.link(obj)
    return obj


def setup_camera_and_lights(root, positions, radii, aspect):
    scene = bpy.context.scene
    rig = bpy.data.collections.new("Studio")
    scene.collection.children.link(rig)

    # Boîte englobante de la molécule orientée, vue depuis la caméra (axe +Y).
    rot = root.matrix_world.to_3x3()
    pts = np.array([rot @ Vector(p) for p in positions])
    lo = np.min(pts - radii[:, None], axis=0)
    hi = np.max(pts + radii[:, None], axis=0)
    center = (lo + hi) / 2
    root.location = Vector(-center)  # recentre la molécule sur l'origine
    width, height = hi[0] - lo[0], hi[2] - lo[2]

    cam_data = bpy.data.cameras.new("Caméra")
    cam_data.lens = FOCAL_LENGTH
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.sensor_width = 36.0
    cam_data.clip_start, cam_data.clip_end = 0.1, 1000.0
    half_fov = math.atan(cam_data.sensor_width / 2 / cam_data.lens)
    visible_w = max(width / FRAME_FILL, height * aspect / 0.8)
    distance = visible_w / 2 / math.tan(half_fov) + (hi[1] - lo[1]) / 2
    cam = bpy.data.objects.new("Caméra", cam_data)
    cam.location = (0.0, -distance, 0.0)
    cam.rotation_euler = (math.pi / 2, 0.0, 0.0)
    rig.objects.link(cam)
    scene.camera = cam

    # Aire des lumières ∝ d² : la puissance suit pour garder le même rendu.
    d = distance
    for name, pos, size, power, color in LIGHTS:
        add_area_light(name, Vector(pos) * d, (0, 0, 0), size * d, power * d * d, color, rig)
    return cam


def setup_turntable(root, frames):
    """Fait tourner la molécule autour de la verticale : 360° en `frames` images.
    Pilote (driver) plutôt que clés : boucle parfaite, image 1 = vue principale."""
    scene = bpy.context.scene
    pivot = bpy.data.objects.new("Tourniquet", None)
    pivot.empty_display_type = "CIRCLE"
    pivot.empty_display_size = 8.0
    for coll in root.users_collection:
        coll.objects.link(pivot)
    root.parent = pivot
    driver = pivot.driver_add("rotation_euler", 2).driver
    driver.type = "SCRIPTED"
    driver.expression = f"radians((frame - 1) * 360 / {frames})"
    scene.frame_start, scene.frame_end = 1, frames
    scene.frame_set(1)
    scene.render.fps = 24
    return pivot


def setup_render(args):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    cy = scene.cycles
    cy.device = "CPU"
    cy.samples = args.samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.01
    cy.use_denoising = True
    if hasattr(cy, "denoiser"):
        cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 8
    cy.caustics_reflective = cy.caustics_refractive = False
    scene.render.resolution_x, scene.render.resolution_y = args.resolution
    scene.render.resolution_percentage = args.percentage
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.dither_intensity = 1.0  # évite les bandes dans le dégradé
    try:
        scene.view_settings.view_transform = "Khronos PBR Neutral"
    except TypeError:
        scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0


def setup_viewport():
    """À l'ouverture du .blend : vue caméra, aperçu matériaux avec le fond de la scène."""
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type != "VIEW_3D":
                continue
            for space in area.spaces:
                if space.type == "VIEW_3D":
                    space.region_3d.view_perspective = "CAMERA"
                    space.shading.type = "MATERIAL"
                    space.shading.use_scene_world = True
                    space.shading.use_scene_lights = True


def store_sources(molblock):
    """Embarque le script et le SDF dans le .blend (onglet Scripting)."""
    for name, content in (("lugduname.sdf", molblock),
                          ("build_scene.py", (SCRIPT_DIR / "build_scene.py").read_text()
                           if (SCRIPT_DIR / "build_scene.py").is_file() else None)):
        if content is None:
            continue
        text = bpy.data.texts.get(name) or bpy.data.texts.new(name)
        text.from_string(content)


def main():
    args = parse_args()
    molblock = load_molblock(args.sdf)
    name, atoms, bonds = parse_molblock(molblock)
    name = name or "Molécule"

    clear_scene()
    setup_render(args)
    aspect = args.resolution[0] / args.resolution[1]

    positions = principal_axes_frame(atoms)
    radii = np.array([ELEMENTS.get(el, FALLBACK_ELEMENT)["radius"] for el, _ in atoms])
    rotation = Euler([math.radians(a) for a in VIEW_ROTATION], "XYZ")
    root = build_molecule(atoms, bonds, positions, name, rotation)
    root.rotation_mode = "XYZ"
    root.rotation_euler = rotation
    bpy.context.view_layer.update()

    build_world(aspect)
    setup_camera_and_lights(root, positions, radii, aspect)
    setup_turntable(root, args.frames)
    setup_viewport()
    bpy.context.scene.render.filepath = "//renders/tourniquet_"  # Ctrl+F12 dans Blender

    if args.save:
        store_sources(molblock)
        out = Path(args.save).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(out), compress=True)
        print(f"Scène enregistrée : {out}")
    if args.render:
        out = Path(args.render).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        bpy.context.scene.render.filepath = str(out)
        bpy.ops.render.render(write_still=True)
        print(f"Image rendue : {out}")
    if args.animation:
        out = Path(args.animation).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        render = bpy.context.scene.render
        render.image_settings.file_format = "FFMPEG"
        render.ffmpeg.format = "MPEG4"
        render.ffmpeg.codec = "H264"
        render.ffmpeg.constant_rate_factor = "HIGH"
        render.ffmpeg.gopsize = 24
        render.filepath = str(out)
        render.use_file_extension = False
        render.use_persistent_data = True  # garde la scène en mémoire entre les images
        bpy.ops.render.render(animation=True)
        print(f"Animation rendue : {out}")


if __name__ == "__main__":
    main()
