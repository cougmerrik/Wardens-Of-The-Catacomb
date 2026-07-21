---
name: wardens-blender-environment-art
description: Design, generate, inspect, render, and validate low-poly Blender environment assets for Wardens of the Catacomb through Blender MCP. Use for catacomb floors, walls, pillars, arches, coffins, urns, braziers, gates, chains, modular rooms, environment animations, asset renders, or any Blender-authored Wardens environment piece that must follow the project's geometry, camera, lighting, palette, pixel-output, naming, and animation constraints.
---

# Wardens Blender Environment Art

Apply Wardens' versioned art specification to every Blender-authored environment asset. Use the shared `blender-mcp` skill for general connection safety and this skill for project constraints.

## Required context

Read both before changing a scene:

- `docs/ENVIRONMENT_ART_PIPELINE.md` for the durable project workflow and rationale.
- `references/asset-specification.md` for the compact execution checklist and category presets.

If they conflict, follow `docs/ENVIRONMENT_ART_PIPELINE.md` and update the compact reference in the same change.

## Workflow

1. Inspect the current scene, object mode, collections, units, active object, and naming patterns.
2. Classify the requested asset before modeling. Select its module dimensions, triangle cap, render preset, material roles, and animation length.
3. State assumptions when the prompt omits a dimension or category. Do not silently exceed a preset.
4. Create or reuse one named asset collection with an `ENV_` root Empty. Preserve unrelated scene content.
5. Build in meters with Z up. Keep modular outer bounds exact and put controlled irregularity inside those bounds.
6. Use flat-shaded low-poly geometry. Avoid every prohibited smoothing, normal, subdivision, or texture-dependent technique.
7. Apply the fixed camera, three-value lighting, restricted material roles, native render size, and nearest-neighbor output rules.
8. Validate evaluated triangles, dimensions, bounds, transforms, shading, materials, seams, camera, render settings, and animation frames.
9. Return measured results. Flag every exception explicitly.
10. Ask before overwriting a `.blend`, render, sprite sheet, or export.

## Generation rules

- Prefer chunky silhouettes and broad value groups that survive at 32-128 px.
- Use deterministic dimensions and seeds for reproducible procedural work.
- Name component meshes `SM_<Asset>_<Part>` and materials `MAT_<Role>_<Variant>`.
- Add root custom properties for category, module dimensions, tile axis, triangle budget, triangle result, and specification version.
- Treat triangle caps as ceilings, not targets.
- Test modular assets by duplicating at the declared interval and inspecting both seams.

## Validation report

Report at least:

- Asset name and category.
- Dimensions and world-space bounds.
- Evaluated triangle count and category cap.
- Flat-shading and prohibited-feature checks.
- Material slot count and palette roles.
- Seam result for modular assets.
- Camera, lighting, resolution, antialiasing, and scaling settings.
- Animation frame count when applicable.
- Save/export status and any exceptions.
