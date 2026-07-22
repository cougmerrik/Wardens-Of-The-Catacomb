---
name: wardens-blender-sprite-art
description: Create, rig, animate, directionally render, clean, and validate 16-bit-style Wardens character sprites from reusable low-poly Blender models. Use for knights, playable classes, enemies, bosses, NPCs, eight-direction idle/walk/attack/hurt/death sheets, weapon variations, enemy recolors, shadow and silhouette passes, armatures, bone naming, pose mirroring, action copying, camera turntables, batch rendering, palette reduction, Aseprite cleanup, or any Wardens 3D-to-2D sprite workflow that must match the runtime frame, direction, pivot, palette, pass, and nearest-neighbor contracts.
---

# Wardens Blender Sprite Art

Use the shared `blender-mcp` skill for safe Blender operations and apply the Wardens sprite contract throughout modeling, rigging, capture, cleanup, and export.

## Required context

Read before changing a scene:

- `docs/BLENDER_SPRITE_PIPELINE.md` for the durable workflow and knight example.
- `references/sprite-specification.md` for the compact execution contract.

If they conflict, follow the durable document and update the compact reference in the same change.

## Workflow

1. Inspect the scene and preserve unrelated content.
2. Define character category, silhouette, equipment, triangle budget, material roles, actions, directions, frame counts, weapon variants, recolor palettes, output passes, and output paths.
3. Create a named character collection with a root, mesh group, armature, equipment, capture rig, lights, and camera.
4. Model for 64x64 readability. Use flat shading, broad shapes, and no texture-dependent detail.
5. Build the minimum deform rig. Keep root motion disabled and feet grounded for capture.
6. Author actions at the approved pose counts and 10 fps presentation rate.
7. Render idle, walk, attack, hurt, and death in eight ordered directions with one compensated orthographic capture rig.
8. Render raw transparent 64x64 color, shadow, and silhouette passes, preserving one pivot and framing preset across every weapon and palette variant.
9. Clean and palette-reduce in Aseprite without resampling.
10. Upscale exactly 2x with nearest-neighbor sampling and pack 128x128 cells into one sheet per action.
11. Validate geometry, rig, actions, direction/action/weapon/palette/pass coverage, bounds, pivots, palette, alpha, cross-pass alignment, sheets, and native gameplay previews.
12. Validate at least one sheet through the real browser/runtime loader, including asynchronous image loading and procedural fallback behavior.
13. Compare the sprite's opaque core with its gameplay collision size; keep glow, cloth, wisps, and other transparent effects outside the solid hitbox unless intentional.
14. Ask before overwriting sources, cleaned frames, sheets, manifests, or runtime assets.

## Source-first correction

Fix repeated proportion, clipping, attachment, pose, lighting, or framing problems in Blender and rerender. Reserve Aseprite for pixel judgment and local cleanup, not for compensating for a broken model or rig across dozens of frames.

## Mechanical automation

Use Blender MCP to create armatures, name bones, parent meshes, generate simple walk-cycle starting poses, mirror compatible poses, copy actions between matching rigs, set exact frame ranges, create actions, rotate the compensated eight-direction capture rig, and batch-render the declared output matrix.

Keep asymmetric weapons and shields out of blind pose mirroring. Treat generated cycles as starting points that still require deformation, contact, arc, timing, and silhouette review.

## Required report

- Character, model, rig, and capture collection names.
- Evaluated triangles and material roles.
- Bone list and root-motion state.
- Actions, frame ranges, loop flags, frame counts, direction order, weapons, palettes, passes, and presentation rate.
- Camera, lighting, raw resolution, final cell size, and scaling method.
- Coverage, pivot, bounds, palette, alpha, loop, clipping, and cross-pass alignment results.
- Source, Aseprite, sheet, and manifest paths, or explicit unsaved status.
- Runtime integration status and intentional exceptions.
