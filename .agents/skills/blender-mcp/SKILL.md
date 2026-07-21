---
name: blender-mcp
description: Safely inspect, create, modify, rig, animate, render, validate, save, and export Blender scenes and assets through Blender MCP. Use when a user asks Codex to work in a running Blender session, generate low-poly or production assets, create 3D-to-2D directional sprites or sprite sheets, inspect scene structure, execute bpy workflows, render previews, validate geometry or materials, automate repeatable Blender operations, or diagnose a Blender MCP connection.
---

# Blender MCP

Use Blender MCP as an inspect-first authoring interface. Preserve scene structure, prefer narrow tools, make reproducible changes, and return measured validation instead of visual claims alone.

## Connection and scope

1. Confirm Blender MCP tools are available.
2. Run a read-only scene summary before editing.
3. Identify the open file, active scene, workspace, mode, active object, collections, units, and relevant naming patterns.
4. Clarify or safely infer the requested asset boundary. Do not treat the whole open scene as disposable.
5. Read `references/safe-authoring.md` when the task changes a scene, saves files, exports assets, or runs arbitrary Blender Python.
6. Read `references/3d-to-2d-sprites.md` when the task renders a model or animation into directional sprites or sprite sheets.

## Tool selection

- Prefer dedicated inspection, documentation, viewport, render, and object tools.
- Use arbitrary `execute_blender_code` only when narrower tools cannot perform the task.
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
- Report whether work exists only in the open session, was saved to `.blend`, or was exported.
- Never claim persistence when the scene remains unsaved.
