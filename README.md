# V69 Refactored

This is a structural refactor of V69.html.

## Files

- `index.html` — page structure and external Three.js include
- `css/styles.css` — all original CSS
- `js/main.js` — shared state, constants, initialization, input listeners, and startup
- `js/arena.js` — arena/maze/texture helpers
- `js/entities.js` — vehicles and health bars
- `js/weapons.js` — weapons, powerups, crates/effects
- `js/combat.js` — damage, explosions, vehicle collisions
- `js/bots.js` — bot creation, AI helpers, survival, crates
- `js/players.js` — player lifecycle and HUD updates
- `js/ui.js` — menu/match lifecycle
- `js/loop.js` — main animation/game loop

## Important

The refactor uses classic `<script>` files rather than ES modules. This is intentional:
V69 currently relies heavily on shared state such as `scene`, `player`, `bots`,
`selectedMode`, `projectiles`, and other variables. Keeping those shared while
moving function groups into separate files makes the code easier to maintain
without requiring a risky rewrite of the game's architecture.

Open `index.html` in a browser to run the game.

## Wall collision fix

The maze collision system now:
- resolves vehicles that are already partially inside a wall instead of relying on the previous frame;
- removes knockback directed into a wall;
- performs a final wall-collision pass after vehicle-to-vehicle impacts, preventing bumper collisions from pushing cars into walls.


## V69 update
- Player respawn countdown is now 5 seconds after destruction.


## V69 update
- Power-up crates now check all active player and bot vehicles before spawning.
- Crates require a 6-unit safety radius from vehicles at spawn.
- Added a fallback search for crowded arenas to avoid placing crates inside vehicles.


## V69 update
- Fixed power-up crate visual overlap with vehicles.
- Power-ups now trigger at 3.0 units instead of 2.2 units, so the crate is collected before the car body can visibly pass into it.
- Retained the V59 spawn safety check that prevents power-ups from initially spawning on active vehicles.


## V69 update
- Rebuilt directly from V60; the main game loop is intact.
- Changed only the power-up collection logic in `js/loop.js`.
- Power-up pickup now uses a vehicle/crate footprint radius.
- Bot pickup removes the crate rather than the bot.


## V69 update
- Added exact weapon damage information to the interactive tutorial based on the current game code.
- Cannon Ball: 100 damage.
- Spiky Shields: 100 damage per hit.
- Auto Minigun: 20 damage per shot.
- Grappling Hook: 20 damage per hook.
- Tactical Nuke: 75 damage.
- Invincible Star: no direct damage.
- Fake Crate Trap: no direct damage value is assigned in the current weapon code.

## V69 performance update
- Added a conservative frame-time safeguard.
- Avoids unnecessary rendering work when the browser tab is hidden.
- Preserved gameplay systems, weapons, power-ups, tutorial, movement, and camera logic.
- No features were intentionally removed.

## V69 — Online 1v1 rooms

Added an `1v1 Online Multiplayer` menu option with private room links.

Important: a browser game served only as a static local HTML file cannot make
an internet multiplayer room by itself. V69 includes a small WebSocket server
in `server/` that creates/join rooms and relays messages.

To use it online, deploy `server/` to a publicly reachable Node.js host and
configure the browser client's `ONLINE_SERVER_URL` to the resulting WSS endpoint.

## V69 — Online 1v1 networking

V69 builds on the V69 room/link system and adds a compact network-state adapter.
The browser exchanges player transforms/health at about 15 updates per second
instead of sending a full state every render frame.

### Server
Deploy the `server/` folder as a Node.js Web Service. The server must be publicly
reachable over WebSockets. For an HTTPS game site, use the corresponding `wss://`
server address in `js/online.js`.

### Important
The existing offline gameplay remains available. Online room connection and basic
state synchronization are included, but combat authority still depends on the
existing game systems; this version does not rewrite weapon physics or damage rules.


## V69 camera fix
Fixed the online-mode camera regression. The Online Multiplayer menu value is now
mapped to the existing `onevone` gameplay mode before the game loop runs, so the
normal 1v1 camera-follow logic is used instead of leaving the camera at its
initial position. The camera also looks slightly above the arena floor to keep
both cars visible.


## V69 integrity + camera fix

Root cause found in V69: `loop.js` called `window.updateOnlineState?.(dt)`,
but the animation loop defines the frame delta as `delta`, not `dt`. Because
JavaScript evaluates the argument before the optional call, this caused a
`ReferenceError` every frame before `renderer.render(scene, camera)` could run.
The camera therefore stayed at its initial position, producing the flat/empty
view shown in the screenshot.

V69 changes that call to `window.updateOnlineState?.(delta)`.

Integrity checks performed:
- Node.js syntax check on every JavaScript file: PASS.
- Every local JavaScript file referenced by index.html exists: PASS.
- Search for the stale `dt` reference in gameplay loop: PASS after fix.
- Camera writes reviewed: only the intended gameplay camera paths update it.
