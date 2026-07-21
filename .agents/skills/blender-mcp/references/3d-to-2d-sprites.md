# General 3D-to-2D Sprite Workflow

## Source setup

- Model one readable low-poly character or prop.
- Use flat-colored materials and a restrained palette.
- Add only the bones and controls required for clear poses.
- Keep a stable root, ground plane, pivot, camera target, and orthographic framing.

## Animation and directions

- Define named actions, explicit frame counts, loop behavior, and sampling rate before rendering.
- Render every action from the same ordered direction list.
- Define weapon, palette, and color/shadow/silhouette output-pass dimensions before rendering variants.
- Rotate a compensated capture rig or rotate the subject with lighting compensation so exposure and framing remain stable.
- Render approved integer pose frames without motion blur.

Use MCP automation for mechanical tasks: create and name armatures, parent meshes, generate simple cycle starting poses, mirror compatible poses, copy actions between matching rigs, set exact frame ranges, manage actions, position an orthographic capture rig at declared directions, and batch-render the output matrix.

## Output

- Render transparent PNG frames at the final low resolution when possible.
- Use one cell size and pivot for the whole asset family.
- Pack one sheet per action when actions use different frame counts.
- Record direction order, frame count, duration, pivot, and cell size in a manifest.
- Record rig version, weapon, palette, output pass, and cross-pass alignment metadata when applicable.
- Use nearest-neighbor sampling for offline resizing.

## Pixel cleanup

- Use one indexed palette across related actions and directions.
- Remove redundant colors, partial-alpha fringe pixels, isolated pixels, and inconsistent outlines.
- Check silhouette, root, feet, proportions, attachments, and lighting across directions.
- Fix systematic problems in the 3D source or rig, then rerender instead of repainting every frame independently.

## Validation

- Assert complete direction/action/frame coverage.
- Assert complete direction/action/weapon/palette/pass coverage and pixel-aligned passes.
- Compare bounds and pivots across frames.
- Check loops for first/last-frame continuity without duplicating the loop endpoint.
- Review at native resolution and intended gameplay display size.
- Preserve the model, rig, actions, raw renders, cleaned source, final sheets, and manifest.
