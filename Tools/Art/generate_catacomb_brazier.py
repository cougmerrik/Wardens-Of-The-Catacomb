"""Deterministically generate and render the Wardens catacomb brazier."""

import argparse
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args():
    args = list(__import__("sys").argv)
    args = args[args.index("--") + 1 :] if "--" in args else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(args)


def hex_rgba(value):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def material(name, color):
    result = bpy.data.materials.new(name)
    result.diffuse_color = hex_rgba(color)
    result.roughness = 1.0
    return result


def parent_and_name(obj, name, root, mat=None):
    obj.name = name
    obj.parent = root
    if mat and obj.type == "MESH":
        obj.data.materials.append(mat)
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = False
    return obj


def add_cone(name, root, mat, vertices, radius1, radius2, depth, z):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=(0, 0, z))
    return parent_and_name(bpy.context.object, name, root, mat)


def add_flame(name, root, mat, rotation):
    verts = [(-0.27, 0, 0), (-0.21, 0, 0.31), (-0.08, 0, 0.52), (0, 0, 0.72), (0.10, 0, 0.48), (0.23, 0, 0.28), (0.27, 0, 0)]
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], [tuple(range(len(verts)))])
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    parent_and_name(obj, name, root, mat)
    obj.location = (0, 0, 0.69)
    obj.rotation_euler.z = rotation
    return obj


def key(obj, frame, scale=None, location=None, hidden=None):
    if scale is not None:
        obj.scale = scale
        obj.keyframe_insert("scale", frame=frame, group="ProceduralState")
    if location is not None:
        obj.location = location
        obj.keyframe_insert("location", frame=frame, group="ProceduralState")
    if hidden is not None:
        obj.hide_render = hidden
        obj.hide_viewport = hidden
        obj.keyframe_insert("hide_render", frame=frame, group="ProceduralState")
        obj.keyframe_insert("hide_viewport", frame=frame, group="ProceduralState")


def configure_scene(manifest):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, 17
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = manifest["frame"]["width"]
    scene.render.resolution_y = manifest["frame"]["height"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.display.shading.light = "FLAT"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.curvature_ridge_factor = 1.2
    scene.display.shading.curvature_valley_factor = 0.8
    scene.display.render_aa = "OFF"

    root = bpy.data.objects.new("ENV_CatacombBrazier_ROOT", None)
    bpy.context.collection.objects.link(root)
    root["asset_category"] = manifest["category"]
    root["spec_version"] = manifest["specification"]
    root["random_seed"] = manifest["seed"]
    root["triangle_budget"] = manifest["triangleBudget"]
    root["render_resolution"] = "48x48"
    root["animation_frames"] = 17

    palette = manifest["palette"]
    iron = material("MAT_DarkIron_Brazier", palette["ironMid"])
    ember = material("MAT_Ember_Unlit", palette["ember"])
    orange = material("MAT_Flame_Orange", palette["flameOrange"])
    hot = material("MAT_Flame_Hot", palette["flameHot"])
    core = material("MAT_Flame_Core", palette["flameCore"])
    smoke_dark = material("MAT_Smoke_Dark", palette["smokeDark"])
    smoke_light = material("MAT_Smoke_Light", palette["smokeLight"])

    add_cone("SM_CatacombBrazier_Bowl", root, iron, 12, 0.43, 0.34, 0.18, 0.59)
    add_cone("SM_CatacombBrazier_Stem", root, iron, 6, 0.12, 0.09, 0.42, 0.30)
    embers = add_cone("SM_CatacombBrazier_Embers", root, ember, 12, 0.28, 0.28, 0.025, 0.695)
    for index, angle in enumerate((0, 120, 240), 1):
        bpy.ops.mesh.primitive_cube_add(location=(0.22 * math.cos(math.radians(angle)), 0.22 * math.sin(math.radians(angle)), 0.075))
        foot = parent_and_name(bpy.context.object, f"SM_CatacombBrazier_Foot_{index:02d}", root, iron)
        foot.dimensions = (0.46, 0.13, 0.15)
        foot.rotation_euler.z = math.radians(angle)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    flames = [
        add_flame("FX_CatacombBrazier_Flame_01", root, orange, math.radians(5)),
        add_flame("FX_CatacombBrazier_Flame_02", root, hot, math.radians(65)),
        add_flame("FX_CatacombBrazier_Flame_03", root, core, math.radians(125)),
    ]
    smoke = []
    for index, (mat, scale) in enumerate(((smoke_dark, (0.18, 0.11, 0.22)), (smoke_light, (0.13, 0.09, 0.16)), (smoke_dark, (0.10, 0.07, 0.12))), 1):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=(0, 0, 1.0))
        puff = parent_and_name(bpy.context.object, f"FX_CatacombBrazier_Smoke_{index:02d}", root, mat)
        puff.scale = scale
        smoke.append(puff)

    # Unlit, ignition, lit loop, then extinguish. Stepped interpolation preserves pixel poses.
    flame_scales = {
        1: 0.001, 2: 0.12, 3: 0.35, 4: 0.65, 5: 0.9,
        6: 1.0, 7: 0.92, 8: 1.08, 9: 0.95, 10: 1.04, 11: 1.0,
        12: 0.72, 13: 0.38, 14: 0.12, 15: 0.001, 16: 0.001, 17: 0.001,
    }
    for frame, base_scale in flame_scales.items():
        key(embers, frame, hidden=frame == 1 or frame >= 15)
        for index, flame in enumerate(flames):
            wobble = (1.0 + (((frame + index * 2) % 5) - 2) * 0.035) if base_scale > 0.01 else 1.0
            key(flame, frame, (base_scale * wobble, base_scale, base_scale * (1.0 + index * 0.04)), hidden=base_scale < 0.01)
    for frame in range(1, 18):
        smoke_progress = max(0, frame - 13)
        for index, puff in enumerate(smoke):
            visible = smoke_progress >= index + 1 and smoke_progress <= index + 3
            rise = 0.82 + 0.12 * smoke_progress + 0.10 * index
            drift = 0.035 * (smoke_progress - index) * (-1 if index % 2 else 1)
            key(puff, frame, location=(drift, 0, rise), hidden=not visible)

    camera_data = bpy.data.cameras.new("CAM_CatacombBrazier_Sprite_Data")
    camera = bpy.data.objects.new("CAM_CatacombBrazier_Sprite", camera_data)
    bpy.context.collection.objects.link(camera)
    azimuth = math.radians(manifest["camera"]["azimuthDegrees"])
    elevation = math.radians(manifest["camera"]["elevationDegrees"])
    distance = 5.5
    camera.location = (distance * math.cos(elevation) * math.cos(azimuth), distance * math.cos(elevation) * math.sin(azimuth), distance * math.sin(elevation))
    target = Vector((0, 0, 0.65))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = manifest["camera"]["orthoScale"]
    scene.camera = camera
    return scene, root


def main():
    args = parse_args()
    manifest_path = Path(args.manifest).resolve()
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(manifest_path.read_text())
    scene, root = configure_scene(manifest)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    triangle_count = 0
    for obj in scene.objects:
        if obj.type == "MESH":
            mesh = obj.evaluated_get(depsgraph).data
            mesh.calc_loop_triangles()
            triangle_count += len(mesh.loop_triangles)
    root["triangle_count"] = triangle_count
    root["flat_shaded"] = all(not polygon.use_smooth for obj in scene.objects if obj.type == "MESH" for polygon in obj.data.polygons)
    if triangle_count > manifest["triangleBudget"]:
        raise RuntimeError(f"triangle budget exceeded: {triangle_count} > {manifest['triangleBudget']}")

    blend_path = output / manifest["outputs"]["blend"]
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)
    frames = []
    for frame in range(1, 18):
        scene.frame_set(frame)
        frame_path = output / f"frame_{frame:02d}.png"
        scene.render.filepath = str(frame_path)
        bpy.ops.render.render(write_still=True)
        frames.append(frame_path.name)
    report = {
        "asset": manifest["asset"], "manifest": str(manifest_path), "blend": blend_path.name,
        "frames": frames, "frameWidth": scene.render.resolution_x, "frameHeight": scene.render.resolution_y,
        "frameCount": len(frames), "triangles": triangle_count, "triangleBudget": manifest["triangleBudget"],
        "flatShaded": root["flat_shaded"], "renderEngine": scene.render.engine,
    }
    (output / manifest["outputs"]["report"]).write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report))


main()
