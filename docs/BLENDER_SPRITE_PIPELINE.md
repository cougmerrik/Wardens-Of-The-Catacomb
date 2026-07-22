# Blender 3D-to-2D Sprite Pipeline

## Purpose

This document defines an exploratory Blender-to-Aseprite workflow for producing consistent 16-bit-style directional sprites from reusable 3D models. The core idea is to model and rig a character once, author each action once, render it from fixed directions, and perform final palette and pixel cleanup in Aseprite.

This approach should improve proportion, equipment placement, grounding, and animation consistency compared with drawing every direction and frame independently. It does not remove pixel-art judgment: silhouettes, palette ramps, isolated pixels, overlaps, and gameplay readability still require a deliberate 2D cleanup pass.

The division of labor is deliberate:

- Blender owns structure and movement: models, armatures, bone names, parenting, reusable actions, exact frame ranges, pose mirroring, camera directions, and batch renders.
- Aseprite owns pixel cleanup and artistic character: indexed palettes, pixel clusters, silhouettes, selective exaggeration, outlines, highlights, and final sheet polish.

## Pipeline Status

- The workflow is a `sprite-art/v0.1` baseline. The ghost-family prototype is its first runtime-integrated asset; the knight example remains exploratory.
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

## Wardens Ghost Family Prototype

Use one related art family with three stable silhouette variants rather than relying on per-frame randomization:

- Hollow Ghost (`hollow_ghost`): a hunched corpse spirit with a torn burial shroud, long arms, a hollow rib cavity, and a lower body that separates into trailing wisps. This is the common close-range drifter and preserves the existing orbit, siphon, and dive behavior.
- Veiled Specter (`veiled_specter`): a taller, narrower apparition with a hood or veil, a recessed faceless cavity, and floating body bands. Its poses should read as quiet stalking followed by a sharp spectral-claw or dive attack.
- Shackled Poltergeist (`shackled_poltergeist`): a compact, agitated spirit with broken restraints and separately rendered or runtime-composited debris. Keep orbiting chains, stones, bones, and pottery out of the body sheet when they need independent motion.

All three variants use the same 64x64 capture size, 128x128 final cells, fixed contact pivot, eight-direction order, 10 fps presentation rate, and semantic palette roles. Select and serialize stable `ghostVariant` and `ghostPalette` values when runtime integration begins so local and multiplayer clients render the same appearance.

### Ghost palette and alpha roles

Use no more than eight semantic roles before Aseprite reduction:

- cavity shadow
- body shadow
- body midtone
- corpse-cyan highlight
- shroud accent
- soul-core midtone
- soul-core highlight
- controlled-undead accent

Prepare `cold_haunt` and `malignant_haunt` mappings from one indexed semantic master per silhouette. Do not generate palette variety by repainting individual frames.

Keep Blender color renders free of bloom, glare, and soft transparency gradients. Author crisp color and silhouette masters, a restrained indexed-alpha body treatment, and a separate tight glow pass around the eyes, soul core, and selected torn edges. The glow is sprite presentation only: default ghosts must not become world-light sources. Keep the shadow pass separate and use it as a faint contact mist rather than a solid living-character shadow.

### Ghost action contract

| Action | Frames | Loop | Intent |
| --- | ---: | --- | --- |
| Hover idle | 6 | Yes | asymmetric vertical drift with delayed shroud or band motion |
| Float/move | 8 | Yes | directional locomotion with readable trailing secondary motion |
| Primary attack | 8 | No | dive, spectral claw, or debris throw with anticipation and recovery |
| Siphon/channel | 8 | Conditional | readable opening followed by a reusable unstable channel loop |
| Hurt | 4 | No | fast silhouette distortion without moving the capture pivot |
| Death | 10 | No | soul-core collapse whose final frame remains as the dead state for 30 seconds |

For the poltergeist, keep an optional four-frame looping debris layer and six-frame projectile effect separate from the body action sheets. Record their attachment pivot and timing in the manifest.

### Prototype gate

Before producing the full eight-direction matrix, create front-facing `hover`, `move`, and `primary_attack` actions for all three silhouettes. Render color, shadow, silhouette, and glow passes at 64x64, then review both native frames and 44 px gameplay previews. Expand only silhouettes that retain distinct head, torso, trailing-body, and attack reads against representative catacomb floor and darkness values.

### Front-facing prototype review

The first headless prototype established three flat-shaded six-bone rigs and complete `6/8/8` hover, move, and primary-attack coverage at 10 fps. Evaluated triangle counts were 256 for Hollow Ghost, 268 for Veiled Specter, and 316 for Shackled Poltergeist, all below the 1,200-triangle family budget. The color, shadow, silhouette, and glow matrix contained all 264 expected 64x64 frames, and the corrected silhouette outputs used binary alpha.

Native 64x64 and nearest-neighbor 44 px reviews retained the Hollow Ghost's torn multi-wisp read and the Poltergeist's broad debris-ringed read. The initial Veiled Specter primary-attack contact pose compressed into an overly abstract diamond at gameplay size. A source-first revision added asymmetric torso and veil rotation, a hooked striking arm, and a trailing arm; its anticipation, contact, and recovery poses then remained distinct at 44 px. All three front-facing silhouettes pass the initial action-read gate. Treat the current files as prototype evidence rather than runtime-ready sprite art; indexed-alpha cleanup and catacomb-background compositing remain open before eight-direction expansion.

Catacomb compositing used the runtime floor palette and representative 15%, 65%, and 90% enemy-darkness overlays. Lifting the shared body-shadow, body-midtone, and shroud roles preserved variant identity through mid-falloff while a reduced tight glow left the surrounding floor unchanged. Near maximum darkness, only the soul-core presence remains intentionally readable. This is sprite presentation and does not add a world-light source.

The approved full prototype uses runtime order `east`, `southeast`, `south`, `southwest`, `west`, `northwest`, `north`, `northeast` and all six actions at `6/8/8/8/4/10` frames. The first death pass folded into a hanging shape and the second broadened into a triangular tail; both were rejected. The accepted source action contracts every body axis into a small soul remnant at the fixed contact pivot. Runtime playtesting established that this final animation frame should itself remain as the non-blocking dead state for 30 seconds, with no procedural floor-mist handoff. A later validation found that death-scale channels could leak into actions that did not explicitly key scale, shrinking later-created rigs; the accepted `review10` source keys complete neutral location, rotation, and scale transforms before every action pose. Final headless coverage contained 4,224/4,224 color, shadow, silhouette, and glow frames. Occupied color, silhouette, and shadow frames had no edge clipping; empty glow frames are intentional rear/late-death occlusions. All checked hover, move, and siphon loop endpoints were non-duplicated.

Raw review10 frames pack into 72 sheets: one sheet for each `variant × action × pass`, with eight direction rows and action-specific columns. Every 64x64 frame is scaled exactly 2x with nearest-neighbor sampling into a 128x128 cell. The accompanying raw manifest records direction order, frame counts, loop flags, hit frame, passes, pivot, presentation rate, and the zero world-light radius exception.

Headless Aseprite conversion uses a nine-entry GPL palette: transparent index 0 plus the eight semantic ghost roles. Use no dithering. The automated review10 conversion preserved all raw alpha masks, dimensions, and at most nine palette entries across 72/72 sheets. Representative hover and death rows retained the cavity, body ramp, highlight clusters, silhouette identity, and soul-remnant contraction. The accepted review10 sheets were promoted as the first runtime visual pass after user review; an optional later Aseprite art-polish pass may improve isolated pixels, stair steps, overlaps, and intentional translucency without changing the runtime contract.

Runtime integration lives in `src/rendering/ghostSpriteSheet.js` with permanent sheets under `assets/images/enemies/ghost_family/`. Spawned ghosts receive stable `ghostVariant`, `ghostPalette`, and randomized animation-phase fields. The authoritative simulation also records facing, action, action start time, animation phase, hurt timing, siphon state, and dive timing so network clients select the same row and animation without making every ghost loop in lockstep. The renderer composites separate shadow, semi-translucent color, and tight glow passes at 44 px with nearest-neighbor sampling and retains the procedural live ghost as an image-load fallback. The malignant palette is a deterministic sprite-only filter; neither palette contributes a world light.

### Ghost-family lessons carried forward

- Key neutral location, rotation, and scale on every controlled bone before action-specific poses. In the prototype, incomplete scale baselines allowed the death contraction to leak into later-created actions.
- Blender 5.x action validation must traverse layered actions, strips, and channel bags; legacy direct F-curve assumptions can falsely report missing animation.
- Native PNG inspection is insufficient for integration approval. Exercise representative frames through the real browser loader to catch stale sessions, asset-path failures, asynchronous fallback behavior, pass compositing, and runtime palette treatment.
- Review the occupied opaque core separately from the full 128 px cell and 44 px presentation. Wisps and glow communicate silhouette but should not determine collision; playtesting reduced the ghost's solid core from 20 px to 16 px.
- Headless Aseprite indexing is a valid reproducible baseline when dimensions, palette membership, alpha masks, and nearest-neighbor scaling pass. Manual cleanup remains valuable polish, but it need not block an explicitly accepted initial runtime pass.

## Recommended First Experiment

Build the low-poly knight as a disposable named prototype collection without replacing any current player art. Complete one front-facing idle and walk pass first, render it at 32x32, 48x48, and 64x64 for comparison, and select the smallest size that preserves helmet, shield, weapon, feet, and action readability. Then expand the chosen preset to eight directions and the remaining actions.
