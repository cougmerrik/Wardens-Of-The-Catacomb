# Blender 3D-to-2D Sprite Pipeline

## Purpose

This document defines an exploratory Blender-to-Aseprite workflow for producing consistent 16-bit-style directional sprites from reusable 3D models. The core idea is to model and rig a character once, author each action once, render it from fixed directions, and perform final palette and pixel cleanup in Aseprite.

This approach should improve proportion, equipment placement, grounding, and animation consistency compared with drawing every direction and frame independently. It does not remove pixel-art judgment: silhouettes, palette ramps, isolated pixels, overlaps, and gameplay readability still require a deliberate 2D cleanup pass.

The division of labor is deliberate:

- Blender owns structure and movement: models, armatures, bone names, parenting, reusable actions, exact frame ranges, pose mirroring, camera directions, and batch renders.
- Aseprite owns pixel cleanup and artistic character: indexed palettes, pixel clusters, silhouettes, selective exaggeration, outlines, highlights, and final sheet polish.

## Pipeline Status

- The workflow is a proposed `sprite-art/v0.1` baseline and has not yet been integrated into the runtime asset loader.
- Wardens currently expects 128 px source frames, eight directions, six walk frames per direction, nearest-neighbor canvas rendering, a 44 px gameplay render size, and a nominal animation speed of 10 fps.
- Use 64x64 px as the low-resolution Blender capture target, then upscale exactly 2x with nearest-neighbor sampling to the existing 128 px source-frame contract.
- Idle, attack, hurt, and death sheet mappings are proposed and will require explicit runtime integration before replacing current presentation.
- Keep original `.blend`, low-resolution renders, cleaned Aseprite source, and exported sheets so the pipeline remains reversible.
- The Aseprite trial cannot save files and is evaluation-only. Use a licensed build for production cleanup, `.aseprite` sources, exports, and CLI automation.

## Why 64x64 for Wardens

- 32x32 is useful for tiny enemies or icons but leaves little room for readable weapons and class silhouettes.
- 48x48 can be a valid standalone target, but it cannot be scaled to the current 128 px source frame by an integer factor.
- 64x64 preserves a deliberately pixel-limited image and scales exactly 2x to 128x128.
- The runtime may still display the 128 px source at the configured 44 px gameplay size with image smoothing disabled. The no-non-integer-resize rule applies to offline source processing, not the runtime's existing draw contract.

## Example Asset: Low-Poly Knight

### Model

- Create one approximately human-proportioned knight with a broad shoulder line, readable helmet, shield-side silhouette, and one primary weapon.
- Keep the neutral pose centered over the origin with feet on Z=0.
- Use flat shading and simple geometry. Avoid thin bevels, fingers, facial features, or surface details that disappear at 64x64.
- Target at most 1,200 evaluated triangles for the body, armor, weapon, and shield combined.
- Use separate logical parts only when required for rigging, equipment swaps, or palette control.

### Materials

- Use flat base colors from a restricted role palette: deep shadow, dark iron, mid iron, highlight metal, leather, cloth accent, skin where visible, and weapon accent.
- Use no photographic textures, normal maps, smooth procedural noise, transparency gradients, or high-frequency roughness.
- Keep the primary read within three value bands and reserve the brightest value for helmet, weapon, shield, or effect highlights.
- Keep ordinary characters to eight palette roles before Aseprite reduction.

### Minimal armature

Use the smallest rig that produces clear poses:

- `ROOT`
- `pelvis`
- `spine`
- `chest`
- `head`
- left/right upper arm, forearm, and hand
- left/right thigh, shin, and foot
- optional weapon and shield control bones

Parent `ROOT` to the world origin and keep root motion disabled for sprite capture. Use stepped or deliberately sampled animation; do not rely on sub-frame motion blur.

### Animation baseline

| Action | Frames | Loop | Intent |
| --- | ---: | --- | --- |
| Idle | 4 | Yes | restrained breathing and weight shift |
| Walk | 6 | Yes | matches the current Wardens walk contract |
| Attack | 6 | No | anticipation, strike, and recovery |
| Hurt | 4 | No | readable recoil without changing the foot pivot |
| Death | 8 | No | staged collapse with a stable final frame |

Sample at a 10 fps presentation rate. Author curves normally if useful, but render only the approved integer pose frames.

## Directional Capture Rig

- Render eight directions at 45-degree intervals in the same row order used by the runtime.
- Keep one orthographic camera, elevation, orthographic scale, target, resolution, and framing preset for the entire character family.
- Rotate a capture rig containing the camera and lights around the character, or rotate the character together with equipment under a compensated light rig. Do not allow lighting direction or framing to drift by direction.
- Keep the character root, ground contact, and frame pivot identical across every render.
- Ensure weapon and shield do not clip into the body in diagonal and rear views.
- Store direction names and angles in export metadata rather than relying on alphabetical filenames.

## Required Render Matrix

Treat every output as a declared combination:

`character × action × direction × weapon × palette × pass × frame`

Do not create an untracked variant by manually repainting a finished sheet.

### Eight-direction actions

- Render idle, walking, attacks, hurt, and death in all eight directions unless the runtime explicitly adopts a direction-independent exception.
- Preserve one direction order across every action and variant.
- Keep frame ranges exact and action-local. Do not render timeline gaps or neighboring actions.

### Weapon variations

- Attach weapons to named control bones or sockets. Do not duplicate and independently edit the character rig for each weapon.
- Reuse body actions where silhouette, handedness, reach, and timing allow.
- Create weapon-specific attack actions when wind-up, hit timing, recovery, or body mechanics differ.
- Record weapon id, action id, attachment bone, frame count, hit frame, and silhouette bounds in the manifest.

### Enemy recolors

- Generate recolors from one cleaned indexed master using stable semantic roles such as armor shadow, armor midtone, armor highlight, cloth, skin, weapon, and effect accent.
- Preserve palette index meaning across every action, direction, weapon, and frame.
- Do not repaint every animation independently.
- Validate each palette against representative biome values; a technically correct recolor can still lose gameplay readability.

### Shadow and silhouette passes

- Export color, shadow, and silhouette as separate passes or layers with identical cell bounds and pivots.
- Use a binary silhouette pass for outlines, selection effects, hit flashes, occlusion, and bounds validation.
- Use a separate grayscale or indexed-alpha ground-contact shadow pass with one family-wide light direction and opacity ramp.
- Include equipped weapons and shields in the silhouette. Make their shadow contribution intentional.
- Never mix baked shadows in some color sheets with separate runtime shadows in others.
- Assert pixel-for-pixel alignment across all three passes.

## Mechanical Animation Automation

Blender MCP should automate repeatable mechanical work:

- Create armatures from an explicit bone specification.
- Apply deterministic bone names and left/right suffixes.
- Parent or weight meshes and equipment to declared bones.
- Generate a simple walk-cycle starting point with planted-foot poses.
- Mirror poses through bone-name pairs without flipping asymmetric equipment incorrectly.
- Copy compatible actions between characters that share the same rig contract.
- Set exact action frame ranges and loop flags.
- Create, name, activate, and preserve separate animation actions.
- Move a compensated orthographic camera/light capture rig through eight 45-degree directions.
- Batch-render every declared action, weapon, palette source, direction, frame, and output pass.

Automation produces a starting point and repeatable output, not automatic artistic approval. Review weight deformation, arcs, anticipation, contact poses, weapon readability, and silhouette at native resolution.

## Render Settings

- Output transparent RGBA PNG.
- Render each source pose at exactly 64x64 px.
- Use orthographic projection with the same 45-degree azimuth and 55-degree elevation baseline as environment captures unless gameplay tests justify a character-specific elevation.
- Use flat shading, three-value lighting, fixed exposure, and no bloom, depth of field, motion blur, glare, or color-changing effects.
- Disable antialiasing where feasible. If controlled antialiasing is required for stable silhouettes, use one setting across every direction and frame, then remove partial-alpha edge colors consistently during cleanup.
- Keep shadows either fully integrated into the sprite contract or completely separate. Do not mix baked and runtime shadows between actions.

## Sheet Layout and Naming

Export one sheet per action because frame counts differ:

- Rows: eight facing directions in runtime order.
- Columns: chronological animation frames.
- Cell size: 128x128 after exact 2x nearest-neighbor upscale.
- Pivot: fixed feet/contact coordinate in every cell.

Use names such as:

- `knight_idle_8dir_4f.png`
- `knight_walk_8dir_6f.png`
- `knight_attack_8dir_6f.png`
- `knight_hurt_8dir_4f.png`
- `knight_death_8dir_8f.png`

Add variant and pass suffixes when applicable:

- `knight_attack_longsword_8dir_6f_color.png`
- `knight_attack_longsword_8dir_6f_shadow.png`
- `knight_attack_longsword_8dir_6f_silhouette.png`
- `skeleton_walk_rust_8dir_6f_color.png`

Keep a machine-readable manifest with direction order, action frame counts, frame duration, pivot, cell size, source file, rig version, weapon, hit frame, palette id/version, output passes, shadow settings, silhouette bounds, and intentional exceptions.

## Aseprite Cleanup

1. Import the raw 64x64 frame sequence without resampling.
2. Apply one shared indexed palette across the whole character family.
3. Reduce redundant near-colors while preserving the shadow, midtone, and highlight ramps.
4. Remove isolated pixels, stair-step noise, accidental holes, and inconsistent one-pixel outlines.
5. Repair silhouettes and overlaps at native resolution, especially hands, weapon tips, feet, helmet horns, and shield edges.
6. Check animation onion-skinning for jitter in the root, feet, head height, and equipment attachment.
7. Check all eight directions side by side for matching proportions and palette roles.
8. Upscale cleaned frames from 64x64 to 128x128 using nearest-neighbor sampling only, then pack final sheets without additional scaling.

Do not paint unique structural corrections into only one frame when the same problem originates in the 3D model or rig. Fix the source and rerender whenever practical.

## Validation Checklist

- The same model, rig, camera preset, light rig, palette roles, and pivot are used for all actions and directions.
- Evaluated triangle count is at or below the character budget.
- Every rendered polygon is flat shaded and prohibited smoothing features are absent.
- All expected direction/action/frame combinations exist exactly once.
- All declared weapon, palette, and output-pass combinations exist exactly once without undeclared extras.
- Root and feet remain stable except where an action intentionally leaves the ground.
- No direction has unexpected clipping, missing equipment, changed proportions, or light inversion.
- Raw frames are 64x64; cleaned source frames remain 64x64; final cells are exact 2x nearest-neighbor 128x128.
- Final sheets contain no unintended partial-alpha pixels or colors outside the approved indexed palette.
- Color, shadow, and silhouette passes share identical cells, pivots, and occupied-pixel alignment.
- Native 44 px gameplay previews remain readable against catacomb lighting and floor values.
- The runtime mapping is updated and validated before replacing an existing sprite implementation.

## Recommended First Experiment

Build the low-poly knight as a disposable named prototype collection without replacing any current player art. Complete one front-facing idle and walk pass first, render it at 32x32, 48x48, and 64x64 for comparison, and select the smallest size that preserves helmet, shield, weapon, feet, and action readability. Then expand the chosen preset to eight directions and the remaining actions.
