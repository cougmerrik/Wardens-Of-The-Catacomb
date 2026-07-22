"""Generate the Wardens ghost-family Blender prototype and directional renders."""

import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


VARIANTS = ("hollow_ghost", "veiled_specter", "shackled_poltergeist")
ACTIONS = {
    "hover": (6, True),
    "move": (8, True),
    "primary_attack": (8, False),
    "siphon": (8, True),
    "hurt": (4, False),
    "death": (10, False),
}
PASSES = ("color", "shadow", "silhouette", "glow")
DIRECTION_ANGLES = {
    "east": 90,
    "southeast": 45,
    "south": 0,
    "southwest": -45,
    "west": -90,
    "northwest": -135,
    "north": 180,
    "northeast": 135,
}
PALETTE = {
    "cavity": "17152c",
    "body_shadow": "43516f",
    "body_mid": "829bbd",
    "highlight": "b8edee",
    "shroud": "7788a5",
    "core": "7a5cff",
    "core_highlight": "d6d1ff",
    "chain": "5c6877",
}


def arguments():
    values = list(__import__("sys").argv)
    values = values[values.index("--") + 1 :] if "--" in values else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--blend", required=True)
    parser.add_argument("--renders", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--directions", choices=("front", "eight"), default="front")
    return parser.parse_args(values)


def rgba(value, alpha=1.0):
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4)) + (alpha,)


def make_material(name, role):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba(PALETTE[role])
    mat.roughness = 1.0
    mat["palette_role"] = role
    return mat


def move_to_collection(obj, collection):
    for source in list(obj.users_collection):
        source.objects.unlink(obj)
    collection.objects.link(obj)


def finish_mesh(obj, name, parent, material, collection, role="color"):
    obj.name = name
    move_to_collection(obj, collection)
    obj.parent = parent
    obj.data.materials.append(material)
    obj["render_role"] = role
    for polygon in obj.data.polygons:
        polygon.use_smooth = False
    return obj


def sphere(name, location, scale, parent, material, collection, subdivisions=1, role="color"):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = finish_mesh(bpy.context.object, name, parent, material, collection, role)
    obj.scale = scale
    return obj


def cone(name, location, radii, depth, parent, material, collection, vertices=8, role="color"):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radii[0],
        radius2=radii[1],
        depth=depth,
        location=location,
    )
    return finish_mesh(bpy.context.object, name, parent, material, collection, role)


def cube(name, location, dimensions, rotation, parent, material, collection, role="color"):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = finish_mesh(bpy.context.object, name, parent, material, collection, role)
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def bone_parent(obj, armature, bone_name):
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def create_rig(prefix, collection):
    data = bpy.data.armatures.new(f"RIG_{prefix}_Data")
    rig = bpy.data.objects.new(f"RIG_{prefix}", data)
    collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    specs = {
        "ROOT": ((0, 0, 0), (0, 0, 0.35), None),
        "torso": ((0, 0, 0.7), (0, 0, 1.65), "ROOT"),
        "head": ((0, 0, 1.65), (0, 0, 2.25), "torso"),
        "arm.L": ((-0.28, 0, 1.55), (-0.78, 0, 0.85), "torso"),
        "arm.R": ((0.28, 0, 1.55), (0.78, 0, 0.85), "torso"),
        "tail": ((0, 0, 0.75), (0, 0, 0.05), "ROOT"),
    }
    for name, (head, tail, parent) in specs.items():
        bone = data.edit_bones.new(name)
        bone.head, bone.tail = head, tail
        if parent:
            bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="POSE")
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "XYZ"
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.select_set(False)
    rig["root_motion"] = False
    rig["bone_contract"] = json.dumps(list(specs))
    return rig


def create_root(name, family, collection):
    root = bpy.data.objects.new(name, None)
    collection.objects.link(root)
    root.parent = family
    return root


def add_common_parts(prefix, root, rig, collection, mats, proportions):
    torso = cone(f"SM_{prefix}_Torso", (0, 0, 1.22), proportions["torso"], 1.15, root, mats["body_mid"], collection, 7)
    head = sphere(f"SM_{prefix}_Head", (0, -0.01, 1.98), proportions["head"], root, mats["body_mid"], collection, 1)
    left = cone(f"SM_{prefix}_Arm_L", (-0.47, 0, 1.18), (0.10, 0.18), 1.1, root, mats["body_shadow"], collection, 6)
    right = cone(f"SM_{prefix}_Arm_R", (0.47, 0, 1.18), (0.10, 0.18), 1.1, root, mats["body_shadow"], collection, 6)
    left.rotation_euler.y = -0.36
    right.rotation_euler.y = 0.36
    tail = cone(f"SM_{prefix}_Tail", (0, 0, 0.46), proportions["tail"], 0.95, root, mats["shroud"], collection, 7)
    cavity = sphere(f"SM_{prefix}_Cavity", (0, -0.43, 1.42), (0.25, 0.10, 0.30), root, mats["cavity"], collection, 1)
    core = sphere(f"FX_{prefix}_SoulCore", (0, -0.52, 1.42), (0.11, 0.07, 0.14), root, mats["core_highlight"], collection, 1, "glow")
    eye_l = sphere(f"FX_{prefix}_Eye_L", (-0.12, -0.36, 2.03), (0.035, 0.025, 0.045), root, mats["core_highlight"], collection, 1, "glow")
    eye_r = sphere(f"FX_{prefix}_Eye_R", (0.12, -0.36, 2.03), (0.035, 0.025, 0.045), root, mats["core_highlight"], collection, 1, "glow")
    shadow = sphere(f"SH_{prefix}_ContactMist", (0, 0.06, 0.10), (0.58, 0.24, 0.045), root, mats["cavity"], collection, 1, "shadow")
    for obj, bone in ((torso, "torso"), (head, "head"), (left, "arm.L"), (right, "arm.R"), (tail, "tail"), (cavity, "torso"), (core, "torso"), (eye_l, "head"), (eye_r, "head")):
        bone_parent(obj, rig, bone)
    return {"torso": torso, "head": head, "arms": (left, right), "tail": tail, "core": core, "shadow": shadow}


def build_hollow(family, collection, mats):
    prefix = "HollowGhost"
    root = create_root(f"CHR_{prefix}_ROOT", family, collection)
    rig = create_rig(prefix, collection)
    rig.parent = root
    parts = add_common_parts(prefix, root, rig, collection, mats, {"torso": (0.48, 0.34), "head": (0.36, 0.31, 0.42), "tail": (0.09, 0.40)})
    for index, x in enumerate((-0.31, 0, 0.31), 1):
        wisp = cone(f"SM_{prefix}_Wisp_{index:02d}", (x, 0, 0.08), (0.02, 0.13), 0.72 - abs(x) * 0.35, root, mats["shroud"], collection, 5)
        wisp.rotation_euler.y = x * 0.55
        bone_parent(wisp, rig, "tail")
    return root, rig, parts


def build_specter(family, collection, mats):
    prefix = "VeiledSpecter"
    root = create_root(f"CHR_{prefix}_ROOT", family, collection)
    rig = create_rig(prefix, collection)
    rig.parent = root
    parts = add_common_parts(prefix, root, rig, collection, mats, {"torso": (0.36, 0.22), "head": (0.30, 0.25, 0.48), "tail": (0.04, 0.29)})
    hood = cone(f"SM_{prefix}_Veil", (0, 0.02, 1.95), (0.40, 0.19), 0.82, root, mats["shroud"], collection, 7)
    bone_parent(hood, rig, "head")
    for index, z in enumerate((0.62, 0.38, 0.18), 1):
        band = cube(f"SM_{prefix}_Band_{index:02d}", (0, 0, z), (0.62 - index * 0.10, 0.22, 0.10), (0, 0, (-1) ** index * 0.18), root, mats["body_shadow"], collection)
        bone_parent(band, rig, "tail")
    return root, rig, parts


def build_poltergeist(family, collection, mats):
    prefix = "ShackledPoltergeist"
    root = create_root(f"CHR_{prefix}_ROOT", family, collection)
    rig = create_rig(prefix, collection)
    rig.parent = root
    parts = add_common_parts(prefix, root, rig, collection, mats, {"torso": (0.54, 0.40), "head": (0.39, 0.34, 0.34), "tail": (0.12, 0.46)})
    for side in (-1, 1):
        for index in range(3):
            link = cube(
                f"EQ_{prefix}_Chain_{'L' if side < 0 else 'R'}_{index + 1:02d}",
                (side * (0.46 + index * 0.16), 0, 1.28 - index * 0.18),
                (0.18, 0.07, 0.07),
                (0, side * 0.2, side * 0.45),
                root,
                mats["chain"],
                collection,
            )
            bone_parent(link, rig, "arm.L" if side < 0 else "arm.R")
    for index, (x, z) in enumerate(((-0.72, 0.75), (0.72, 0.92), (-0.55, 1.82)), 1):
        debris = cube(f"EQ_{prefix}_Debris_{index:02d}", (x, 0.02, z), (0.20, 0.18, 0.18), (0.2, 0.3, x), root, mats["chain"], collection)
        bone_parent(debris, rig, "torso")
    return root, rig, parts


def pose_key(rig, frame, values):
    for bone in rig.pose.bones:
        bone.location = (0, 0, 0)
        bone.rotation_euler = (0, 0, 0)
        bone.scale = (1, 1, 1)
        bone.keyframe_insert("location", frame=frame, group=bone.name)
        bone.keyframe_insert("rotation_euler", frame=frame, group=bone.name)
        bone.keyframe_insert("scale", frame=frame, group=bone.name)
    for bone_name, channels in values.items():
        bone = rig.pose.bones[bone_name]
        if "location" in channels:
            bone.location = channels["location"]
            bone.keyframe_insert("location", frame=frame, group=bone_name)
        if "rotation" in channels:
            bone.rotation_euler = channels["rotation"]
            bone.keyframe_insert("rotation_euler", frame=frame, group=bone_name)
        if "scale" in channels:
            bone.scale = channels["scale"]
            bone.keyframe_insert("scale", frame=frame, group=bone_name)


def create_action(rig, variant, name, frames):
    action = bpy.data.actions.new(f"ACT_{variant}_{name}")
    rig.animation_data_create()
    rig.animation_data.action = action
    count, looping = ACTIONS[name]
    for frame in range(1, count + 1):
        phase = (frame - 1) / count * math.tau
        if name == "hover":
            values = {
                "torso": {"location": (0, 0, 0.045 * math.sin(phase)), "rotation": (0, 0.04 * math.sin(phase), 0.05 * math.sin(phase))},
                "head": {"rotation": (0.025 * math.sin(phase + 0.8), 0, -0.04 * math.sin(phase))},
                "arm.L": {"rotation": (0, 0.08 * math.sin(phase + 0.7), -0.07 * math.sin(phase))},
                "arm.R": {"rotation": (0, -0.08 * math.sin(phase + 0.7), 0.07 * math.sin(phase))},
                "tail": {"rotation": (0, 0.08 * math.sin(phase - 0.7), 0.12 * math.sin(phase - 0.7))},
            }
        elif name == "move":
            values = {
                "torso": {"location": (0, -0.035 * math.cos(phase), 0.06 * math.sin(phase)), "rotation": (0.06 * math.sin(phase), 0, 0.09 * math.sin(phase))},
                "head": {"rotation": (-0.035 * math.sin(phase), 0, -0.06 * math.sin(phase))},
                "arm.L": {"rotation": (0.10 * math.sin(phase), 0, -0.13 * math.sin(phase))},
                "arm.R": {"rotation": (-0.10 * math.sin(phase), 0, 0.13 * math.sin(phase))},
                "tail": {"rotation": (-0.08 * math.sin(phase), 0.12 * math.sin(phase - 0.8), -0.18 * math.sin(phase - 0.8))},
            }
        elif name == "primary_attack":
            attack_curve = (0.0, -0.12, -0.28, 0.72, 0.42, 0.18, 0.06, 0.0)[frame - 1]
            arm_spread = (0.05, 0.18, 0.34, -0.72, -0.48, -0.22, -0.08, 0.0)[frame - 1]
            values = {
                "torso": {"location": (0, -attack_curve * 0.24, attack_curve * 0.08), "rotation": (attack_curve * 0.34, 0, 0)},
                "head": {"rotation": (-attack_curve * 0.22, 0, 0)},
                "arm.L": {"rotation": (arm_spread, 0, -arm_spread * 0.75)},
                "arm.R": {"rotation": (arm_spread, 0, arm_spread * 0.75)},
                "tail": {"rotation": (-attack_curve * 0.42, 0, 0)},
            }
            if variant == "veiled_specter":
                hook = (0.0, 0.12, 0.32, 1.0, 0.68, 0.32, 0.10, 0.0)[frame - 1]
                values["torso"]["rotation"] = (attack_curve * 0.28, attack_curve * 0.18, -hook * 0.22)
                values["head"]["rotation"] = (-attack_curve * 0.18, hook * 0.16, hook * 0.16)
                values["arm.L"]["rotation"] = (hook * 0.20, -hook * 0.30, -hook * 1.15)
                values["arm.R"]["rotation"] = (-hook * 0.12, hook * 0.12, hook * 0.38)
        elif name == "siphon":
            opening = (0.15, 0.45, 0.78, 1.0, 0.82, 1.0, 0.78, 0.45)[frame - 1]
            tremor = (-1, 1, -0.7, 0.7, -1, 1, -0.7, 0.7)[frame - 1]
            values = {
                "torso": {"location": (0, -0.04 * opening, 0.04 * opening), "rotation": (-0.10 * opening, 0, 0.04 * tremor)},
                "head": {"rotation": (0.13 * opening, 0.04 * tremor, -0.03 * tremor)},
                "arm.L": {"rotation": (-0.18 * opening, -0.18 * opening, -0.82 * opening + 0.04 * tremor)},
                "arm.R": {"rotation": (-0.18 * opening, 0.18 * opening, 0.82 * opening - 0.04 * tremor)},
                "tail": {"rotation": (0.05 * tremor, -0.08 * opening, 0.10 * tremor)},
            }
        elif name == "hurt":
            recoil = (0.0, 1.0, 0.42, 0.0)[frame - 1]
            values = {
                "torso": {"location": (-0.12 * recoil, 0.08 * recoil, -0.05 * recoil), "rotation": (0.18 * recoil, -0.12 * recoil, -0.30 * recoil)},
                "head": {"rotation": (-0.24 * recoil, 0.16 * recoil, 0.34 * recoil)},
                "arm.L": {"rotation": (0.34 * recoil, 0, -0.52 * recoil)},
                "arm.R": {"rotation": (-0.22 * recoil, 0, -0.18 * recoil)},
                "tail": {"rotation": (-0.16 * recoil, 0.20 * recoil, 0.28 * recoil)},
            }
        else:
            collapse = (0.0, 0.08, 0.20, 0.36, 0.54, 0.70, 0.82, 0.91, 0.97, 1.0)[frame - 1]
            fold = math.sin(collapse * math.pi * 0.9)
            torso_height = max(0.16, 1.0 - 0.84 * collapse)
            limb_length = max(0.12, 1.0 - 0.88 * collapse)
            body_width = max(0.18, 1.0 - 0.82 * collapse)
            values = {
                "torso": {"location": (0, 0.08 * collapse, -0.92 * collapse), "rotation": (0.24 * fold, 0.12 * fold, -0.18 * fold), "scale": (body_width, body_width, torso_height)},
                "head": {"location": (0, 0, -0.34 * collapse), "rotation": (0.42 * fold, -0.18 * fold, 0.22 * fold), "scale": (body_width, body_width, torso_height)},
                "arm.L": {"location": (0, 0, -0.28 * collapse), "rotation": (0.32 * fold, 0.12 * fold, -1.08 * collapse), "scale": (limb_length, limb_length, limb_length)},
                "arm.R": {"location": (0, 0, -0.28 * collapse), "rotation": (0.32 * fold, -0.12 * fold, 1.08 * collapse), "scale": (limb_length, limb_length, limb_length)},
                "tail": {"location": (0, 0, -0.22 * collapse), "rotation": (-0.18 * fold, 0.10 * fold, -0.22 * fold), "scale": (limb_length, limb_length, torso_height)},
            }
        pose_key(rig, frame, values)
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                for fcurve in channelbag.fcurves:
                    for keyframe in fcurve.keyframe_points:
                        keyframe.interpolation = "CONSTANT"
    action["frame_count"] = count
    action["loop"] = looping
    action["presentation_fps"] = 10
    action.use_fake_user = True
    return action


def configure_scene():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 64
    scene.render.resolution_y = 64
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = False
    scene.display.render_aa = "OFF"
    scene.render.fps = 10
    scene.world.color = (0.015, 0.012, 0.028)
    camera_data = bpy.data.cameras.new("CAM_GhostFamily_Sprite_Data")
    camera = bpy.data.objects.new("CAM_GhostFamily_Sprite", camera_data)
    scene.collection.objects.link(camera)
    azimuth, elevation, distance = math.radians(-90), math.radians(55), 6.0
    camera.location = (distance * math.cos(elevation) * math.cos(azimuth), distance * math.cos(elevation) * math.sin(azimuth), distance * math.sin(elevation))
    camera.rotation_euler = (Vector((0, 0, 1.15)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 3.25
    scene.camera = camera
    return scene, camera


def set_visibility(scene, active_root, render_pass):
    for obj in scene.objects:
        if obj.type != "MESH":
            continue
        belongs = obj.parent == active_root or (obj.parent and obj.parent.parent == active_root)
        role = obj.get("render_role", "color")
        if render_pass == "color":
            visible = belongs and role in {"color", "glow"}
        elif render_pass == "silhouette":
            visible = belongs and role in {"color", "glow"}
        else:
            visible = belongs and role == render_pass
        obj.hide_render = not visible
        if visible:
            obj.color = (1, 1, 1, 1) if render_pass in {"silhouette", "glow"} else ((0.12, 0.14, 0.20, 1) if render_pass == "shadow" else obj.color)
    scene.display.shading.color_type = "MATERIAL" if render_pass == "color" else "OBJECT"
    scene.display.shading.light = "STUDIO" if render_pass == "color" else "FLAT"


def triangle_count(root, depsgraph):
    total = 0
    for obj in bpy.context.scene.objects:
        ancestor = obj
        while ancestor and ancestor != root:
            ancestor = ancestor.parent
        if ancestor == root and obj.type == "MESH":
            mesh = obj.evaluated_get(depsgraph).data
            mesh.calc_loop_triangles()
            total += len(mesh.loop_triangles)
    return total


def main():
    args = arguments()
    blend_path = Path(args.blend).resolve()
    render_root = Path(args.renders).resolve()
    report_path = Path(args.report).resolve()
    for path in (blend_path, report_path):
        if path.exists():
            raise FileExistsError(f"refusing to overwrite {path}")
    if render_root.exists() and any(render_root.iterdir()):
        raise FileExistsError(f"refusing to overwrite populated render directory {render_root}")
    blend_path.parent.mkdir(parents=True, exist_ok=True)
    render_root.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    scene, camera = configure_scene()
    family_collection = bpy.data.collections.new("WOTC_GhostFamily_Prototype")
    scene.collection.children.link(family_collection)
    family = bpy.data.objects.new("CHR_GhostFamily_Prototype_ROOT", None)
    family_collection.objects.link(family)
    family["asset_type"] = "enemy_sprite_family_prototype"
    family["specification_version"] = "sprite-art/v0.1-ghost-family"
    family["random_seed"] = 0
    family["triangle_budget_per_variant"] = 1200
    family["render_resolution"] = "64x64"
    family["final_cell_size"] = "128x128"
    family["presentation_fps"] = 10
    directions = {"front": 0} if args.directions == "front" else DIRECTION_ANGLES
    family["direction_order"] = json.dumps(list(directions))
    family["passes"] = json.dumps(PASSES)

    mats = {role: make_material(f"MAT_Ghost_{role}", role) for role in PALETTE}
    builders = (build_hollow, build_specter, build_poltergeist)
    built = {}
    for variant, builder in zip(VARIANTS, builders):
        root, rig, parts = builder(family, family_collection, mats)
        root["variant_id"] = variant
        root["fixed_pivot"] = [32, 52]
        actions = {name: create_action(rig, variant, name, values) for name, values in ACTIONS.items()}
        built[variant] = {"root": root, "rig": rig, "parts": parts, "actions": actions}

    depsgraph = bpy.context.evaluated_depsgraph_get()
    triangles = {variant: triangle_count(entry["root"], depsgraph) for variant, entry in built.items()}
    if any(value > 1200 for value in triangles.values()):
        raise RuntimeError(f"triangle budget exceeded: {triangles}")
    family["evaluated_triangles"] = json.dumps(triangles)
    family["flat_shaded"] = all(not polygon.use_smooth for obj in scene.objects if obj.type == "MESH" for polygon in obj.data.polygons)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)

    rendered = []
    for variant, entry in built.items():
        for action_name, (frame_count, _) in ACTIONS.items():
            entry["rig"].animation_data.action = entry["actions"][action_name]
            for render_pass in PASSES:
                set_visibility(scene, entry["root"], render_pass)
                target = render_root / variant / action_name / render_pass
                target.mkdir(parents=True, exist_ok=True)
                for direction, angle_degrees in directions.items():
                    entry["root"].rotation_euler.z = math.radians(angle_degrees)
                    for frame in range(1, frame_count + 1):
                        scene.frame_set(frame)
                        output = target / f"{direction}_{frame:02d}.png"
                        scene.render.filepath = str(output)
                        bpy.ops.render.render(write_still=True)
                        rendered.append(str(output.relative_to(render_root)))
        entry["root"].rotation_euler.z = 0

    report = {
        "collection": family_collection.name,
        "root": family.name,
        "blend": str(blend_path),
        "renderRoot": str(render_root),
        "variants": list(VARIANTS),
        "triangles": triangles,
        "triangleBudgetPerVariant": 1200,
        "flatShaded": family["flat_shaded"],
        "bones": [bone.name for bone in built[VARIANTS[0]]["rig"].data.bones],
        "rootMotion": False,
        "actions": {name: {"frames": values[0], "loop": values[1]} for name, values in ACTIONS.items()},
        "directions": list(directions),
        "passes": list(PASSES),
        "renderedFrames": len(rendered),
        "expectedFrames": len(VARIANTS) * sum(values[0] for values in ACTIONS.values()) * len(PASSES) * len(directions),
        "resolution": [scene.render.resolution_x, scene.render.resolution_y],
        "camera": {"type": camera.data.type, "orthoScale": camera.data.ortho_scale, "azimuthDegrees": -90, "elevationDegrees": 55},
        "presentationFps": scene.render.fps,
    }
    report["coverageComplete"] = report["renderedFrames"] == report["expectedFrames"]
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))


main()
