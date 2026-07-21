# Environment Art Pipeline

## Purpose

This document defines the persistent Blender MCP workflow and the initial environment-art direction for Wardens of the Catacomb. It is the source of truth for Blender-authored environment pieces, modular construction rules, render presentation, and asset validation.

The first target set includes stone floors, catacomb walls, pillars, arches, coffins, urns, braziers, gates, chains, and modular room components. The direction favors chunky low-poly silhouettes that remain legible after conversion to the game's pixel-forward presentation.

## Current Pipeline Status

- Blender 5.2 LTS is the current authoring tool.
- The official Blender Lab MCP extension and local stdio server are used for Codex integration.
- The repository-tracked `blender-mcp` skill owns the shared tool-safe, project-neutral workflow. A global copy may also be installed for non-Wardens projects.
- The repository-local `wardens-blender-environment-art` skill owns this project's art constraints.
- The game currently uses a 32 px world tile, 128 px player source frames, eight directions, six walk frames per direction, and nearest-neighbor canvas rendering.
- Direct runtime ingestion of Blender exports is not yet standardized. Preserve `.blend` sources and validated renders until an import contract is implemented.

## Blender MCP Workflow

### Inspect before editing

1. Confirm the connected Blender scene, active mode, active object, collections, and existing naming conventions.
2. Use a new asset collection and root Empty for experiments. Do not delete or repurpose unrelated scene content.
3. Record units, dimensions, origin, tile axis, triangle budget, and intended capture category on the root object as custom properties.
4. Prefer dedicated MCP inspection tools. Use arbitrary `bpy` execution only when no narrower tool covers the operation.

### Build deterministically

- Use meters with Z up.
- Use exact module boundaries for snapping and tiling. Put irregularity inside the boundary rather than moving the outer seam.
- Prefer simple authored meshes and modifiers that preserve the triangle budget. Do not rely on subdivision.
- Use deterministic seeds or explicit dimensions for procedural variation so an asset can be reproduced.
- Keep one logical asset per collection. Use descriptive prefixes such as `ENV_`, `SM_`, `MAT_`, `CAM_`, and `LGT_`.
- Parent components to a root Empty at the asset origin.

### Validate before saving or exporting

- Measure evaluated dimensions and world-space bounds.
- Triangulate for counting and compare the evaluated triangle total with the category budget.
- Assert flat polygon shading and reject smooth faces, subdivision, and custom split normals.
- Check transforms, origin, material count, missing files, hidden geometry, and orphaned data.
- For modular pieces, duplicate the asset by the declared module step and inspect both seams.
- Render from the standard camera and inspect at native output size, not only zoomed in.
- Save or export only after reporting the checks. Never overwrite an existing `.blend` or export without confirmation.

## Wardens Art Direction Specification

This is baseline `environment-art/v0.1`. Hard requirements apply to every accepted asset. Numeric baselines are intentional starting points and should be revised here when gameplay-scale evaluation provides better evidence.

### Visual language

- Favor heavy, ancient, readable forms over realistic masonry or ornamental noise.
- Use controlled asymmetry: uneven blocks, chipped corners, settling, and slight depth variation.
- Preserve strong silhouettes and broad value groups at native resolution.
- Avoid photorealism, high-frequency surface noise, smooth gradients, thin unsupported details, and modern clean construction.
- Reserve saturated color for gameplay-relevant accents such as flame, magic, poison, or interactable markers.

### Geometry requirements

- Flat shading only.
- No smooth normals, auto smooth, weighted-normal modifiers, subdivision surfaces, or normal-map-dependent form.
- Count triangles after evaluation; quads are not the budget unit.
- Keep transforms applied before export unless a documented animation or modular workflow requires otherwise.
- Keep modular seam coordinates exact. Edge silhouettes must match when duplicated at the module interval.
- Use no more than four material slots per ordinary asset. Prefer one to three.

### Polygon budgets

| Asset category | Maximum triangles | Examples |
| --- | ---: | --- |
| Tiny prop | 96 | loose stone, candle, small chain cluster |
| Small prop | 180 | urn, skull pile, wall bracket, brazier bowl |
| Medium prop | 300 | coffin, sarcophagus lid, floor tile, 2 m wall segment |
| Structural feature | 500 | pillar, arch, gate, doorway |
| Animated environment prop | 600 | gate with moving parts, trap, large brazier |
| Modular room component | 1,200 | corner kit, alcove assembly, room dressing cluster |

Treat these as caps, not targets. Split a room kit into reusable components when a single piece approaches its cap.

### Modular dimensions

- Author on a 1 m grid and prefer 2 m structural modules.
- Standard wall prototype: 2.0 m wide, approximately 2.1 m tall, and 0.25-0.40 m deep.
- Floor modules should use exact square footprints in 1 m or 2 m increments.
- Put the root origin at the bottom-center for walls and props, and at the footprint center for floors.
- Declare `module_width_m`, `module_depth_m`, and `tile_axis` custom properties when applicable.

### Camera and framing

- Use an orthographic camera.
- Use a fixed 45-degree azimuth and 55-degree elevation for standard asset captures.
- Center the asset on its root origin and keep a consistent ground contact line.
- Adjust orthographic scale only through category presets; do not rotate the camera to make individual assets look better.
- Produce transparent-background asset renders and a neutral-background review render when silhouette contrast needs checking.

### Lighting and values

- Compose every asset around three readable value bands: shadow, midtone, and highlight.
- Use one broad key light, restrained fill, and low neutral world light. Avoid multi-colored studio rigs.
- Keep cast shadows readable but not fully black.
- Disable bloom, depth of field, motion blur, filmic glare, and screen-space effects that obscure the base asset.
- Judge the result at native resolution and in representative game darkness before approval.

### Restricted material palette

Use palette roles rather than unconstrained per-asset colors. Minor value variation is allowed within a role, but new hues require an art-direction update.

| Role | Baseline colors |
| --- | --- |
| Deep shadow | `#1f2024`, `#29282b` |
| Catacomb stone | `#45444a`, `#625f5a`, `#7b756c` |
| Bone and dust | `#8c806c`, `#b0a189` |
| Dark iron | `#24272b`, `#3c4247`, `#687078` |
| Aged wood | `#3b2a22`, `#654738` |
| Ember accent | `#d64016`, `#ff5a0a`, `#ffc21c`, `#fff1a0` |
| Sickly accent | `#587052`, `#8e9b63` |

Use high roughness and simple base colors. Do not depend on photographic textures or smooth procedural noise for the primary read.

### Render and pixel-output rules

- Render at the final target resolution or an integer multiple only.
- Baseline captures: 64x64 px for a single structural tile, 128x128 px for props and modules, and 256x256 px for room-kit review renders.
- Disable antialiasing where the render engine permits. If edge stability requires antialiasing, use one documented setting for the whole asset family and never mix settings within an animation.
- Disable texture filtering and use nearest-neighbor scaling for every resize.
- Do not use non-integer scaling, post-process sharpening, or interpolated resizing.
- Keep color management and exposure fixed across an asset family.

### Animation standards

- Use stepped, readable poses rather than high-frame-rate realism.
- Use six frames for standard loops such as flame, chain sway, or ambient mechanisms.
- Use six frames for simple interactions such as a gate opening.
- Use eight frames for one-shot destruction, collapse, or trap actions.
- Keep loop endpoints clean and preserve a consistent root and camera across every frame.
- Deviations require a gameplay or readability reason recorded with the asset.

## Aseprite Cleanup And State-Animation Workflow

Use Aseprite after Blender capture for pixel-level cleanup, palette enforcement, animation timing, state tags, and deterministic sprite-sheet export. Preserve the Blender render as immutable input and save an editable `.aseprite` master under `art/aseprite/`. Exported runtime PNG and JSON files belong under `assets/images/environment/`.

### Import a fixed-grid Blender strip

1. Open the lossless PNG strip and import it as a sprite sheet rather than editing the strip as one frame.
2. Set the frame bounds to the exact render dimensions. For the brazier prototype, use a horizontal strip of six 48x48 frames with no padding.
3. Confirm the animation canvas remains 48x48 and the timeline contains one cel per source frame.
4. Set each ambient-loop frame to 125 ms for 8 FPS.
5. Save the editable source as `art/aseprite/<asset>/<asset>.aseprite` before cleanup.

Never crop individual frames, move the asset root, introduce fractional opacity at hard pixel edges, or resize with interpolation. Use a 1 px pencil, nearest-neighbor scaling, and native-size playback review. Keep stable geometry stationary across frames; only the intended animated elements should change.

### Example: brazier state animation

The catacomb brazier expands the six-frame ambient flame into four named states while preserving a 48x48 canvas and fixed bowl position:

| Frames | Tag | Duration | Playback | Content |
| --- | --- | ---: | --- | --- |
| 1 | `unlit` | 125 ms | Hold | Dark bowl with no flame or smoke |
| 2-5 | `ignite` | 100 ms each | Once | Spark, small flame, growing flame, full flame |
| 6-11 | `lit` | 125 ms each | Loop | The six-frame ambient flame cycle |
| 12-17 | `extinguish` | 125 ms each | Once | Shrinking flame, embers, smoke rise, smoke dissipation |

Use separate `Brazier`, `Flame`, and `Smoke` layers in the editable master. Reconstruct the unlit bowl beneath the removed flame, retaining only a faint charcoal ember value. Build ignition toward the first `lit` frame, and build extinguishing away from the final `lit` frame so state transitions do not jump. Smoke should use solid, restrained clusters that rise 1-2 pixels per frame, narrow, separate, and disappear; do not use a soft airbrush or interpolated motion.

Before export, preview each tag at native size and verify:

- The brazier silhouette, ground contact, canvas size, and pivot never move.
- `ignite` ends in a pose compatible with the `lit` loop.
- `extinguish` ends in a pose compatible with `unlit`.
- The flame reads as a pale-yellow core, yellow-orange body, red-orange edge, and dark outline.
- Smoke remains legible against both light review backgrounds and representative game darkness.

### Deterministic automation

Aseprite's batch CLI can deterministically export sheets and JSON from a tagged `.aseprite` master. Its Lua API can also create frames, cels, layers, durations, tags, and exact pixels. This makes file structure, timing, palette replacement, procedural flame/smoke shapes, and exports repeatable. Freehand cleanup is not reproducible unless the edited `.aseprite` source is committed, and authored flame or smoke motion is only reproducible when its exact pixels or generation parameters are stored in source control.

The preferred Wardens workflow is procedural end to end. Manual Aseprite work is an optional correction or art-direction pass, not a required build step. A generated asset should have one versioned manifest that supplies dimensions, seed, palette, camera preset, frame ranges, durations, and output names to all stages:

```text
versioned asset manifest
    -> headless Blender Python: model, materials, animation, cameras, render passes
    -> raw fixed-resolution PNG passes: Brazier, Flame, Smoke, optional Shadow
    -> headless Aseprite Lua: compose, alpha-threshold, palette-map, tag, time
    -> Aseprite CLI: horizontal PNG sheet and tag-aware JSON
    -> project validator: dimensions, pixels, ranges, timings, transparency, hashes
```

Generate the model from explicit dimensions and a fixed seed rather than treating a manually edited `.blend` as the only source. The generated `.blend` remains a useful inspectable build artifact and may be promoted as an art source after review. Render stable geometry and transient effects to separate transparent passes so the 2D stage never has to infer which pixels belong to the brazier, flame, glow, or smoke. Prefer generating flame and smoke motion in Blender when their silhouette benefits from the 3D camera; use Aseprite Lua for exact pixel operations and deliberately pixel-authored accents.

Run generation in a temporary output directory first. Validate it there, compare a manifest/input hash with the last accepted build, and only then promote the `.blend`, `.aseprite`, PNG, and JSON outputs. The normal pipeline must not silently overwrite accepted art. Given the same tool versions, manifest, scripts, and seed, two clean runs must produce identical validated outputs; where file-container metadata prevents byte-identical `.blend` or `.aseprite` files, require identical normalized scene measurements and exported pixel/JSON hashes instead.

Pin the Aseprite version used by the project, keep scripts and palettes in the repository, avoid random values or record an explicit seed, and make the `.aseprite` master the source of truth. A deterministic authoring script should:

1. Validate the input strip dimensions, color mode, and frame count.
2. Split the strip at an explicit 48x48 grid.
3. Create or validate the `Brazier`, `Flame`, and `Smoke` layers.
4. Create the four frame ranges, durations, and tags listed above.
5. Draw from fixed pixel masks or a seeded algorithm; never depend on UI state.
6. Export a horizontal sheet and JSON metadata in batch mode.
7. Reopen or inspect the outputs and assert dimensions, frame count, tag ranges, durations, transparency, and nearest-neighbor contract.

Example export from an already-authored tagged master:

```bash
ASEPRITE_BIN=/absolute/path/to/Aseprite-x64.AppImage
"$ASEPRITE_BIN" --batch \
  art/aseprite/catacomb_brazier/catacomb_brazier.aseprite \
  --sheet-type horizontal \
  --sheet assets/images/environment/catacomb/brazier/catacomb_brazier_states_17f_48.png \
  --data assets/images/environment/catacomb/brazier/catacomb_brazier_states_17f_48.json \
  --format json-array --list-tags
```

Use `--tag <name>` to export one state at a time or `--split-tags` when the runtime should load separate animations. Prefer tag-aware JSON over hard-coded frame ranges in game code. The CLI overwrites its output targets, so direct it to a temporary validation directory during iteration and only replace runtime assets during an intentional export step.

The reference implementation for this workflow lives under `Tools/Art/`:

- `catacomb-brazier.asset.json` is the versioned generation manifest.
- `generate_catacomb_brazier.py` creates the 3D model, procedural state animation, inspectable `.blend`, and 17 native-size PNG frames in headless Blender.
- `compose_catacomb_brazier.lua` assembles those frames into a timed, tagged `.aseprite` master without UI state.
- `build-catacomb-brazier.js` runs Blender, Aseprite composition, Aseprite export, and validation in a temporary directory by default.
- `validate-brazier-pipeline.js` checks the manifest, measured Blender report, triangle cap, flat shading, sheet geometry, RGBA format, exact frame rectangles, durations, and tag ranges.

Run `npm run art:brazier` for an ordinary temporary build or `npm run art:brazier -- --output /tmp/wardens-brazier-review` for a stable review directory. Set `BLENDER_BIN` or `ASEPRITE_BIN` only when the executables are not on `PATH`. Use `npm run validate:art:brazier:manifest` for the fast contract check and `npm run validate:art:brazier` for the complete tool-backed validation. Promotion into `art/` or `assets/` remains a separate intentional step.

## Asset Definition of Done

An environment asset is complete when:

- It has a named collection, root Empty, source `.blend`, and declared category.
- Dimensions, origin, transforms, triangle count, and material slots pass the specification.
- Every rendered face is flat shaded and no prohibited normal or subdivision features exist.
- Modular duplicates meet without gaps, overlaps, or visible boundary jumps.
- Camera, lighting, palette, resolution, filtering, and animation length match the category preset.
- Native-size review confirms silhouette, value grouping, and gameplay-scale readability.
- The generation prompt, validation result, and intentional exceptions are recorded with the asset or its task.

## Prototype Record: Catacomb Wall

The first Blender MCP experiment created `ENV_CatacombWall_2m` as a non-destructive collection in the default scene:

- 2.0 m wide, 2.1 m tall, and approximately 0.344 m deep.
- Sixteen individually modeled uneven limestone blocks.
- 192 triangles against a 300-triangle wall budget.
- Flat shading and three restrained limestone values.
- Exact X bounds at -1 m and +1 m for repeatable tiling.

This prototype demonstrates the preferred approach: exact external module seams, controlled internal variation, structured naming, custom validation metadata, and measured results returned through Blender MCP.

## Reference Asset: Animated Catacomb Brazier

`ENV_CatacombBrazier` is the reference implementation for deterministic animated environment sprites:

- 219 evaluated triangles against a 600-triangle budget.
- Flat-shaded dark-iron, ember, flame, and smoke palette roles.
- Seventeen transparent 48x48 frames covering unlit, ignition, lit-loop, extinguishing, and smoke states.
- Standard orthographic capture at 45-degree azimuth and 55-degree elevation.
- A tagged Aseprite master plus an 816x48 runtime sheet and JSON playback metadata.

The versioned manifest and generation scripts under `Tools/Art/` are the procedural source of truth. Reviewed outputs are `art/blender/catacomb_brazier/catacomb_brazier.generated.blend`, `art/aseprite/catacomb_brazier/catacomb_brazier.generated.aseprite`, and the 17-frame sheet and metadata under `assets/images/environment/catacomb/brazier/`. Earlier manual six-frame prototype assets are intentionally not retained.

For rigged characters and directional sprite sheets, use `docs/BLENDER_SPRITE_PIPELINE.md`. It extends the same flat-shaded, restricted-palette direction into a Blender-to-Aseprite 3D-to-2D workflow.
