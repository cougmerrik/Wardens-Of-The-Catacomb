# Consumables Shop Design

This document captures the v1 redesign of the shop around consumable items.

The current shop previously overlapped heavily with the talent system by offering permanent upgrades. Permanent progression now lives in the talent tree, so the shop is being repositioned as a source of temporary utility, tactical options, and emergency resources during a run.

This document is the canonical design reference for the consumables shop MVP and the item schema used to author shop content consistently.

## Design Goals

- Replace permanent shop upgrades entirely with consumables
- Differentiate the shop from the talent tree
- Give the player meaningful tactical and strategic purchasing decisions during a run
- Support both manually activated and automatically triggered consumables
- Keep the system readable in the shop, on the HUD, and in combat

## Core Definition

A consumable is a shop item that:

- has limited quantity
- can only be held up to a per-item cap
- is consumed when used actively or when its trigger event occurs passively
- appears in the HUD while owned

Consumables persist only for the current run. They do not persist between runs, and runs cannot be resumed later.

## Consumable Types

Consumables are divided by how they are triggered.

### Active

- Triggered manually by the player
- Bound to numeric keys `1-5`
- Consume `1` charge on successful use
- If use fails because conditions are invalid, no charge is consumed
- All active consumables share a global internal cooldown of `2s`

### Passive

- Trigger automatically when their item-specific condition occurs
- Consume `1` charge when they successfully trigger
- Do not use the shared `2s` active cooldown
- May define their own item-specific internal cooldowns
- Passive cooldown is tracked per item stack
- Trigger at most once per event instance

There are no active/passive hybrid items in v1.

## Inventory Rules

Consumables are held as stacks of charges.

### Active Inventory

- The player may hold up to `5` active consumable types at once
- These map directly to hotbar slots and keys `1-5`
- New active consumables are assigned to the first open slot
- Active consumables are ordered by acquisition
- Buying another copy of an active consumable already owned adds `1` charge to that slot
- If all `5` active slots are occupied, the player cannot acquire a new active consumable type

### Passive Inventory

- The player may hold up to `3` passive consumable slots at once
- Stacked copies of the same passive consumable share one slot
- Passive consumables resolve in acquisition order, oldest first
- If all `3` passive slots are occupied, the player cannot acquire a new passive consumable type

### Per-Item Carry Limits

- Every consumable has its own max owned quantity
- A common default is `3`, but this is item-specific
- Some consumables may have lower or higher limits
- Passive consumables are often expected to have lower limits or item-specific cooldown constraints

## Acquisition Rules

Consumables are purchased through the shop interface.

- Each purchase grants `1` charge
- The same consumable may be purchased multiple times in a shop visit if stock and inventory limits allow
- The shop itself also has limited stock per item
- Shop stock refills only when the current floor is completed

### Purchase Failure States

Purchases should be blocked and message the player clearly when:

- `At max stack`
- `No active slot available`
- `No passive slot available`
- `Out of stock`

If the player attempts to buy a consumable at capacity, the purchase is blocked rather than wasted.

## Shop Structure

The shop contains only consumables.

- Each floor shop presents `5` item entries
- Shop stock is randomized each floor
- Duplicate entries may not appear in the same shop
- Some items may only enter the shop pool after a certain floor is reached

## Rarity And Shop Generation

Items have rarity, and rarity affects how shop inventory is generated.

The intended process for each of the `5` shop entries is:

1. Roll on the common table with equal weight
2. `20%` of the common table is represented by "roll a rare item instead"
3. If the entry upgrades to rare, roll on the rare table with equal weight
4. `20%` of the rare table is represented by "roll a legendary item instead"
5. If the entry upgrades to legendary, roll on the legendary table with equal weight

Fallback rule:

- If a target rarity has no remaining eligible unique items, roll the next lower rarity tier instead
- The downgrade path is `Legendary -> Rare -> Common`
- If the common pool also has no remaining eligible unique items, continue rerolling until a valid shop entry is produced from the remaining eligible pool

## Pricing

- Consumable pricing scales by floor
- Exact pricing is tuned per item
- Pricing does not scale based on current owned quantity

## HUD

### Active HUD

Active consumables appear in a hotbar at the bottom of the screen near the XP bar.

Each active slot should show:

- item icon
- keybind
- current charge count
- cooldown feedback

Because the active cooldown is shared globally, all active consumables should visually indicate cooldown when any active consumable has been used.

### Passive HUD

Passive consumables appear to the right of the active hotbar area.

- Passive icons are only shown while owned
- Passive items remain visible while on their own item-specific cooldown
- Passive items should show cooldown feedback if applicable
- If the last charge is consumed, the passive icon disappears immediately

## Consumable Icon Assets

Consumable icons are stored under `assets/images/items/` as transparent `128x128` PNG files named after the consumable key, such as `regenerationPotion.png`.

The icons are rendered small in-game:

- shop rows use roughly `36x36` on desktop and `42x42` on Android
- hotbar and passive HUD slots use `34x34`

Generate icons larger than the display size, then downscale to transparent `128x128` PNGs before adding them to the repository. The renderer should keep a text/placeholder fallback for missing or loading icons.

### Icon Generation Prompt

Use this prompt template when adding a new consumable. Replace the item name and subject details, but keep the shared style, composition, background, and avoid rules.

```text
Use case: stylized-concept
Asset type: retro fantasy roguelike consumable item icon
Primary request: Create a small pixel-art inventory icon for <Consumable Name>.
Subject: <One compact sentence describing the item as a readable fantasy object or magical effect.>
Style: retro 16-bit pixel art fantasy item icon matching the Regeneration Potion style anchor, crisp hand-pixeled edges, limited palette, chunky silhouette, high contrast, readable at 34x34 pixels, deliberately low-detail, no antialiasing look, no realistic rendering, no painterly brushwork, no smooth gradients.
Composition: Single centered object with generous padding, front-facing three-quarter view unless the item reads better head-on, object occupies about 70 percent of the canvas.
Background: perfectly flat solid #00ff00 chroma-key background for background removal. The background must be one uniform color with no shadows, gradients, texture, floor plane, or lighting variation. Do not use #00ff00 anywhere in the subject. Use #ff00ff instead when the subject contains important green pixels.
Avoid: no text, no letters, no numbers, no watermark, no UI border frame, no cast shadow, no contact shadow, no realistic reflections.
```

For magical protection or effect-only consumables, describe the subject as an effect rather than a literal object. For example, the `shield` consumable uses an arcane guard/ward icon because it blocks a hit; it should not be represented as a physical metal shield.

## Tooltip Structure

Tooltip text should follow a consistent structure.

Recommended order:

1. `Active` or `Passive`
2. Short effect summary
3. Trigger or use details
4. Duration and cooldown information
5. Owned count and max allowed
6. Price
7. Rarity

## Behavioral Rules

### Active Use

- One keypress attempts one use
- One successful use consumes `1` charge
- Failed use consumes no charge
- Any successful active use triggers the shared `2s` active cooldown
- If an active consumable applies a timed effect that is already active, using it again refreshes the duration instead of stacking the effect

### Passive Triggering

- Trigger conditions are defined per item
- A passive item may trigger once per qualifying event instance
- A successful trigger consumes `1` charge
- Some passive items may define their own internal cooldown before another charge of that same item stack can trigger again
- If multiple passive items match the same event, they resolve in acquisition order, oldest first
- Matching passive items continue resolving in order even if an earlier passive changes the original triggering condition

## Item Schema

To keep item design consistent, every consumable must conform to a shared schema.

All items must define the following fields:

- `Name`
- `Type`
- `Rarity`
- `Trigger Condition`
- `Cooldown`
- `Unlock Floor`
- `Price`
- `Max Stack`
- `Max Inventory`
- `Effect`

### Field Rules

- `Name`
  - The display name of the consumable
- `Type`
  - Must be either `Active` or `Passive`
  - There are no hybrid items in v1
- `Rarity`
  - Must be one of `Common`, `Rare`, or `Legendary`
- `Trigger Condition`
  - Required for passive items
  - For active items, this should be recorded as `N/A`
- `Cooldown`
  - Records the cooldown behavior for the item
  - Use `Default` when the item uses the system default behavior
  - Use a specific value when the item defines an item-specific cooldown
- `Unlock Floor`
  - The earliest floor where the item may appear in the shop pool
- `Price`
  - The shop purchase cost for one charge
- `Max Stack`
  - The maximum number of charges the player may hold for that consumable
- `Max Inventory`
  - The maximum amount of that consumable the shop may stock when it appears
- `Effect`
  - A concise rules description of what the consumable does when used or triggered

This schema is mandatory for all consumables. Item ideas should not be considered complete until all schema fields are defined.

## Item Creation Workflow

All new consumables should be created using the same workflow so they remain consistent with the rest of the shop system.

1. Define the item using the mandatory schema
2. Verify that `Type` is strictly `Active` or `Passive`
3. Verify that `Rarity` is strictly `Common`, `Rare`, or `Legendary`
4. For passive items, define a clear `Trigger Condition`
5. For active items, record `Trigger Condition` as `N/A`
6. Define `Cooldown` and `Unlock Floor`
7. Define `Price`, `Max Stack`, and `Max Inventory`
8. Write the `Effect` as concise gameplay-facing rules text
9. Generate a matching icon using the prompt in [Icon Generation Prompt](#icon-generation-prompt)
10. Add the transparent `128x128` PNG to `assets/images/items/` and wire its key into the HUD icon source map
11. Confirm the item respects v1 constraints such as no hybrid behavior, slot limits, and run-only persistence

The schema should be treated as the canonical starting point for new item design.

## Example Consumables

### Angel Ring

- `Name`: Angel Ring
- `Type`: Passive
- `Rarity`: Rare
- `Trigger Condition`: When the player would hit `0 HP`
- `Cooldown`: Default
- `Unlock Floor`: 1
- `Price`: 2000
- `Max Stack`: `1`
- `Max Inventory`: `1`
- `Effect`: Heal the player for `20%` HP immediately

### Regeneration Potion

- `Name`: Regeneration Potion
- `Type`: Active
- `Rarity`: Common
- `Trigger Condition`: `N/A`
- `Cooldown`: Default
- `Unlock Floor`: 1
- `Price`: 100
- `Max Stack`: 3
- `Max Inventory`: 2
- `Effect`: The player regenerates `20%` of health over `10s`

### Speed Potion

- `Name`: Speed Potion
- `Type`: Active
- `Rarity`: Common
- `Trigger Condition`: `N/A`
- `Cooldown`: Default
- `Unlock Floor`: 1
- `Price`: 100
- `Max Stack`: 3
- `Max Inventory`: 2
- `Effect`: The player gains `+20%` movement speed for `10s`

### Frost Oil

- `Name`: Frost Oil
- `Type`: Active
- `Rarity`: Common
- `Trigger Condition`: `N/A`
- `Cooldown`: Default
- `Unlock Floor`: 1
- `Price`: 50
- `Max Stack`: 3
- `Max Inventory`: 2
- `Effect`: For the next `5s`, attacks deal `+2` cold damage and enemies struck are slowed by `15%` for `3s`

### Fire Oil

- `Name`: Fire Oil
- `Type`: Active
- `Rarity`: Common
- `Trigger Condition`: `N/A`
- `Cooldown`: Default
- `Unlock Floor`: 1
- `Price`: 50
- `Max Stack`: 3
- `Max Inventory`: 2
- `Effect`: For the next `5s`, attacks deal `+2` fire damage and enemies struck burn for `2s`

### Spike Growth

- `Name`: Spike Growth
- `Type`: Active
- `Rarity`: Common
- `Trigger Condition`: `N/A`
- `Cooldown`: Default
- `Unlock Floor`: 1
- `Price`: 50
- `Max Stack`: 3
- `Max Inventory`: 2
- `Effect`: For `5s` after activation, enemies that attack the player take `+3` retaliatory damage

### Shield

- `Name`: Shield
- `Type`: Active
- `Rarity`: Common
- `Trigger Condition`: `N/A`
- `Cooldown`: Default
- `Unlock Floor`: 1
- `Price`: 3
- `Max Stack`: 2
- `Max Inventory`: 2
- `Effect`: Gain `10` temporary HP

### Monkey Paw

- `Name`: Monkey Paw
- `Type`: Passive
- `Rarity`: Legendary
- `Trigger Condition`: On moving to the next floor
- `Cooldown`: Default
- `Unlock Floor`: 1
- `Price`: 1000
- `Max Stack`: `1`
- `Max Inventory`: `1`
- `Effect`: Remove all consumables, fully heal the player, and immediately grant a level

## Non-Goals For V1

- No permanent shop upgrades
- No manual hotbar reordering
- No dropping, selling, replacing, or discarding consumables
- No active/passive hybrid items
- No between-run persistence
- No save/load run resumption
