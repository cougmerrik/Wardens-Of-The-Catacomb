# Class Talent Tree Design

This document captures a proposed replacement for the current split between:

- the gold shop stat upgrades
- the class skill tree unlocks

The goal is a unified talent system that:

- keeps class identity clear
- uses gated progression by total points spent
- supports distinct builds inside each class
- allows limited crossover without collapsing all builds into one dominant path

This is a design document only. It does not describe implemented behavior.

## Current Design Decisions

The following decisions are assumed throughout this document:

- Capstones are strictly in-lane
- Generic stats only appear where they fit the class and lane fantasy
- Each class has at most `1` regular active skill bound to right click
- Each class may optionally have `1` active capstone skill
- Each class path must contribute meaningfully to at least one active skill, even if it does not unlock a separate button
- Row 3 nodes and capstones are encouraged to modify or reshape the class active so each lane has a distinct feel without adding button bloat
- Multiplayer-relevant effects are desirable, but they must still have solo value

## Core Structure

Each class uses the same broad framework:

- `Row 0` for the shared class active
- `Row 0` utility talents for the migrated shop stats
- `3 lanes`
- `4 rows`
- passive nodes usually have `2-3 ranks`
- unlock nodes and capstones usually have `1 rank`
- one shared class active, heavily modified by lane investment

### Row Gates

- Row 0: first point grants the class active
- Row 0 utility nodes are available immediately
- Row 1: requires `1` point spent in row 0
- Row 2: requires `3` points spent in the class tree
- Row 3: requires `8` points spent in the class tree
- Row 4: requires `14` points spent in the class tree

### Lane Rules

- Rows 1-2 are the main identity-commitment rows
- Adjacent crossover opens at Row 3
- Row 4 capstones require `5` points spent in that lane
- The center lane is usually the easiest crossover bridge, because it tends to carry class-defining survival or utility
- Capstones remain strictly in-lane
- A lane may reshape the class active in Row 3 or Row 4, but should not usually add a second normal active

### Node Rank Rules

- Basic passive nodes: `3 ranks`
- Strong passive nodes: `2 ranks`
- Unlock nodes: `1 rank`
- Capstones: `1 rank`

## System Goals

Moving the shop stats into the talent tree should not create a tree full of generic tax nodes. The stat nodes should reinforce class identity and lane identity.

Good talent trees here should:

- give each lane a recognizable stat profile
- unlock actives in thematic places
- let every lane solve the core gameplay problem of that class
- avoid overloading every lane with equal health, defense, and damage
- let the same active skill feel different depending on lane investment
- create multiplayer upside without making nodes dead in solo

## Active Skill Model

This system should avoid a large active-skill loadout. The cleanest model is:

- each class has `1` core active skill bound to right click
- that active is available to all builds of the class
- each lane modifies that active through passive riders in Rows 2-4
- a capstone may optionally add an active capstone behavior, but this should be rare

Lane identity should therefore come from:

- stat ownership
- conditional combat bonuses
- modifications to the same active skill
- optional multiplayer support riders

Rather than from:

- multiple unrelated active buttons
- lane-exclusive hotbar kits

## Universal Utility Package

The current shop's four generic stat upgrades should move into the tree as a shared utility package available to every class at Row 0.

These are:

- `Move Speed`
- `Attack Speed`
- `Damage`
- `Defense`

### Utility Node Rules

- each utility node has `4 ranks`
- all utility nodes are available immediately at Row 0
- they are class-agnostic in category, but their actual value can still be tuned per class if needed
- these nodes exist to preserve the broad progression feel of the current shop without keeping a separate gold-based stat system

### Utility Design Notes

- This adds `16` total ranks to every class tree
- The utility package should stay intentionally plain and readable
- The class lanes should still carry most of the class identity and build flavor
- If utility nodes become too efficient, they will flatten the lane system, so their power budget should stay conservative relative to lane-defining talents

## Skill Point Progression Rule

For the current target of:

- `42` total skill points
- max player level `30`
- first skill point awarded at `Level 2`

The recommended skill point progression is:

- `Levels 2-17`: award `1 SP` per level
- `Levels 18-30`: award `2 SP` per level

Math:

- Levels `2-17` = `16` levels = `16 SP`
- Levels `18-30` = `13` levels = `26 SP`
- total = `42 SP`

This gives a clean progression breakpoint and ensures the full class tree can be completed by the level cap without requiring post-cap progression.

## Ranger

### Class Identity

The ranger is a ranged kiter in a horde game.

That means the class should win by:

- spacing
- movement
- lane control
- efficient front-line deletion

The ranger should not be framed as a pure single-target sniper, because that would be too narrow for a game where most play is against a pursuing crowd.

### Lane Overview

- `Sharpshooter`
  - efficient line shots, pierce, front-rank deletion, projectile quality
- `Skirmisher`
  - movement, uptime, defense through motion, survivability
- `Warden`
  - fire, AoE, wave shaping, crowd pressure

### Ranger Core Active

The ranger should have one shared right-click active. The cleanest candidate remains a revised `Fire Arrow`:

- baseline use: a high-impact utility shot with AoE or rider potential
- `Sharpshooter` investment makes it more precise, piercing, and front-rank lethal
- `Skirmisher` investment makes it smoother to use while moving and safer to weave into kiting
- `Warden` investment makes it more explosive, burning, and wave-shaping

`Piercing Strike` and `Multiarrow` should therefore be treated less like separate permanent buttons and more like:

- passive augments
- conditional riders
- alternate firing patterns
- or enhancements applied to the ranger's one active

### Stat Ownership

#### Sharpshooter owns

- damage
- crit chance
- crit damage
- projectile speed
- pierce
- line-hit bonuses

#### Skirmisher owns

- move speed
- attack speed
- health
- defense
- damage while moving
- uptime and recovery

#### Warden owns

- burn duration
- burn damage
- AoE radius
- cooldown reduction
- multiarrow quality
- damage against affected targets

### Ranger Tree

| Row | Sharpshooter | Skirmisher | Warden |
|---|---|---|---|
| 0 |  | `Fire Arrow` |  |
| 1 | `Keen Sight` | `Fleetstep` | `Kindling` |
| 2 | `Pinning Shot` | `Quick Draw` | `Fire Arrow` |
| 3 | `Linebreaker` | `Dance of Thorns` | `Volleycraft` |
| 4 | `Cull the Pack` | `Foxstep` | `Wildfire Volley` |

### Ranger Node Details

#### Row 0

##### Fire Arrow
- Type: core active
- Ranks: `1`
- The ranger's first skill point grants the class right-click active. Equivalent to the first rank of fire arrow in the existing skill.
- Baseline purpose:
  - a high-impact utility shot with room for precision, movement, or AoE specialization later
- Later lane nodes modify this active rather than adding more normal buttons

##### Move Speed Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+move speed` per rank
- Move speed is a core ranger ability, so they should have the highest gain in move speed of all classes.

##### Attack Speed Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+attack speed` per rank
- Ranger gain - moderate

##### Damage Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+damage` per rank
- Ranger gain - moderate

##### Defense Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+defense` per rank
- Ranger gain - low

#### Row 1

##### Keen Sight
- Type: passive
- Ranks: `3`
- Purpose: establish the Sharpshooter profile immediately
- Rank 1: `+3% projectile speed, +3% ranged damage, +4% crit chance`
- Rank 2: `+3% projectile speed, +3% ranged damage, +4% crit chance`
- Rank 3: `+3% projectile speed, +3% ranged damage, +4% crit chance`

##### Fleetstep
- Type: passive
- Ranks: `3`
- Purpose: establish the ranger's movement identity and the Skirmisher lane's survival role
- Rank 1: `+4% move speed, +2% max health, +5% dodge`
- Rank 2: `+4% move speed, +2% max health, +5% dodge`
- Rank 3: `+4% move speed, +2% max health, +5% dodge`

##### Kindling
- Type: passive
- Ranks: `3`
- Purpose: establish the Warden lane's fire-control identity
- Rank 1: `+10% chance to set enemies on fire with arrows for damage over time, +8% fire damage, +6% fire arrow radius`
- Rank 2: `+10% chance to set enemies on fire with arrows for damage over time, +8% fire damage, +6% fire arrow radius`
- Rank 3: `+10% chance to set enemies on fire with arrows for damage over time, +8% fire damage, +6% fire arrow radius`

#### Row 2

##### Pinning Shot
- Type: modifier
- Ranks: `1`
- Purpose: convert the ranger active toward a precise lane-control shot for Sharpshooter builds
- Effects:
  - the ranger active fire arrow generates fire in a line instead of a circle, damaging and slowing all enemies that enter it by 25%
  - this is not a second permanent button; it is a lane modifier on the ranger active
- Multiplayer Effect:
  - Allies do +10% damage to enemies slowed by fire arrow

##### Multi-Shot Arrow
- Type: passive
- Ranks: `3`
- Purpose: core Skirmisher throughput node
- Rank 1: `Multishot +1 Arrow, +25% chance to spot traps, +25% chance to spot hidden monsters`
- Rank 2: `Multishot +1 Arrow, +25% chance to spot traps, +25% chance to spot hidden monsters`
- Rank 3: `Multishot +1 Arrow, +25% chance to spot traps, +25% chance to spot hidden monsters`
- Multiplayer rider option:
  - Nearby allies spot any traps or hidden monsters you spot

##### Fire Mastery
- Type: modifier
- Ranks: `1`
- Enhances the ranger's Row 0 active in the Warden direction
- Fire Arrow radius is doubled, the ground effect lasts twice as long, and becomes a ground target shot
- Includes a small passive rider:
  - `+10% Fire Arrow impact damage`

#### Row 3

##### Linebreaker
- Type: passive
- Ranks: `3`
- Purpose: make the Sharpshooter lane horde-relevant rather than boss-only
- Rank 1: `When you are not moving, basic attacks pierce +25% of the time, arrows gain +10% damage for each enemy they strike`
- Rank 2: `When you are not moving, basic attacks pierce +25% of the time, arrows gain +10% damage for each enemy they strike`
- Rank 3: `When you are not moving, basic attacks pierce +25% of the time, arrows gain +10% damage for each enemy they strike`

##### Dance of Thorns
- Type: passive
- Ranks: `3`
- Purpose: reward sustained movement and active kiting
- While moving continuously for more than 6 seconds, gain the "Dance of Thorns" buff.
- Rank 1: `While moving continuously for more than 6 seconds, gain +6% attack speed`
- Rank 2: `While moving continuously for more than 6 seconds, gain +5% defense and deal 10 damage when hit`
- Rank 3: `While moving continuously for more than 6 seconds, gain +8% damage`
- Multiplayer rider option:
  - Allies within 3 tiles gain +5% defense while you have "Dance of Thorns" active

##### Volleycraft
- Type: passive
- Ranks: `3`
- Purpose: make the Warden lane's version of the ranger active feel like controlled crowd pressure
- Rank 1: `Fire Arrow cooldown reduced by 2 seconds`
- Rank 2: `Fire Arrow cooldown reduced by 2 seconds`
- Rank 3: `Fire Arrow cooldown reduced by 2 seconds`

#### Row 4

##### Trick Shot
- Type: capstone
- Ranks: `1`
- Purpose: turn Sharpshooter into a wave-cutting lane
- Effects:
  - Ranger basic attacks can ricochet off walls twice if they have not already hit an enemy

##### Foxstep
- Type: capstone
- Ranks: `1`
- Purpose: make Skirmisher the strongest uptime and movement lane
- Effects:
  - When the ranger is reduced below 50% hp, damage is halved and the ranger regains 50% hp over the course of 15 seconds. This effect lasts for 15 seconds. This can only occur once every 90 seconds.
  - active interaction:
    While the Foxstep effect is active, basic attacks have +50% critical chance
  - optional multiplayer rider:
    - nearby allies damage is reduced by 25% while this effect is enabled

##### Wildfire Volley
- Type: capstone
- Ranks: `1`
- Purpose: turn Warden into the premier wave-shaping lane
- Effects:
  - `Fire Arrow` radius is doubled
  - Burning enemies take 25% more arrow damage
  - Burning enemies have a 25% chance to set other nearby enemies on fire

### Ranger Crossover Patterns

#### Sharpshooter -> Skirmisher
- precise lane-clearing build with stronger kiting
- likely the most stable all-round ranger build

#### Skirmisher -> Warden
- safest pack-control build
- best baseline horde survival shape

#### Sharpshooter -> Warden
- high-output artillery style
- more explosive, less forgiving

### Ranger Design Notes

- Major health and defense should mostly live in `Skirmisher`
- `Sharpshooter` should solve horde pressure through efficient line damage, not pure boss damage
- `Warden` should be strongest at wave shaping and AoE pressure, not generic stat stacking

## Warrior

### Class Identity

The warrior is a bruiser who survives pressure by staying in the fight.

The warrior should feel like:

- durable under pressure
- strongest at close range
- rewarded for committing into enemies
- able to specialize between brawling, endurance, and momentum

### Lane Overview

- `Executioner`
  - direct weapon damage, cleave, finishing pressure
- `Vanguard`
  - health, defense, anti-pressure, front-line durability
- `Berserker`
  - speed, rage, sustain spikes, aggressive momentum

### Warrior Core Active

The warrior should also use one shared right-click active. The strongest candidate remains `Rage`, reframed as a core combat activation:

- baseline use: short offensive commitment window
- `Executioner` investment makes it deadlier and more front-loaded
- `Vanguard` investment makes it more defensive and stabilizing
- `Berserker` investment makes it faster, longer, and more snowbally

If a more direct strike ability is preferred instead, the same lane logic still applies:

- one shared strike/commit active
- lanes modify how it behaves
- no lane should add a second ordinary active button

### Warrior Stat Ownership

#### Executioner owns

- raw damage
- cleave efficiency
- execute thresholds
- melee range feel

#### Vanguard owns

- max health
- defense
- damage reduction
- regen
- anti-burst stability

#### Berserker owns

- attack speed
- move speed in combat
- rage generation
- temporary sustain
- kill-chain momentum

### Warrior Tree

| Row | Executioner | Vanguard | Berserker |
|---|---|---|---|
| 0 |  | `Rage` |  |
| 1 | `Heavy Hand` | `Iron Guard` | `Bloodheat` |
| 2 | `Cleave Discipline` | `Guarded Advance` | `Rage` |
| 3 | `Executioner’s Reach` | `Unbroken` | `Battle Frenzy` |
| 4 | `Butcher’s Path` | `Stonewall` | `Red Tempest` |

### Warrior Node Details

#### Row 0

##### Rage
- Type: core active
- Ranks: `1`
- The warrior's first skill point grants the class right-click active
- Half incoming damage from physical, melee, arrow damage.
- Baseline purpose:
  - a short combat commitment window that all warrior builds can reshape
  - 
- Later lane nodes modify this active rather than introducing more normal buttons

##### Move Speed Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+move speed` per rank

##### Attack Speed Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+attack speed` per rank

##### Damage Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+damage` per rank

##### Defense Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+defense` per rank

#### Row 1

##### Heavy Hand
- Type: passive
- Ranks: `3`
- Purpose: establish the Executioner lane as the direct melee-pressure path
- Rank 1: `+4% melee damage`
- Rank 2: `+4% melee damage`, `+10% cleave arc`
- Rank 3: `+4% damage against enemies above 70% health`

##### Iron Guard
- Type: passive
- Ranks: `3`
- Purpose: establish Vanguard as the main durability lane
- Rank 1: `+8 max health`
- Rank 2: `+8 max health, +4% defense`
- Rank 3: `+8 max health, +0.25% passive regen`

##### Bloodheat
- Type: passive
- Ranks: `3`
- Purpose: establish Berserker as the momentum lane
- Rank 1: `+5% attack speed`
- Rank 2: `+5% attack speed, +5% move speed while in combat`
- Rank 3: `+5% attack speed, +5% life leech while rage is active`

#### Row 2

##### Cleave Discipline
- Type: modifier
- Ranks: `1`
- Purpose: make the warrior active feel like an Executioner tool instead of adding another button
- The first attack after the rage skill is activated will deal critical damage.
- Rage increases critical damage by 20%.


##### Guarded Advance
- Type: passive
- Ranks: `3`
- Purpose: make Vanguard the lane that thrives while pressing into contact
- Rank 1: `+5% defense against melee attacks`
- Rank 2: `+5% defense against melee attacks, deal +3 damage when struck in melee`
- Rank 3: `+5% defense against melee attacks, deal +3 damage when struck in melee`
- Active interaction:
  - While raging, 10% chance to ignore damage on hit
- Multiplayer rider option:
  - While within 3 tiles of the warrior, take -3 damage from melee or arrow attacks

##### Rage Mastery
- Type: modifier anchor
- Ranks: `1`
- Enhances the warrior's Row 0 active in the Berserker direction
- Rage increases attack speed by 25%
- Rage increases movement speed by 15%
- Includes a small passive rider:
  - `+15% rage duration` or slightly better baseline rage uptime

#### Row 3

##### Executioner's Reach
- Type: passive
- Ranks: `3`
- Purpose: make Executioner useful in a crowd-heavy game instead of only on elites
- Rank 1: `+10% chance to instantly kill enemies when damage leaves them under 30% health`
- Rank 2: `+10% chance to instantly kill enemies when damage leaves them under 30% health`
- Rank 3: `+10% chance to instantly kill enemies when damage leaves them under 30% health`
- Active interaction:
  - While raging, attack range is `+10% longer`.

##### Unbroken
- Type: passive
- Ranks: `3`
- Purpose: give Vanguard its true front-line identity
- Rank 1: While below 50% health, gain 8% damage reduction.
- Rank 2: While below 25% health, gain 8% damage reduction and +0.2% life leech.
- Rank 3: You are always raging while under 10% health.
- Active interaction:
  - When you trigger rage, you gain `Second Wind`, healing yourself for 25% or your maximum health over 10 seconds.
- Multiplayer rider option:
  - When rage is triggered, nearby allies gain 10% of their maximum health over 10 seconds.

##### Battle Frenzy
- Type: passive
- Ranks: `3`
- Purpose: reward kill-chain pressure and staying active in the wave
- Rank 1: When you kill an enemy while raging, gain Battle Frenzy and gain `+10% move speed and +5% damage` for 3 seconds. Add 0.1 second to the buff for each enemy killed.
- Rank 2: While under the effects of Battle Frenzy, you gain `+10% move speed and +5% damage`
- Rank 3: While under the effects of Battle Frenzy, you gain `+10% move speed and +5% damage`
- Active interaction:
  - rage windows extend or intensify when kills happen during the active

#### Row 4

##### Butcher's Path
- Type: capstone
- Ranks: `1`
- Purpose: make Executioner the strongest offensive horde-break lane
- Effects:
  - After executing an enemy, your next hit is a guaranteed critical
  - While raging, your execution chance is doubled.

##### Stonewall
- Type: capstone
- Ranks: `1`
- Purpose: make Vanguard the class's premiere hold-the-line lane
- Effects:
  - `+20 max health, +0.5% lifesteal`
  - When you would be reduced to <= 0hp, your hp becomes 1 and you become immune to all damage for 5 seconds. 60 second cooldown.
  - All allies gain +15% defense for 5 seconds while you are raging

##### Red Tempest
- Type: capstone
- Ranks: `1`
- Purpose: make Berserker the warrior's most explosive momentum path
- Effects:
  - While raging, gain +20% movement speed
  - When you rage, gain 25% of your maximum hp as temporary hitpoints. Temporary hitpoints cannot be healed.
  - When you rage, for the first 5 seconds your attacks are in a 360 degree arc.
  
### Warrior Crossover Patterns

#### Executioner -> Vanguard
- high-damage front-liner with better stability
- ideal for players who want pressure without full glass-cannon risk

#### Vanguard -> Berserker
- durable bruiser that ramps as the fight drags on
- likely the safest warrior progression shape

#### Executioner -> Berserker
- all-in aggression build
- strongest offense, weakest passive durability

### Warrior Design Notes

- Major health and defense should mostly live in `Vanguard`
- `Executioner` should be horde-relevant through cleave and front-line deletion, not only boss damage
- `Berserker` should feel fast and explosive, but not permanently tanky

## Necromancer

### Class Identity

The necromancer is a commander and attrition caster.

The class should feel like:

- strongest when building and maintaining battlefield advantage
- rewarded for positioning near allies, corpses, and control zones
- powerful through layered pressure instead of direct burst alone

### Lane Overview

- `Reaper`
  - direct spell damage, death bolt pressure, corpse explosions
- `Gravekeeper`
  - pet durability, healing, ally support, command stability
- `Plaguebinder`
  - curses, zones, spread effects, sustained attrition

### Necromancer Core Active

The necromancer's shared right-click active should remain `Death Bolt`.

- baseline use: direct necrotic projectile with utility and setup value
- `Reaper` investment makes it the direct damage and burst lane
- `Gravekeeper` investment makes it support pets, formation, and healing
- `Plaguebinder` investment makes it spread afflictions, zones, and attrition

This is the clearest class for the shared-active model, because the existing kit already points this way.

### Necromancer Stat Ownership

#### Reaper owns

- spell damage
- death bolt scaling
- explosion damage
- projectile quality

#### Gravekeeper owns

- pet health
- pet defense
- healing power
- controlled undead upkeep
- command radius / stability

#### Plaguebinder owns

- damage-over-time
- radius
- duration
- cooldown reduction
- spread and chain pressure

### Necromancer Tree

| Row | Reaper | Gravekeeper | Plaguebinder |
|---|---|---|---|
| 0 |  | `Death Bolt` |  |
| 1 | `Black Candle` | `Cold Command` | `Rot Touched` |
| 2 | `Death Bolt` | `Control Mastery` | `Hexcraft` |
| 3 | `Exploding Death` | `Bone Ward` | `Lingering Hex` |
| 4 | `Harvester` | `Legion Master` | `Blightstorm` |

### Necromancer Node Details

#### Row 0

##### Death Bolt
- Type: core active
- Ranks: `1`
- The necromancer's first skill point grants the class right-click active
- Baseline purpose:
  - a direct necrotic projectile that later lanes can push toward burst, support, or affliction play
- Later lane nodes modify this active rather than adding more normal buttons

##### Move Speed Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+move speed` per rank

##### Attack Speed Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+attack speed` per rank

##### Damage Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+damage` per rank

##### Defense Training
- Type: utility
- Ranks: `4`
- Migrated from the old shop stat line
- Rank 1-4: `+defense` per rank

#### Row 1

##### Black Candle
- Type: passive
- Ranks: `3`
- Purpose: establish Reaper as the direct offense lane
- Rank 1: `+6% Death Bolt damage`
- Rank 2: `+5% explosion damage`
- Rank 3: `+8% projectile speed` or better Death Bolt travel quality

##### Cold Command
- Type: passive
- Ranks: `3`
- Purpose: establish Gravekeeper as the pet-command lane
- Rank 1: `+8% controlled undead health`
- Rank 2: `+6% controlled undead defense`
- Rank 3: `+8% healing to controlled undead`
- Multiplayer rider option:
  - nearby allies gain a small protection bonus while close to controlled undead

##### Rot Touched
- Type: passive
- Ranks: `3`
- Purpose: establish Plaguebinder as the attrition and zone lane
- Rank 1: `+10% damage-over-time duration`
- Rank 2: `+8% zone or effect radius`
- Rank 3: `+8% damage against affected targets`
- Multiplayer rider option:
  - afflicted enemies take a small amount of bonus allied damage

#### Row 2

##### Death Bolt Mastery
- Type: modifier anchor
- Ranks: `1`
- Enhances the necromancer's Row 0 active in the Reaper direction
- Includes a small passive rider:
  - `+10% Death Bolt impact damage`

##### Control Mastery
- Type: modifier
- Ranks: `3`
- Formalizes the Gravekeeper lane's modification of `Death Bolt` and pet control
- Rank 1:
  - improved controlled-undead capacity/quality lever, depending on final implementation
  - `Death Bolt` gains stronger healing or command interaction with nearby controlled undead
- Rank 2:
  - `+8%` controlled-undead healing received
  - stronger command/formation response after `Death Bolt`
- Rank 3:
  - `+6%` controlled-undead defense while near the necromancer
  - improved multiplayer support pulse for nearby allies around controlled undead

##### Hexcraft
- Type: modifier
- Ranks: `3`
- Purpose: turn `Death Bolt` toward affliction setup instead of adding another button
- Rank 1:
  - `Death Bolt` applies or strengthens plague/curse-style effects
  - `+12%` duration on persistent necrotic effects
- Rank 2:
  - afflicted enemies take `+6%` damage from necromancer zones or pets
- Rank 3:
  - `Death Bolt` gains better affliction spread or a larger affliction radius

#### Row 3

##### Exploding Death
- Type: modifier
- Ranks: `1`
- Applies the current `Exploding Death` augment to the shared `Death Bolt` lane plan
- Serves as the Reaper lane's crowd-pressure bridge by turning kills and ally deaths into burst zones

##### Bone Ward
- Type: passive
- Ranks: `3`
- Purpose: make Gravekeeper the safest and most reliable minion lane
- Rank 1: controlled undead take `6%` less damage
- Rank 2: revived or healed undead return with stronger baseline health
- Rank 3: controlled undead near the necromancer gain an additional defense bonus
- Active interaction:
  - `Death Bolt` cast near allies grants stronger pet sustain or defensive reinforcement

##### Lingering Hex
- Type: passive
- Ranks: `3`
- Purpose: make Plaguebinder strongest in drawn-out crowd fights
- Rank 1: curses and plague effects last longer
- Rank 2: afflicted enemies take bonus damage from undead or Death Bolt follow-up
- Rank 3: spreading or overlapping effects gain extra radius or chain behavior
- Active interaction:
  - `Death Bolt` becomes better at seeding or extending afflictions

#### Row 4

##### Harvester
- Type: capstone
- Ranks: `1`
- Purpose: make Reaper the necromancer's direct kill-pressure lane
- Effects:
  - `Death Bolt` and corpse explosions scale harder off clustered enemies
  - kills strengthen the next direct necrotic effect
  - direct spellcasting becomes a legitimate primary playstyle rather than just support for pets
  - optional active-capstone version:
    - `Death Bolt` becomes a heavier reaping cast with stronger cluster burst

##### Legion Master
- Type: capstone
- Ranks: `1`
- Purpose: make Gravekeeper the dominant ally-command lane
- Effects:
  - strong controlled-undead durability and healing support
  - tighter formation or better bodyguard behavior around the necromancer
  - charmed allies become far more reliable as a stable frontline
  - optional active-capstone version:
    - `Death Bolt` can issue a command pulse or formation reinforcement on cast

##### Blightstorm
- Type: capstone
- Ranks: `1`
- Purpose: make Plaguebinder the attrition king of crowd control
- Effects:
  - larger, longer, or more punishing plague zones
  - afflicted enemies feed further spread or chain reactions
  - crowd fights become progressively more favorable the longer enemies stay inside the necromancer's control area
  - optional active-capstone version:
    - `Death Bolt` seeds a wider plague bloom on impact

### Necromancer Crossover Patterns

#### Reaper -> Gravekeeper
- active caster build with enough stable minion support to stay safe
- likely the most approachable offensive necromancer hybrid

#### Gravekeeper -> Plaguebinder
- stable commander build with stronger long-fight control
- likely the safest broad necromancer shape

#### Reaper -> Plaguebinder
- high-pressure caster-control build
- strongest direct spell and zone output, less forgiving if minions collapse

### Necromancer Design Notes

- `Gravekeeper` should own most of the pet-defense and ally-healing budget
- `Reaper` should give the necromancer a stronger direct play option without erasing the pet fantasy
- `Plaguebinder` should make the class better at choking off space and grinding down crowds

## Cross-Class Design Principles

### 1. Every class needs one lane that carries most of its survivability budget

- Ranger: `Skirmisher`
- Warrior: `Vanguard`
- Necromancer: `Gravekeeper`

### 2. Every lane must solve the class’s core game problem

Bad lane design in this game would be a lane that only matters in boss fights or only matters in empty-room scenarios.

Each lane needs to remain useful under crowd pressure.

### 3. Replacing the shop requires real stat ownership

If the current shop stats are absorbed into the trees, the stats should be distributed in a way that reinforces lane identity:

- health and defense should not be equally available everywhere
- movement and attack speed should not be universal filler
- class-specific offensive stats should live where they make fantasy sense

### 4. Crossover should create hybrids, not erase specializations

Good crossover means:

- a Sharpshooter can dip into Skirmisher and still feel like a Sharpshooter
- a Necromancer Reaper can dip into Gravekeeper and still feel spell-forward
- a Warrior Berserker can take some Vanguard stability without turning into a pure tank

### 5. Multiplayer support should be additive, not mandatory

Good multiplayer-aware nodes should:

- help in solo and multiplayer
- rise in value with allies nearby
- usually work through buffs, debuffs, proximity effects, or support riders on the shared active

Bad multiplayer-aware nodes would:

- only function with a party
- require a very specific party composition
- consume too much of a lane's power budget for solo players

### 6. Row 3 and capstones are the best places to reshape the shared active

The tree should stay low on button count but high on build expression.

That means Row 3 and Row 4 are the right place for:

- changing projectile or swing behavior
- adding support riders
- changing area shape or target logic
- adding multiplayer-friendly utility pulses

Without:

- adding multiple new active hotbar skills

## Point Budget

With Row 0 added in front of the existing trees:

- Ranger total points to fully max the current proposed tree: `42`
- Warrior total points to fully max the current proposed tree: `42`
- Necromancer total points to fully max the current proposed tree: `42`

Math:

- `26` points from the class-specific lane tree
- `16` points from the four shared utility nodes at `4` ranks each
- total: `42`

If the game grants `1` skill point per level:

- a `42`-point tree maxes at `Level 42` if Level 1 grants the first point
- the same tree maxes at `Level 43` if the first point is awarded at Level 2

Class parity goal:

- all classes should have equal total point depth to full max
- individual nodes may still have different rank counts if class identity benefits from it

## Open Design Questions

- Should each lane include a secondary side node in Row 3, or should Rows 3-4 stay narrower and cleaner?
- Should capstones be strictly in-lane, or should late crossover capstones exist?
- Should generic stats like gold find, pickup radius, or cooldown reduction appear in all classes, or only where they fit class fantasy?
- Should the current active skills remain on the same row across all classes, or should some classes unlock earlier or later based on complexity?

## Recommendation

Use the ranger tree as the prototype because it has the clearest tension between:

- current skill unlocks
- shop stat migration
- lane identity in a horde game

If that structure works cleanly for ranger, the same framework can be applied to warrior and necromancer with less risk.
