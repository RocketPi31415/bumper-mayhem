// V65 Refactor — Bot setup, AI helpers, crates, and survival logic
// Depends on: arena/entities/weapons/combat systems and shared game state.

function getClosestOpponent(entity) {
            const targets = [];
            if (entity !== player && !player.userData.isDead) {
                if (selectedMode !== 'twovtwo' || player.userData.team !== entity.userData.team) {
                    targets.push(player);
                }
            }
            if (selectedMode === 'onevone' && entity !== player2 && !player2.userData.isDead) {
                targets.push(player2);
            }
            bots.forEach(b => {
                if (b.mesh !== entity && !b.mesh.userData.isDead) {
                    if (selectedMode !== 'twovtwo' || b.mesh.userData.team !== entity.userData.team) {
                        targets.push(b.mesh);
                    }
                }
            });

            if (targets.length === 0) return null;

            let closest = targets[0];
            let minDist = entity.position.distanceTo(targets[0].position);

            for (let i = 1; i < targets.length; i++) {
                const d = entity.position.distanceTo(targets[i].position);
                if (d < minDist) {
                    minDist = d;
                    closest = targets[i];
                }
            }
            return closest;
        }

function spawnCrate() {
            let posX, posZ;
            let tries = 0;
            do {
                posX = (Math.random() - 0.5) * (arenaSize - 30);
                posZ = (Math.random() - 0.5) * (arenaSize - 30);
                tries++;
            } while (isInsideMazeWall(posX, posZ, 3.5) && tries < 50);

            const crate = new THREE.Mesh(crateGeo, crateMat);
            crate.position.set(posX, 0.9, posZ);
            crate.castShadow = true;
            scene.add(crate);
            crates.push(crate);
        }

function isPowerupCratePositionSafe(x, z, minDistance = 6) {
            const minDistSq = minDistance * minDistance;
            const vehicles = [];

            if (typeof player !== 'undefined' && player && !player.userData.isDead) {
                vehicles.push(player);
            }

            if (typeof player2 !== 'undefined' && player2 && !player2.userData.isDead) {
                vehicles.push(player2);
            }

            if (typeof bots !== 'undefined' && Array.isArray(bots)) {
                bots.forEach(bot => {
                    if (bot && bot.mesh && !bot.mesh.userData.isDead) {
                        vehicles.push(bot.mesh);
                    }
                });
            }

            return vehicles.every(vehicle => {
                const dx = vehicle.position.x - x;
                const dz = vehicle.position.z - z;
                return (dx * dx + dz * dz) >= minDistSq;
            });
        }

function spawnPowerupCrate() {
            let posX, posZ;
            let tries = 0;

            // Power-up crates must have clear space around them when they spawn.
            // This prevents a crate from appearing inside/under a car.
            do {
                posX = (Math.random() - 0.5) * (arenaSize - 30);
                posZ = (Math.random() - 0.5) * (arenaSize - 30);
                tries++;
            } while (
                (isInsideMazeWall(posX, posZ, 3.5) ||
                 !isPowerupCratePositionSafe(posX, posZ, 6)) &&
                tries < 100
            );

            // If the arena is crowded, keep searching rather than intentionally
            // placing the power-up on a vehicle.
            if (!isPowerupCratePositionSafe(posX, posZ, 5)) {
                for (let i = 0; i < 100; i++) {
                    posX = (Math.random() - 0.5) * (arenaSize - 30);
                    posZ = (Math.random() - 0.5) * (arenaSize - 30);

                    if (!isInsideMazeWall(posX, posZ, 3.5) &&
                        isPowerupCratePositionSafe(posX, posZ, 5)) {
                        break;
                    }
                }
            }

            const crate = new THREE.Mesh(crateGeo, powerupCrateMat);
            crate.position.set(posX, 30, posZ);
            crate.castShadow = true;

            const pType = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
            scene.add(crate);
            powerupCrates.push({ mesh: crate, type: pType, targetY: 0.9, falling: true });
        }

function initBots(mode) {
            bots.forEach(b => {
                clearBotSpikes(b.mesh);
                scene.remove(b.mesh);
            });
            bots = [];

            if (selectedMode === 'onevone') return;

            const is2v2 = (selectedMode === 'twovtwo');

            const configs = [
                { name: is2v2 ? "Teammate Bot" : "Green Bot 1", color: is2v2 ? 0x1abc9c : 0x2ecc71, diff: "Medium", speed: 0.20, team: is2v2 ? 1 : 2 },
                { name: "Enemy Bot 1", color: 0xe74c3c, diff: "Hard", speed: 0.22, team: 2 },
                { name: "Enemy Bot 2", color: 0xe67e22, diff: "Medium", speed: 0.20, team: 2 }
            ];

            const initialSpawnPoints = is2v2 ? [
                { x: -60, z: 30 },
                { x: 60, z: -30 },
                { x: 60, z: 30 }
            ] : [
                { x: -50, z: -50 },
                { x: 50, z: -50 },
                { x: 0, z: 50 }
            ];

            for (let i = 0; i < 3; i++) {
                let cfg = configs[i];
                if (!is2v2) {
                    if (mode === 'easy') cfg = { name: `Rookie Bot ${i+1}`, color: 0x2ecc71, diff: 'Easy', speed: 0.16, team: 2 };
                    if (mode === 'medium') cfg = { name: `Pro Bot ${i+1}`, color: 0x9b59b6, diff: 'Medium', speed: 0.20, team: 2 };
                    if (mode === 'hard') cfg = { name: `Master Bot ${i+1}`, color: 0xe74c3c, diff: 'Hard', speed: 0.24, team: 2 };
                }

                const botMesh = createVehicle(cfg.color, cfg.team);
                const spawnPos = getSafeSpawnPosition(initialSpawnPoints[i].x, initialSpawnPoints[i].z);
                botMesh.position.copy(spawnPos);

                const botObj = {
                    name: cfg.name,
                    mesh: botMesh,
                    diff: cfg.diff,
                    speed: cfg.speed,
                    spawnPos: spawnPos,
                    kills: 0
                };

                botMesh.userData.team = cfg.team;
                botMesh.userData.health = 100;
                botMesh.userData.stamina = 100;
                botMesh.userData.maxStamina = 100;
                botMesh.userData.staminaCooldown = 0;
                botMesh.userData.botRef = botObj;
                botMesh.userData.weapon = null;
                botMesh.userData.isStarActive = false;
                botMesh.userData.starTimer = 0;
                botMesh.userData.activeSpikes = [];
                botMesh.userData.spikesTimer = 0;
                botMesh.userData.baseColor = cfg.color;
                botMesh.userData.isDead = false;
                botMesh.userData.spawnInvincibleTimer = 0;
                botMesh.userData.reverseTimer = 0;
                botMesh.userData.stuckAngle = 0;
                botMesh.userData.driveTime = 0;
                botMesh.userData.stunTimer = 0;
                botMesh.userData.dragState = null;
                botMesh.userData.grappleCount = 3;
                botMesh.userData.shieldTimer = 0;
                botMesh.userData.nitroTimer = 0;
                botMesh.userData.chargingNuke = false;
                botMesh.userData.nukeChargeTime = 0;
                botMesh.userData.targetNukeCharge = 0;

                updateHealthBar(botMesh.userData.healthBar, 100);
                bots.push(botObj);
            }
        }

function checkSurvivalEnd() {
            if (selectedMode !== 'survival' || !gameRunning) return;
            const aliveBots = bots.filter(b => !b.mesh.userData.isDead);
            const isPlayerAlive = !player.userData.isDead;
            const totalAlive = aliveBots.length + (isPlayerAlive ? 1 : 0);

            if (totalAlive <= 1) {
                endGame();
            }
        }

function cycleSpectatorTarget(direction) {
            const aliveBots = bots.filter(b => !b.mesh.userData.isDead);
            if (aliveBots.length === 0) return;

            spectatingTargetIndex = (spectatingTargetIndex + direction + aliveBots.length) % aliveBots.length;
            const activeBot = aliveBots[spectatingTargetIndex];
            document.getElementById('spectator-target-name').innerText = `SPECTATING: ${activeBot.name.toUpperCase()}`;
        }

function killBot(bot) {
            sound.playExplosion();
            clearBotSpikes(bot.mesh);
            bot.mesh.userData.isDead = true;
            bot.mesh.userData.stunTimer = 0;
            bot.mesh.userData.dragState = null;
            bot.mesh.userData.shieldTimer = 0;
            bot.mesh.userData.nitroTimer = 0;
            bot.mesh.userData.chargingNuke = false;
            bot.mesh.userData.nukeChargeTime = 0;
            bot.mesh.visible = false;
            bot.mesh.position.set(0, -500, 0);

            if (selectedMode === 'survival') {
                spectatingTargetIndex = 0;
                const aliveBots = bots.filter(b => !b.mesh.userData.isDead);
                if (aliveBots.length > 0) {
                    document.getElementById('spectator-target-name').innerText = `SPECTATING: ${aliveBots[0].name.toUpperCase()}`;
                }
                checkSurvivalEnd();
                return;
            }

            setTimeout(() => {
                if (!gameRunning) return;
                bot.mesh.userData.isDead = false;
                bot.mesh.userData.health = 100;
                bot.mesh.userData.stamina = 100;
                bot.mesh.userData.maxStamina = 100;
                bot.mesh.userData.staminaCooldown = 0;
                bot.mesh.userData.weapon = null;
                bot.mesh.userData.isStarActive = false;
                bot.mesh.userData.reverseTimer = 0;
                bot.mesh.userData.driveTime = 0;
                bot.mesh.userData.stunTimer = 0;
                bot.mesh.userData.dragState = null;
                bot.mesh.userData.grappleCount = 3;
                bot.mesh.userData.shieldTimer = 0;
                bot.mesh.userData.nitroTimer = 0;
                bot.mesh.userData.chargingNuke = false;
                bot.mesh.userData.nukeChargeTime = 0;
                bot.mesh.userData.targetNukeCharge = 0;
                bot.mesh.children[0].material.color.setHex(bot.mesh.userData.baseColor);
                updateHealthBar(bot.mesh.userData.healthBar, 100);
                bot.mesh.position.copy(getSafeSpawnPosition(bot.spawnPos.x, bot.spawnPos.z));
                bot.mesh.visible = true;
                bot.mesh.userData.spawnInvincibleTimer = 180;
            }, 5000);
        }
