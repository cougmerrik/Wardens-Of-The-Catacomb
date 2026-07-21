# Safe Blender MCP Authoring

## Mutation boundary

- Inspect before modifying.
- Preserve unrelated objects and collections.
- Check datablock user counts before editing shared meshes, materials, images, or actions.
- Confirm object mode and selection before context-sensitive operators.
- Prefer adding a named prototype collection to repurposing existing content.
- Do not delete, purge, overwrite, apply irreversible modifiers, or replace files without clear authorization.

## Arbitrary Python

The Blender MCP code-execution tool runs Python inside Blender and can access files and networks available to Blender. Keep code scoped to the requested scene operation.

- Avoid dynamic downloads and remote assets unless explicitly requested.
- Avoid broad filesystem traversal.
- Use explicit object and file names.
- Return structured results rather than dumping scene data.
- Make procedural output deterministic.

## Reproducibility metadata

For generated assets, record useful inputs as root custom properties when appropriate:

- Asset type and specification version.
- Dimensions and module interval.
- Random seed.
- Triangle budget and validated count.
- Render preset and output resolution.
- Animation frame count.

## Handoff

Report:

- What changed and what was intentionally preserved.
- The asset collection and root object.
- Validation measurements.
- Save/export paths, or that the scene is still unsaved.
- Risks, exceptions, or settings that require user review.
