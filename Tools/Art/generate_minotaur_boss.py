import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


COLORS = {
    "hide_dark": (0.22, 0.13, 0.09, 1.0),
    "hide": (0.44, 0.25, 0.15, 1.0),
    "hide_mid": (0.58, 0.35, 0.21, 1.0),
    "hide_light": (0.78, 0.54, 0.34, 1.0),
    "muscle": (0.86, 0.61, 0.38, 1.0),
    "mane": (0.12, 0.08, 0.07, 1.0),
    "mane_mid": (0.28, 0.15, 0.10, 1.0),
    "horn": (0.88, 0.80, 0.62, 1.0),
    "horn_shade": (0.58, 0.49, 0.35, 1.0),
    "eye": (1.0, 0.18, 0.12, 1.0),
    "hoof": (0.09, 0.07, 0.06, 1.0),
    "blood": (0.62, 0.10, 0.08, 1.0),
    "scar": (0.96, 0.67, 0.49, 1.0),
    "dust": (0.66, 0.49, 0.28, 0.42),
    "shadow": (0.0, 0.0, 0.0, 0.32),
}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
    return parser.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    return mat


def make_materials():
    return {key: material(f"MAT_Minotaur_{key}", value) for key, value in COLORS.items()}


def link_to(collection, obj):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def set_flat(obj):
    if hasattr(obj.data, "polygons"):
        for poly in obj.data.polygons:
            poly.use_smooth = False
    return obj


def transform_point(origin, yaw, point):
    x, y, z = point
    c = math.cos(yaw)
    s = math.sin(yaw)
    return (
        origin[0] + x * c - y * s,
        origin[1] + x * s + y * c,
        origin[2] + z,
    )


def transform_vector(yaw, vector):
    x, y, z = vector
    c = math.cos(yaw)
    s = math.sin(yaw)
    return Vector((x * c - y * s, x * s + y * c, z))


def add_sphere(collection, name, mats, mat_key, origin, yaw, loc, scale, segments=8, rings=4):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=transform_point(origin, yaw, loc))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler[2] = yaw
    obj.data.materials.append(mats[mat_key])
    link_to(collection, obj)
    return set_flat(obj)


def add_cube(collection, name, mats, mat_key, origin, yaw, loc, scale, rot_z=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=transform_point(origin, yaw, loc), rotation=(0, 0, yaw + rot_z))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    obj.data.materials.append(mats[mat_key])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    link_to(collection, obj)
    return set_flat(obj)


def add_cylinder_between(collection, name, mats, mat_key, origin, yaw, a, b, radius, vertices=6):
    start = Vector(transform_point(origin, yaw, a))
    end = Vector(transform_point(origin, yaw, b))
    mid = (start + end) * 0.5
    direction = end - start
    length = max(0.01, direction.length)
    quat = direction.to_track_quat("Z", "Y")
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=length, location=mid, rotation=quat.to_euler())
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mats[mat_key])
    link_to(collection, obj)
    return set_flat(obj)


def add_cone_between(collection, name, mats, mat_key, origin, yaw, base, tip, radius, vertices=5):
    start = Vector(transform_point(origin, yaw, base))
    end = Vector(transform_point(origin, yaw, tip))
    mid = (start + end) * 0.5
    direction = end - start
    length = max(0.01, direction.length)
    quat = direction.to_track_quat("Z", "Y")
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=0.0, depth=length, location=mid, rotation=quat.to_euler())
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mats[mat_key])
    link_to(collection, obj)
    return set_flat(obj)


def add_flat_disc(collection, name, mats, mat_key, origin, yaw, loc, scale, vertices=14):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=1, depth=0.4, location=transform_point(origin, yaw, loc))
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.rotation_euler[2] = yaw
    obj.data.materials.append(mats[mat_key])
    link_to(collection, obj)
    return set_flat(obj)


def direction_yaw(row):
    return math.pi / 2 - row * math.pi / 4


def action_pose(action, frame, frame_count):
    phase = frame / max(1, frame_count)
    walk = math.sin(phase * math.tau)
    if action == "walk":
        return {"bob": abs(walk) * 2.2, "stride": walk, "arm": -walk, "head": 0.04}
    if action == "windup":
        stamp = -1 if frame % 2 == 0 else 1
        return {"bob": 2.5 if stamp < 0 else -1.2, "stride": stamp * 0.7, "arm": -0.65, "head": 0.20, "dust": True}
    if action == "charge":
        return {"bob": 1.2 if frame % 2 else 0, "stride": math.sin(phase * math.tau) * 1.15, "arm": 0.9, "head": 0.55, "lean": 12}
    if action == "stomp":
        lift = -1.15 if frame <= 1 else 1.25 if frame == 2 else 0.25
        return {"bob": 4 if frame == 2 else 0, "stride": lift, "arm": -0.85 if frame <= 2 else 0.45, "head": 0.16, "dust": frame >= 2}
    if action == "triumph":
        return {"bob": -1.5, "stride": 0, "arm": -1.1, "head": -0.22, "roll": math.sin(phase * math.tau) * 0.55, "triumph": True}
    if action == "death":
        return {"death": frame / max(1, frame_count - 1), "stride": 0, "arm": 0, "head": 0.1}
    return {"bob": math.sin(phase * math.tau) * 1.1, "stride": 0, "arm": 0, "head": 0}


def add_wounds(collection, mats, origin, yaw, damaged, death):
    if not damaged and death <= 0:
        return
    add_cube(collection, "wound_chest_gash", mats, "blood", origin, yaw, (-7, -9.5, 61), (15, 1.2, 2.3), 0.18)
    add_cube(collection, "wound_chest_drip", mats, "blood", origin, yaw, (-4, -10.0, 55), (2.4, 1.3, 9), 0.0)
    add_cube(collection, "scar_rib", mats, "scar", origin, yaw, (10, -9.8, 51), (14, 1.2, 2.2), -0.15)
    add_cube(collection, "scar_arm", mats, "scar", origin, yaw, (-30, -4.5, 43), (10, 1.1, 2.2), 0.25)


def add_minotaur_pose(collection, mats, origin, row, action, frame, frame_count, variant):
    yaw = direction_yaw(row)
    pose = action_pose(action, frame, frame_count)
    damaged = variant == "damaged"
    death = pose.get("death", 0.0)
    collapse = death * -32
    lean = pose.get("lean", 0) * 0.08
    bob = pose.get("bob", 0) + collapse
    stride = pose.get("stride", 0)
    arm_swing = pose.get("arm", 0)
    head_lower = pose.get("head", 0)

    add_flat_disc(collection, "shadow", mats, "shadow", origin, yaw, (0, 2, 1), (34, 18, 0.35), 16)
    if pose.get("dust") or action == "charge":
        add_flat_disc(collection, "dust_left", mats, "dust", origin, yaw, (-22, 6, 4), (9, 4, 0.25), 9)
        add_flat_disc(collection, "dust_right", mats, "dust", origin, yaw, (22, 6, 4), (10, 4, 0.25), 9)

    if death > 0.82:
        add_sphere(collection, "collapsed_torso", mats, "hide", origin, yaw, (-4, 0, 17), (29, 13, 8), 8, 4)
        add_sphere(collection, "collapsed_head", mats, "mane", origin, yaw, (25, -8, 21), (14, 10, 9), 8, 4)
        add_cone_between(collection, "collapsed_horn_right", mats, "horn_shade", origin, yaw, (33, -10, 27), (55, -12, 31), 4)
        add_cone_between(collection, "collapsed_horn_left", mats, "horn_shade" if damaged else "horn", origin, yaw, (19, -10, 27), (2, -12, 31), 4)
        add_wounds(collection, mats, origin, yaw, True, death)
        return

    hip_z = 25 + bob
    chest_z = 55 + bob - death * 16
    head_z = 77 + bob - head_lower * 22 - death * 12
    shoulder_z = 61 + bob - death * 12

    left_step = stride * 8
    right_step = -stride * 8
    add_cylinder_between(collection, "thigh_left", mats, "hide_dark", origin, yaw, (-13, -1 + left_step * 0.15, hip_z), (-18, -1 + left_step, 11 + bob * 0.15), 5.2)
    add_cylinder_between(collection, "thigh_right", mats, "hide_dark", origin, yaw, (13, 1 + right_step * 0.15, hip_z), (18, 1 + right_step, 11 + bob * 0.15), 5.2)
    add_cube(collection, "hoof_left", mats, "hoof", origin, yaw, (-19, -2 + left_step, 6), (15, 11, 6), 0.0)
    add_cube(collection, "hoof_right", mats, "hoof", origin, yaw, (19, 2 + right_step, 6), (15, 11, 6), 0.0)

    add_sphere(collection, "pelvis", mats, "hide_dark", origin, yaw, (0, 2, hip_z), (17, 11, 11), 8, 4)
    add_sphere(collection, "massive_torso", mats, "hide", origin, yaw, (lean, 0, chest_z), (22, 14, 24), 8, 4)
    add_sphere(collection, "barrel_chest", mats, "muscle", origin, yaw, (lean, -7, chest_z + 5), (25, 8, 17), 8, 4)
    add_cube(collection, "abs_highlight", mats, "hide_light", origin, yaw, (lean, -14, chest_z - 8), (5, 2, 24), 0.0)
    add_cube(collection, "left_pec", mats, "hide_light", origin, yaw, (lean - 9, -14, chest_z + 8), (11, 2, 4), 0.0)
    add_cube(collection, "right_pec", mats, "hide_light", origin, yaw, (lean + 9, -14, chest_z + 8), (11, 2, 4), 0.0)

    left_hand = (-35, -5 + arm_swing * 10, 27 + bob - arm_swing * 3)
    right_hand = (35, -5 - arm_swing * 10, 27 + bob + arm_swing * 3)
    add_sphere(collection, "shoulder_left", mats, "hide_mid", origin, yaw, (-23 + lean, -1, shoulder_z), (9, 8, 10), 8, 4)
    add_sphere(collection, "shoulder_right", mats, "hide_mid", origin, yaw, (23 + lean, -1, shoulder_z), (9, 8, 10), 8, 4)
    add_cylinder_between(collection, "upper_arm_left", mats, "hide_mid", origin, yaw, (-25 + lean, -1, shoulder_z - 2), (-32 + lean, -4 + arm_swing * 4, 43 + bob), 5.3)
    add_cylinder_between(collection, "upper_arm_right", mats, "hide_mid", origin, yaw, (25 + lean, -1, shoulder_z - 2), (32 + lean, -4 - arm_swing * 4, 43 + bob), 5.3)
    add_cylinder_between(collection, "forearm_left", mats, "hide_dark", origin, yaw, (-32 + lean, -4 + arm_swing * 4, 43 + bob), left_hand, 5.0)
    add_cylinder_between(collection, "forearm_right", mats, "hide_dark", origin, yaw, (32 + lean, -4 - arm_swing * 4, 43 + bob), right_hand, 5.0)
    add_sphere(collection, "fist_left", mats, "hoof", origin, yaw, left_hand, (7, 6, 5), 8, 4)
    add_sphere(collection, "fist_right", mats, "hoof", origin, yaw, right_hand, (7, 6, 5), 8, 4)

    head_roll = pose.get("roll", 0)
    add_sphere(collection, "mane_back", mats, "mane", origin, yaw + head_roll * 0.15, (lean, 3, head_z), (16, 12, 16), 8, 4)
    add_sphere(collection, "bull_head", mats, "hide_mid", origin, yaw + head_roll * 0.15, (lean, -5, head_z), (17, 13, 13), 8, 4)
    add_sphere(collection, "snout", mats, "hide_light", origin, yaw + head_roll * 0.15, (lean, -18, head_z - 4), (10, 10, 6), 8, 3)
    add_cube(collection, "brow_mane", mats, "mane_mid", origin, yaw + head_roll * 0.15, (lean, -12, head_z + 7), (24, 4, 5), 0.0)
    add_cube(collection, "beard", mats, "hide_dark", origin, yaw + head_roll * 0.15, (lean, -15, head_z - 13), (12, 5, 9), 0.0)
    add_cube(collection, "eye_left", mats, "eye", origin, yaw + head_roll * 0.15, (lean - 6, -18.5, head_z + 2), (3.6, 1.0, 3.6), 0.0)
    add_cube(collection, "eye_right", mats, "eye", origin, yaw + head_roll * 0.15, (lean + 6, -18.5, head_z + 2), (3.6, 1.0, 3.6), 0.0)

    left_tip = (-34, -12, head_z + 21)
    if damaged:
        left_tip = (-23, -12, head_z + 16)
    add_cone_between(collection, "horn_left", mats, "horn_shade" if damaged else "horn", origin, yaw + head_roll * 0.15, (-10 + lean, -9, head_z + 10), (left_tip[0] + lean, left_tip[1], left_tip[2]), 4.8)
    add_cone_between(collection, "horn_right", mats, "horn", origin, yaw + head_roll * 0.15, (10 + lean, -9, head_z + 10), (34 + lean, -12, head_z + 21), 4.8)
    if damaged:
        add_sphere(collection, "broken_horn_blood", mats, "blood", origin, yaw + head_roll * 0.15, (-22 + lean, -12, head_z + 16), (3.8, 2.0, 3.8), 6, 3)

    if pose.get("triumph"):
        add_cone_between(collection, "triumph_head_arc_a", mats, "dust", origin, yaw, (-25, -20, head_z + 13), (-37, -22, head_z + 20), 2.4, 5)
        add_cone_between(collection, "triumph_head_arc_b", mats, "dust", origin, yaw, (25, -20, head_z + 13), (37, -22, head_z + 20), 2.4, 5)

    add_wounds(collection, mats, origin, yaw, damaged, death)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_camera_and_light(scene, width, height):
    camera_data = bpy.data.cameras.new("CAM_MinotaurBoss_Ortho")
    camera = bpy.data.objects.new("CAM_MinotaurBoss_Ortho", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = height
    camera.location = (width / 2, -860, height / 2)
    look_at(camera, (width / 2, 0, height / 2))
    scene.camera = camera

    sun_data = bpy.data.lights.new("KEY_MinotaurBoss_Sun", type="SUN")
    sun = bpy.data.objects.new("KEY_MinotaurBoss_Sun", sun_data)
    bpy.context.scene.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(42), 0, math.radians(-28))
    sun.data.energy = 2.2
    return camera


def setup_render(scene):
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.use_file_extension = True


def triangle_count(collection):
    total = 0
    for obj in collection.objects:
        if hasattr(obj.data, "polygons"):
            for polygon in obj.data.polygons:
                total += max(1, len(polygon.vertices) - 2)
    return total


def join_pose_objects(collection, pose_name, before):
    new_objects = [obj for obj in collection.objects if obj.name not in before]
    if len(new_objects) <= 1:
        if new_objects:
            new_objects[0].name = pose_name
        return
    bpy.ops.object.select_all(action="DESELECT")
    active = new_objects[0]
    bpy.context.view_layer.objects.active = active
    for obj in new_objects:
        obj.select_set(True)
    bpy.ops.object.join()
    active.name = pose_name
    active.data.name = f"{pose_name}_Mesh"
    link_to(collection, active)


def render_sheet(scene, mats, manifest, output, variant, action_def):
    frame_w = manifest["frame"]["width"]
    frame_h = manifest["frame"]["height"]
    frames = action_def["frames"]
    width = frame_w * frames
    height = frame_h * len(manifest["directionRows"])
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.camera.data.ortho_scale = height
    scene.camera.location = (width / 2, -860, height / 2)
    look_at(scene.camera, (width / 2, 0, height / 2))

    collection = bpy.data.collections.new(f"RAW_Minotaur_{variant}_{action_def['action']}")
    bpy.context.scene.collection.children.link(collection)
    for row in range(len(manifest["directionRows"])):
        for frame in range(frames):
            before = {obj.name for obj in collection.objects}
            origin = (frame * frame_w + frame_w / 2, 0, (len(manifest["directionRows"]) - row - 1) * frame_h + 16)
            add_minotaur_pose(collection, mats, origin, row, action_def["action"], frame, frames, variant)
            join_pose_objects(collection, f"POSE_{variant}_{action_def['action']}_{row}_{frame}", before)

    bpy.context.view_layer.update()
    base = f"minotaur_{variant}_{action_def['action']}_8dir_{frames}f"
    scene.render.filepath = str(output / f"raw_{base}.png")
    bpy.ops.render.render(write_still=True)
    tris = math.ceil(triangle_count(collection) / max(1, frames * len(manifest["directionRows"])))

    for obj in list(collection.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(collection)
    return {
        "variant": variant,
        "action": action_def["action"],
        "frames": frames,
        "x": 0,
        "y": 0,
        "width": width,
        "height": height,
        "rawFile": f"raw_{base}.png",
        "triangles": tris,
    }


def build_preview_scene(mats):
    collection = bpy.data.collections.new("CHR_MinotaurBoss_LowPoly")
    bpy.context.scene.collection.children.link(collection)
    add_minotaur_pose(collection, mats, (0, 0, 16), 2, "idle", 0, 4, "normal")
    root = bpy.data.objects.new("CHR_MinotaurBoss_Root", None)
    bpy.context.scene.collection.objects.link(root)
    return collection, root


def main():
    args = parse_args()
    manifest_path = Path(args.manifest)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(manifest_path.read_text())

    clear_scene()
    mats = make_materials()
    scene = bpy.context.scene
    setup_render(scene)
    max_width = max(action["frames"] for action in manifest["actions"]) * manifest["frame"]["width"]
    sheet_height = len(manifest["directionRows"]) * manifest["frame"]["height"]
    setup_camera_and_light(scene, max_width, sheet_height)

    preview_collection, root = build_preview_scene(mats)
    root["asset"] = manifest["asset"]
    root["pipeline"] = manifest["source"]
    root["modeling"] = "low-poly 3D primitives with eight-direction orthographic capture"
    root["triangle_budget"] = manifest["triangleBudget"]
    root["frame_width"] = manifest["frame"]["width"]
    root["frame_height"] = manifest["frame"]["height"]

    sheets = []
    max_pose_triangles = triangle_count(preview_collection)
    for obj in preview_collection.objects:
        obj.hide_render = True
    for variant in manifest["variants"]:
        for action_def in manifest["actions"]:
            sheet = render_sheet(scene, mats, manifest, output, variant["variant"], action_def)
            sheets.append(sheet)
            max_pose_triangles = max(max_pose_triangles, sheet["triangles"])
    for obj in preview_collection.objects:
        obj.hide_render = False

    blend_path = output / manifest["outputs"]["blend"]
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    report = {
        "asset": manifest["asset"],
        "blend": blend_path.name,
        "modeling": "low-poly 3D primitives",
        "frameWidth": manifest["frame"]["width"],
        "frameHeight": manifest["frame"]["height"],
        "directionRows": manifest["directionRows"],
        "variants": [entry["variant"] for entry in manifest["variants"]],
        "actions": manifest["actions"],
        "atlas": {
            "file": None,
            "directRawSheets": True,
            "sheets": sheets,
        },
        "triangles": max_pose_triangles,
        "triangleBudget": manifest["triangleBudget"],
        "flatShaded": True,
        "renderEngine": scene.render.engine,
        "camera": {
            "type": "ORTHO",
            "sourceFrame": "128x128",
            "directionMode": "rotated 3D model per declared direction row",
        },
    }
    (output / manifest["outputs"]["report"]).write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
