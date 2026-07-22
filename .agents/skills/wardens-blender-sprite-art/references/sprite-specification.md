# Wardens 3D-to-2D Sprite Specification

Use `docs/BLENDER_SPRITE_PIPELINE.md` as the source of truth.

## Knight prototype baseline

- Maximum 1,200 evaluated triangles.
- Flat shading only.
- Eight or fewer flat material roles before indexed cleanup.
- Minimal root/pelvis/spine/chest/head/limb rig with optional weapon and shield controls.
- Root motion disabled for capture.
- Eight directions in runtime order.
- Eight-direction idle, walk, attack, hurt, and death coverage.
- Orthographic 45-degree azimuth and 55-degree elevation baseline.
- Fixed three-value lighting and exposure.
- Transparent 64x64 raw and cleaned frames.
- Exact 2x nearest-neighbor upscale to 128x128 runtime source cells.
- Fixed feet/contact pivot across every frame.

## Actions

| Action | Frames | Loop |
| --- | ---: | --- |
| Idle | 4 | Yes |
| Walk | 6 | Yes |
| Attack | 6 | No |
| Hurt | 4 | No |
| Death | 8 | No |

Use a 10 fps presentation rate. Export one sheet per action with direction rows and chronological frame columns.

## Variant matrix

Track every output as:

`character × action × direction × weapon × palette × pass × frame`

- Reuse one rig, deterministic bone names, and weapon sockets across equipment variants.
- Use weapon-specific attack actions when timing or body mechanics differ.
- Generate enemy recolors from semantic indexed-palette mappings applied to one cleaned master.
- Export `color`, `shadow`, and `silhouette` passes with identical cells and pivots.
- Keep silhouettes binary and include equipped weapons and shields.
- Keep shadows separate from color sheets with one family-wide light direction and opacity ramp.
- Record rig version, weapon id, hit frame, palette id/version, pass, pivot, and cell size in the manifest.

## MCP automation targets

- Armature and bone creation from an explicit rig specification.
- Stable bone naming and left/right pairing.
- Mesh, weapon, and shield parenting.
- Simple six-frame walk-cycle generation.
- Safe pose mirroring with asymmetric-equipment exclusions.
- Action copying between compatible rigs.
- Exact action frame ranges, loop flags, and action names.
- Eight-position compensated orthographic capture rig.
- Batch rendering of the complete declared variant matrix.
- Complete neutral location/rotation/scale keys for every controlled bone at each action baseline so action creation order cannot leak transforms.
- Blender 5.x layered-action validation through layers, strips, channel bags, and F-curves.

## Aseprite gates

- One indexed palette across the character family.
- No interpolated resizing.
- No unintended partial-alpha edge pixels.
- No isolated pixels, accidental holes, or inconsistent one-pixel outlines.
- Stable root, feet, head height, proportions, attachments, and light direction.
- Complete action/direction/weapon/palette/pass coverage with pixel-aligned color, shadow, and silhouette outputs.
- Fix systematic problems in Blender and rerender.

## Runtime gate

- Load representative sheets through the actual browser asset path; do not rely only on direct PNG inspection.
- Allow the procedural renderer only as a temporary asynchronous/error fallback and confirm the sprite replaces it after image load.
- Validate shadow, color, and glow order, alpha, palette mapping, nearest-neighbor filtering, action timing, and eight-direction row selection.
- Size collision from the opaque gameplay core, not the full transparent cell or glow bounds.
- Give repeated looping actors a stable per-entity phase offset when lockstep motion harms visual variety, and serialize that phase for multiplayer parity.
- When a death sheet supplies the persistent remnant, clamp to its final frame for the approved lifetime instead of substituting a procedural corpse effect.
