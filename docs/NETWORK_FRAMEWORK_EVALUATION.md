# Network Framework Evaluation

This note records the current backend framework stance for the network transport abstraction branch.

## Current Decision

Keep the custom authoritative multiplayer backend as the production path for this branch. Colyseus is a viable future spike, but it is not the default migration target until the custom transport adapter boundary is stable and a prototype proves that migration reduces risk rather than replacing already-working game protocol code.

The current implementation already owns branch-specific behavior that would be expensive to replace wholesale:

- authoritative `GameSim` room execution
- custom snapshot, keyframe, and delta payloads
- map metadata and chunk streaming
- controller prediction and reconciliation
- room lobby, class lock, ready state, pause ownership, and results flow
- focused Playwright/network validators for join, combat, hit confirmation, UI, pause, audio, and refund paths

## Colyseus Fit

Colyseus is worth evaluating for infrastructure concerns around rooms and operations:

- room lifecycle and matchmaker APIs
- seat reservation and reconnect-oriented session flow
- client SDKs for JavaScript/TypeScript, Unity/C#, Defold, Haxe, and Godot
- schema-based state synchronization for room state
- Redis-backed presence and driver options for multi-process or distributed deployments
- transport options including default WebSocket, uWebSockets.js, Bun WebSockets, and experimental WebTransport

Those strengths do not automatically replace this repo's current protocol. The existing game sends custom snapshots, map chunks, and deltas rather than a pure schema state tree. A production migration would need to prove that Colyseus can host or wrap those payloads without weakening latency, bandwidth control, deterministic validation, or mobile production transport defaults.

## Adoption Path

Use an incremental adoption path:

1. Keep the current `ws` backend and browser WebSocket client as the production default.
2. Continue moving raw socket behavior behind small transport adapters.
3. Keep local/in-memory adapters for deterministic unit-style validation.
4. Add a Colyseus prototype only after adapter seams are stable.
5. Prototype Colyseus as a sidecar room/matchmaking shell before considering schema-state migration.
6. Require the prototype to preserve the current join, snapshot, chunk, input, action, and telemetry semantics.

## Migration Gates

Do not migrate production networking to Colyseus unless a spike satisfies all gates:

- current network validators pass without reducing coverage
- mobile builds keep secure `wss://` production defaults
- no broad Android cleartext or iOS App Transport Security exception becomes required
- snapshot/delta/map-chunk bandwidth remains measurable and bounded
- reconnect and matchmaking behavior has concrete product value over the current room model
- deployment topology is explicit for single-process and multi-process modes
- rollback to the custom WebSocket adapter remains straightforward

## Source Notes

- Colyseus transport docs describe WebSocket as the default transport and list uWebSockets.js, Bun WebSockets, and WebTransport options.
- Colyseus WebTransport docs mark that implementation as experimental.
- Colyseus SDK docs list JavaScript/TypeScript, Unity/C#, Defold, Haxe, and Godot client options.
- Colyseus state docs describe server-owned schema state synchronization.
- Colyseus presence and driver docs describe Redis-backed options for multi-process or distributed deployments.
