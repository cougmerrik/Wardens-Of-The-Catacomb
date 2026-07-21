# Wardens Environment Asset Specification

Use `docs/ENVIRONMENT_ART_PIPELINE.md` as the source of truth. This reference is the compact execution checklist.

## Hard constraints

- Meters, Z up.
- Flat shading only.
- No smooth normals, auto smooth, weighted normals, subdivision, or normal-map-dependent form.
- Exact modular boundaries and applied transforms before export.
- One to three materials preferred; four maximum for ordinary assets.
- Orthographic camera at 45-degree azimuth and 55-degree elevation.
- Three value bands: shadow, midtone, highlight.
- Fixed palette roles; saturated color only for gameplay accents.
- Native-size or integer-multiple renders only.
- Nearest-neighbor scaling. No interpolated or non-integer resize.
- Antialiasing off when feasible; otherwise one documented family-wide setting.

## Triangle caps

| Category | Cap |
| --- | ---: |
| Tiny prop | 96 |
| Small prop | 180 |
| Medium prop or 2 m wall/floor module | 300 |
| Pillar, arch, gate, or doorway | 500 |
| Animated environment prop | 600 |
| Modular room component | 1,200 |

## Capture presets

| Category | Resolution |
| --- | ---: |
| Single structural tile | 64x64 px |
| Prop or module | 128x128 px |
| Room-kit review | 256x256 px |

Use transparent output for assets and a neutral-background review render when checking silhouette.

## Animation presets

| Motion | Frames |
| --- | ---: |
| Ambient loop | 6 |
| Simple interaction | 6 |
| Destruction, collapse, or trap one-shot | 8 |

## Required root metadata

- `asset_category`
- `spec_version = environment-art/v0.1`
- `triangle_budget`
- `triangle_count`
- `flat_shaded`
- `module_width_m` and `module_depth_m` when modular
- `tile_axis` when modular
- `render_resolution`
- `animation_frames` when animated
