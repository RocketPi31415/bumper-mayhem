// V65 Refactor — Damage, explosions, and vehicle collisions
// Depends on: shared game state and weapon/effect systems.

function applyDamage(target, amount, attacker) {
            if (target.userData.isStarActive || target.userData.spawnInvincibleTimer > 0 || target.userData.isDead) return;

            if (selectedMode === 'twovtwo' && attacker && attacker.userData && attacker.userData.team === target.userData.team) {
                return;
            }

            if (target.userData.shieldTimer > 0) {
                amount *= 0.1;
            }

            target.userData.health -= amount;

            const onlineMatch = window.__bumperOnlineMatch === true;
            const onlineLocal = onlineMatch && typeof window.getOnlineLocalPlayer === 'function'
                ? window.getOnlineLocalPlayer() : null;

            if (target === player) {
                updatePlayerUI();
                if (target.userData.health <= 0) {
                    if (onlineMatch) {
                        // Online 1v1: the victim's own client is authoritative
                        // for the kill. This prevents both clients from
                        // independently counting the same death.
                        if (onlineLocal === target) {
                            let killerSlot = null;
                            if (attacker === player) killerSlot = 'p1';
                            else if (attacker === player2) killerSlot = 'p2';

                            if (killerSlot === 'p2') player2Kills++;
                            killPlayer(player, { killerSlot });
                        }
                    } else {
                        if (attacker === player2) {
                            player2Kills++;
                        } else if (attacker && attacker.userData && attacker.userData.botRef) {
                            attacker.userData.botRef.kills++;
                            if (selectedMode === 'twovtwo') team2Kills++;
                        }
                        killPlayer(player);
                    }
                }
            } else if (target === player2) {
                updatePlayerUI();
                if (target.userData.health <= 0) {
                    if (onlineMatch) {
                        if (onlineLocal === target) {
                            let killerSlot = null;
                            if (attacker === player) killerSlot = 'p1';
                            else if (attacker === player2) killerSlot = 'p2';

                            if (killerSlot === 'p1') playerKills++;
                            killPlayer(player2, { killerSlot });
                        }
                    } else {
                        if (attacker === player) {
                            playerKills++;
                        }
                        killPlayer(player2);
                    }
                }
            } else {
                updateHealthBar(target.userData.healthBar, target.userData.health);
                if (target.userData.health <= 0) {
                    if (attacker === player) {
                        playerKills++;
                        if (selectedMode === 'twovtwo') team1Kills++;
                        updatePlayerUI();
                    } else if (attacker && attacker.userData && attacker.userData.botRef) {
                        attacker.userData.botRef.kills++;
                        if (selectedMode === 'twovtwo') {
                            if (attacker.userData.team === 1) team1Kills++;
                            else team2Kills++;
                        }
                    }
                    killBot(target.userData.botRef);
                }
            }
        }

function triggerExplosion(position, attacker, maxDamage = 50, radius = 12.0) {
            sound.playExplosion();
            const expGeo = new THREE.SphereGeometry(2, 16, 16);
            const expMat = new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.9 });
            const expMesh = new THREE.Mesh(expGeo, expMat);
            expMesh.position.copy(position);
            scene.add(expMesh);

            explosionEffects.push({
                mesh: expMesh,
                scale: 1,
                maxScale: radius > 12 ? 12 : 6,
                opacity: 0.9
            });

            const explosionRadius = radius;
            const explosionDamage = maxDamage;

            const targets = [player, ...(selectedMode === 'onevone' ? [player2] : []), ...bots.map(b => b.mesh)];
            targets.forEach(target => {
                if (target.userData.isDead) return;

                const dist = target.position.distanceTo(position);
                if (dist <= explosionRadius) {
                    const pushDir = target.position.clone().sub(position);
                    pushDir.y = 0;
                    if (pushDir.lengthSq() === 0) pushDir.set(0, 0, 1);
                    else pushDir.normalize();

                    target.userData.knockback.addScaledVector(pushDir, radius > 12 ? 3.0 : 1.8);

                    if (target !== attacker) {
                        applyDamage(target, explosionDamage, attacker);
                    }
                }
            });
        }

function handleVehicleCollisions(v1, v2) {
            if (v1.userData.isDead || v2.userData.isDead) return;

            const dist = v1.position.distanceTo(v2.position);
            const bumpRadius = 2.4;

            if (dist < bumpRadius) {
                sound.playBump();
                if (v1.userData.isStarActive || (v1 === player && isStarActive)) {
                    applyDamage(v2, 100, v1);
                    return;
                }
                if (v2.userData.isStarActive || (v2 === player && isStarActive)) {
                    applyDamage(v1, 100, v2);
                    return;
                }

                const bumpDir = v1.position.clone().sub(v2.position);
                bumpDir.y = 0;
                bumpDir.normalize();

                const overlap = bumpRadius - dist;

                v1.position.addScaledVector(bumpDir, overlap * 0.5);
                v2.position.addScaledVector(bumpDir, -overlap * 0.5);

                const bounceForce = 0.8;
                v1.userData.knockback.addScaledVector(bumpDir, bounceForce);
                v2.userData.knockback.addScaledVector(bumpDir, -bounceForce);

                const FULL_SPEED_FRAMES = 300;
                const v1FullSpeed = v1.userData.driveTime >= FULL_SPEED_FRAMES;
                const v2FullSpeed = v2.userData.driveTime >= FULL_SPEED_FRAMES;

                if (v1FullSpeed) {
                    v2.userData.knockback.addScaledVector(bumpDir, -1.5);
                }
                if (v2FullSpeed) {
                    v1.userData.knockback.addScaledVector(bumpDir, 1.5);
                }

                v1.userData.driveTime = 0;
                v2.userData.driveTime = 0;
            }
        }
