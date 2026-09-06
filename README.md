# Bumper Mayhem

**3D Bumper Arena — Weapon Mayhem**

A browser-based 3D bumper-car combat game built with **Three.js**, featuring weapons, power-ups, bots, local 1v1 multiplayer, survival mode, and online 1v1 multiplayer.

## Game Modes

### 1v1 Online Multiplayer
Play against another person over the internet.

Features include:

- Private 1v1 rooms
- Shareable room links
- Host and guest players
- WebSocket networking
- Player state synchronization
- Health synchronization
- Connection-loss detection
- Automatic reconnection attempts

Production multiplayer server:

https://rocketpi31415.github.io/bumper-mayhem/

### 1v1 Local Multiplayer

Two players can play on the same keyboard.

**Player 1**
- WASD — Drive

**Player 2**
- Arrow Keys — Drive

### Survival

Fight against bot opponents and try to be the last one standing.

---

# Weapons

The game contains:

- **Cannon Ball**
- **Invincible Star**
- **Spiky Shields**
- **Auto Minigun**
- **Fake Crate Trap**
- **Grappling Hook**
- **Tactical Nuke**

## Weapon Damage

| Weapon | Damage |
|---|---:|
| Cannon Ball | 100 |
| Spiky Shields | 100 per hit |
| Auto Minigun | 20 per shot |
| Grappling Hook | 20 per hook|
| Tactical Nuke | 75 |
| Invincible Star | Kills when ramming into someone |
| Fake Crate Trap | 100 dmg|

---

# Power-Ups

The game contains:

- **Shield**
- **Full Health**
- **Overdrive Nitro**

Temporary effects include:

- Spawn invincibility
- Stun
- Shield protection
- Nitro/boost
- Spikes
- Invincible Star

---

# Interactive Tutorial

The game includes an interactive:

**WEAPONS & POWER-UPS TUTORIAL**

The tutorial explains the game's weapons and power-ups and includes weapon damage information.

The tutorial is implemented in:

`js/tutorial.js`

The current tutorial is based on the **V65 tutorial version**.

---

# Combat System

The combat system supports:

- Weapon damage
- Explosions
- Vehicle-to-vehicle collisions
- Knockback
- Stun effects
- Shield protection
- Temporary invincibility
- Nitro effects
- Spike attacks
- Weapon pickups
- Power-up pickups

---

# Arena & Collision System

The arena contains maze-style walls and collision handling designed to prevent vehicles from becoming stuck inside walls.

The collision system:

- Detects vehicle/wall intersections
- Pushes vehicles out of walls
- Handles vehicles that are already partially inside walls
- Removes knockback directed into walls
- Performs additional collision resolution after vehicle-to-vehicle impacts
- Keeps vehicles inside the arena boundaries

Power-up crates also use spawn-safety checks to reduce the chance of spawning directly on top of vehicles.

---

# Power-Up Crates

The game contains collectible crates and power-up crates.

Power-up spawning includes safety checks that consider nearby vehicles before placing a crate.

Power-up collection uses a vehicle/crate footprint-based pickup radius.

---

# Player System

Players have:

- Health
- Weapons
- Shield timers
- Nitro timers
- Stun timers
- Spawn invincibility
- Death state
- Respawn system
- Health bars
- HUD information

Destroyed players use a **5-second respawn countdown**.

---

# Bot System

The game includes AI-controlled opponents.

Bots can:

- Navigate the arena
- Chase opponents
- Search for crates
- Pick up weapons
- Use weapons
- Attack opponents
- Handle temporary effects
- Participate in Survival mode
- Respawn when applicable

---

# Camera

The game has dedicated camera behavior for different game modes.

The 1v1 camera follows the two-player action and calculates a midpoint between the players.

Camera distance and height limits help keep the arena and vehicles properly framed.

---

# Performance

The game includes performance safeguards such as:

- Frame-time protection
- Reduced unnecessary work when the browser tab is hidden
- Network updates at approximately 15 updates per second rather than every render frame

The multiplayer networking system is separated from the main rendering loop.

---

# Online Multiplayer Architecture

The online system is split into two parts.

### Browser Client

Located in:

```text
js/online.js
js/online_state.js
```

These files handle:

- WebSocket connections
- Room creation
- Room joining
- Invitation links
- Connection status
- Reconnection
- Network state transmission
- Receiving remote player state

### Multiplayer Server

Located in:

```text
server/
├── server.js
├── package.json
└── README.md
```

The server provides:

- Room creation
- Room joining
- Two-player room management
- WebSocket connections
- Message relaying
- Disconnect handling
- Health checking

The server uses Node.js and the `ws` WebSocket package.

---

# Project Structure

```text
bumper-mayhem/
│
├── index.html
│
├── css/
│   └── styles.css
│
├── js/
│   ├── arena.js
│   ├── bots.js
│   ├── combat.js
│   ├── entities.js
│   ├── game.js
│   ├── loop.js
│   ├── main.js
│   ├── online.js
│   ├── online_state.js
│   ├── players.js
│   ├── tutorial.js
│   ├── ui.js
│   └── weapons.js
│
└── server/
    ├── README.md
    ├── package.json
    └── server.js
```

## JavaScript Modules

### `main.js`
Contains shared game state, constants, initialization, input handling, and startup logic.

### `arena.js`
Handles the arena, maze walls, textures, crate textures, spawning, and wall collisions.

### `entities.js`
Creates vehicles and health bars.

### `weapons.js`
Handles weapons, power-ups, crates, projectiles, and weapon effects.

### `combat.js`
Handles damage, explosions, and vehicle collisions.

### `bots.js`
Handles bot creation, AI behavior, crate spawning, and Survival logic.

### `players.js`
Handles player health, deaths, respawning, HUD updates, and player lifecycle.

### `ui.js`
Handles menus, game-mode selection, match lifecycle, and interface events.

### `loop.js`
Contains the main game update/render loop, movement, camera updates, collisions, pickups, effects, and gameplay processing.

### `tutorial.js`
Contains the interactive weapons and power-ups tutorial.

### `online.js`
Handles online rooms, WebSocket connections, invitation links, and connection management.

### `online_state.js`
Handles networked player state synchronization.

### `game.js`
Currently exists as part of the project structure but is not the primary game-loop module.

---

# Server Setup

The multiplayer server is a Node.js WebSocket server.

From inside the `server` directory:

```bash
npm install
npm start
```

The server uses Render's assigned `PORT` when deployed and falls back to port `8080` when running locally.

## Health Check

The server provides:

```text
/health
```

A working server returns a response indicating that the server is running and reports the current number of rooms.

---

# Controls

### Player 1

```text
W — Forward
A — Turn Left
S — Reverse
D — Turn Right
```

### Player 2

```text
↑ — Forward
← — Turn Left
↓ — Reverse
→ — Turn Right
```

---

# Development Notes

The project uses **classic JavaScript `<script>` files rather than ES modules**.

The modules intentionally share game state. This allows the game to remain compatible with the existing architecture while separating major systems into individual files.

---

# Online Server

The current production multiplayer server is:

```text
wss://bumper-mayhem-server.onrender.com
```

The server is designed to support private 1v1 rooms.

For production multiplayer, both players need internet access and the game must be served from a web-accessible location.

---

# Current Project Status

- ✅ 3D bumper-car arena
- ✅ Maze walls
- ✅ Multiple game modes
- ✅ Local 1v1
- ✅ Online 1v1
- ✅ Bots
- ✅ Weapons
- ✅ Power-ups
- ✅ Collectible crates
- ✅ Weapon damage system
- ✅ Health system
- ✅ Explosions
- ✅ Vehicle collisions
- ✅ Stun effects
- ✅ Shield effects
- ✅ Nitro
- ✅ Invincible Star
- ✅ Spiky Shields
- ✅ Respawning
- ✅ 5-second respawn countdown
- ✅ Power-up spawn safety
- ✅ Power-up pickup-radius handling
- ✅ Interactive weapons/power-ups tutorial
- ✅ Tutorial damage information
- ✅ Online room links
- ✅ WebSocket networking
- ✅ Network state updates
- ✅ Connection-loss handling
- ✅ Reconnection attempts
- ✅ Performance safeguards
- ✅ Refactored JavaScript architecture

---

## Deployment Architecture

The **game website** and the **multiplayer server** are separate components.

```text
                 BUMPER MAYHEM
                       │
             ┌─────────┴─────────┐
             │                   │
       Game Website        Multiplayer Server
       GitHub Pages              Render
             │                   │
             └─────────┬─────────┘
                       │
                  Online 1v1
```

Hosting the HTML game alone does **not** provide online multiplayer. The WebSocket server must also be publicly accessible.
