---
name: blender-mcp
description: Safely inspect, create, modify, rig, animate, render, validate, save, and export Blender scenes and assets through interactive Blender MCP or headless Blender. Use when Codex needs to work in a running Blender session, create a new scene without a GUI, process an existing .blend in background mode, generate low-poly or production assets, create 3D-to-2D directional sprites or sprite sheets, inspect scene structure, execute bpy workflows, render previews, validate geometry or materials, automate repeatable Blender operations, or diagnose a Blender connection.
---

# Blender MCP

Use interactive or headless Blender as an inspect-first authoring interface. Preserve scene structure, prefer narrow tools, make reproducible changes, and return measured validation instead of visual claims alone.

## Execution mode

1. Prefer interactive Blender MCP when the user refers to an open scene, wants live viewport work, or needs hands-on review.
2. If the interactive server is unavailable, do not stop automatically. Use headless mode when the task is deterministic modeling, rigging, animation, rendering, validation, saving, or export.
3. For an existing `.blend`, use the Blender MCP `*_for_cli` tools with its explicit path.
4. For a new scene, locate the Blender binary and use `blender --background --factory-startup` with a scoped Python script or expression. Save only to a new explicit `.blend` path unless overwrite approval was given.
5. Require interactive Blender only when the requested operation depends on live UI context, manual sculpting or posing, add-ons unavailable in background mode, or user-directed viewport interaction.
6. Treat failure of both interactive and headless execution as the connection blocker. Report which modes were attempted.

## Connection and scope

1. Confirm the selected Blender execution mode and tools are available.
2. Run a read-only scene summary before editing an existing scene. For a factory-startup scene, record the empty baseline before adding content.
3. Identify the file path or explicit unsaved state, active scene, workspace when interactive, mode, active object, collections, units, and relevant naming patterns.
4. Clarify or safely infer the requested asset boundary. Do not treat the whole scene as disposable.
5. Read `references/safe-authoring.md` when the task changes a scene, saves files, exports assets, or runs arbitrary Blender Python.
6. Read `references/3d-to-2d-sprites.md` when the task renders a model or animation into directional sprites or sprite sheets.

## Tool selection

- Prefer dedicated inspection, documentation, viewport, render, and object tools.
- Use arbitrary `execute_blender_code` only when narrower tools cannot perform the task.
- In headless mode, use a reusable scoped script for substantial workflows instead of growing a fragile shell-escaped Python expression.
- Consult bundled Blender API or manual documentation before relying on uncertain `bpy` operators, properties, or context behavior.
- Return JSON-serializable structured results from executed code.
- Keep Blender operators' mode, selection, active object, and area context explicit.

## Authoring workflow

1. Inspect relevant objects, datablocks, collections, parents, modifiers, materials, visibility, and shared-data users.
2. State dimensions, coordinate system, origin, budget, output, and naming assumptions.
3. Create new work in a named collection with a root Empty when the scene has no stronger convention.
4. Use deterministic dimensions, seeds, names, and parameters so procedural work can be reproduced.
5. Prefer non-destructive structure while it remains useful, but count and validate evaluated geometry.
6. Update the dependency graph before reading computed bounds or modifier results.
7. Frame the result and perform a native-size visual review when presentation matters.
8. Measure the result and report validation.

In headless mode, render preview images to new explicit paths and inspect those images before making visual-quality claims. A successful background process is not evidence that framing, materials, silhouettes, or animation read correctly.

## Validation

Select checks that match the request:

- World-space dimensions, bounds, origin, transforms, and units.
- Evaluated vertices, edges, faces, and triangles.
- Manifold state, degenerate faces, inverted normals, and duplicate geometry.
- Flat or smooth shading requirements and prohibited modifiers.
- Material slots, image dependencies, missing files, and linked libraries.
- Collection membership, parenting, object names, hidden state, and orphaned datablocks.
- Modular seam duplication and snap interval.
- Camera, lights, render engine, resolution, color management, transparency, antialiasing, and output path.
- Animation frame range, loop seam, root stability, and keyframe coverage.

Return actual values, pass/fail status, and intentional exceptions.

## Save and export safety

- Treat saves, exports, deletions, joins, modifier application, remeshing, and shared-datablock edits as material mutations.
- Ask before overwriting existing files or destructively replacing existing scene content.
- Prefer a new explicit path for prototypes.
- Before a headless run, resolve and report every intended `.blend`, render, and export path. Do not use unresolved globs or broad directories as output targets.
- For a new headless scene, keep the first saved source separate from generated renders and exports so the workflow remains reversible.
- Report whether work exists only in the open session, was saved to `.blend`, or was exported.
- Never claim persistence when the scene remains unsaved.
