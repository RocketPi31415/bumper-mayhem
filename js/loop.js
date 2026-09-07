const MAX_FRAME_DT = 0.05;
const _perfTempVec3 = new THREE.Vector3();
const _perfTempVec3B = new THREE.Vector3();
// V65 Refactor — Main render/update loop
// Depends on: all gameplay systems and shared game state.

function animate() {
            if (document.hidden) {
                requestAnimationFrame(animate);
                return;
            }
            requestAnimationFrame(animate);

            const now = performance.now();
            const delta = Math.min((now - lastFrameTime) / 1000, 0.1);
            lastFrameTime = now;

            if (gameRunning) {
                const allVehicles = [player, ...(selectedMode === 'onevone' ? [player2] : []), ...bots.map(b => b.mesh)];

                allVehicles.forEach(v => {
                    if (v.userData.chargingNuke && !v.userData.isDead) {
                        v.userData.nukeChargeTime = Math.min(5, v.userData.nukeChargeTime + delta);
                        const localOnlineEntity = window.__bumperOnlineMatch === true
                            ? (window.onlineIsHost === true ? player : player2)
                            : player;

                        if (v === localOnlineEntity) {
                            const fill = document.getElementById('charge-bar-fill');
                            if (fill) fill.style.width = `${(v.userData.nukeChargeTime / 5) * 100}%`;

                            const projectedRange = 20 + (v.userData.nukeChargeTime / 5) * 230;
                            const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), v.rotation.y);

                            const lineStart = v.position.clone().addScaledVector(forwardDir, 2.5);
                            lineStart.y = 0.2;
                            const lineEnd = v.position.clone().addScaledVector(forwardDir, projectedRange);
                            lineEnd.y = 0.2;

                            const curvePoints = [];
                            const segments = 30;
                            const peakHeight = Math.min(25, projectedRange * 0.15);

                            for (let i = 0; i <= segments; i++) {
                                const t = i / segments;
                                const point = new THREE.Vector3().lerpVectors(lineStart, lineEnd, t);
                                point.y = 0.2 + (4 * peakHeight * t * (1 - t));
                                curvePoints.push(point);
                            }

                            nukeAimLine.geometry.setFromPoints(curvePoints);
                            nukeAimLine.visible = true;
                        }
                    }
                });

                const localOnlineEntity = window.__bumperOnlineMatch === true
                    ? (window.onlineIsHost === true ? player : player2)
                    : player;
                if (!localOnlineEntity.userData.chargingNuke || localOnlineEntity.userData.isDead) {
                    nukeAimLine.visible = false;
                }

                for (let i = powerupCrates.length - 1; i >= 0; i--) {
                    const pCrate = powerupCrates[i];
                    pCrate.mesh.rotation.y += 0.03;
                    if (pCrate.falling) {
                        pCrate.mesh.position.y -= 0.5;
                        if (pCrate.mesh.position.y <= pCrate.targetY) {
                            pCrate.mesh.position.y = pCrate.targetY;
                            pCrate.falling = false;
                        }
                    }
                }

                allVehicles.forEach(v => {
                    if (v.userData.shieldTimer > 0) {
                        v.userData.shieldTimer--;
                        const isPlayerShield = (v === player || v === player2);
                        if (!v.userData.isStarActive && !(isPlayerShield && isStarActive) && v.userData.spawnInvincibleTimer <= 0) {
                            const shieldFlash = Math.floor(v.userData.shieldTimer / 10) % 2 === 0;
                            v.children[0].material.color.setHex(shieldFlash ? 0x00ffff : v.userData.baseColor);
                        }
                        if (v.userData.shieldTimer <= 0 && !v.userData.isStarActive && !(isPlayerShield && isStarActive) && v.userData.spawnInvincibleTimer <= 0) {
                            v.children[0].material.color.setHex(v.userData.baseColor);
                        }
                    }

                    if (v.userData.nitroTimer > 0) {
                        v.userData.nitroTimer--;
                        if (v.userData.nitroTimer % 3 === 0 && !v.userData.isDead) {
                            spawnFlameParticle(v);
                        }
                    }
                });

                for (let i = flameTrails.length - 1; i >= 0; i--) {
                    const flame = flameTrails[i];
                    flame.life--;
                    flame.mesh.scale.multiplyScalar(0.96);
                    flame.mesh.material.opacity = flame.life / 45;

                    allVehicles.forEach(target => {
                        if (!target.userData.isDead && target !== flame.owner && target.position.distanceTo(flame.mesh.position) < 2.0) {
                            applyDamage(target, 0.4, flame.owner);
                            target.userData.knockback.multiplyScalar(0.9);
                        }
                    });

                    if (flame.life <= 0) {
                        scene.remove(flame.mesh);
                        flameTrails.splice(i, 1);
                    }
                }
                
                allVehicles.forEach(v => {
                    if (v.userData.isDead) return;

                    if (v.userData.dragState) {
                        const drag = v.userData.dragState;
                        if (!drag.puller || drag.puller.userData.isDead) {
                            v.userData.dragState = null;
                        } else {
                            const pullerFront = new THREE.Vector3(0, 0, 2.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), drag.puller.rotation.y);
                            const targetPos = drag.puller.position.clone().add(pullerFront);

                            v.position.lerp(targetPos, drag.speed);
                            v.userData.knockback.set(0, 0, 0);

                            if (v.position.distanceTo(targetPos) < 1.2) {
                                v.userData.dragState = null;
                            }
                        }
                    }

                    if (v.userData.stunTimer > 0) {
                        v.userData.stunTimer--;
                        v.userData.driveTime = 0;
                        v.userData.knockback.set(0, 0, 0);

                        if (v.userData.spawnInvincibleTimer <= 0 && (!v.userData.isStarActive && !(v === player && isStarActive))) {
                            const flashStun = Math.floor(v.userData.stunTimer / 6) % 2 === 0;
                            v.children[0].material.color.setHex(flashStun ? 0xffff00 : v.userData.baseColor);
                            if (v.userData.stunTimer <= 0) {
                                v.children[0].material.color.setHex(v.userData.baseColor);
                            }
                        }
                    }
                });

                allVehicles.forEach(v => {
                    if (!v.userData.isDead) {
                        if (v.userData.knockback && v.userData.knockback.lengthSq() > 0.001) {
                            v.position.add(v.userData.knockback);
                            v.userData.knockback.multiplyScalar(0.85);
                        }
                        v.position.y = 0;
                    }
                });

                const onlineMatch = window.__bumperOnlineMatch === true;
                const onlineLocalIsP1 = window.onlineIsHost === true;

                if (!player.userData.isDead && (!onlineMatch || onlineLocalIsP1)) {
                    const prevPos = player.position.clone();

                    let baseSpeed = isStarActive ? 0.38 : (player.userData.nitroTimer > 0 ? 0.56 : 0.28);
                    const turnSpeed = 0.05;

                    let isSprinting = false;
                    const isMoving = onlineMatch
                        ? (keys['w'] || keys['s'] || keys['arrowup'] || keys['arrowdown'])
                        : (keys['w'] || keys['s']);

                    const canControlPlayer = !player.userData.dragState && player.userData.stunTimer <= 0;

                    if (canControlPlayer) {
                        if (player.userData.nitroTimer > 0) {
                            isSprinting = true;
                            playerStamina = playerMaxStamina;
                            playerStaminaCooldown = 0;
                        } else if ((keys['shift'] || (onlineMatch && keys['rightshift'])) && playerStamina > 0 && isMoving) {
                            isSprinting = true;
                            baseSpeed *= 1.5;
                            playerStamina -= staminaDrainRate * delta;
                            if (playerStamina <= 0) {
                                playerStamina = 0;
                                playerStaminaCooldown = 1.0;
                            }
                        } else {
                            if (playerStaminaCooldown > 0) {
                                playerStaminaCooldown -= delta;
                            } else if (playerStamina < playerMaxStamina) {
                                playerStamina = Math.min(playerMaxStamina, playerStamina + (staminaRechargeRate * delta));
                            }
                        }

                        let isDriving = false;

                        if (keys['w'] || (onlineMatch && keys['arrowup'])) {
                            player.translateZ(baseSpeed);
                            isDriving = true;
                        }
                        if (keys['s'] || (onlineMatch && keys['arrowdown'])) {
                            player.translateZ(-baseSpeed / 2);
                            isDriving = true;
                        }
                        if (keys['a'] || (onlineMatch && keys['arrowleft'])) player.rotation.y += turnSpeed;
                        if (keys['d'] || (onlineMatch && keys['arrowright'])) player.rotation.y -= turnSpeed;

                        if (isDriving) {
                            player.userData.driveTime++;
                        } else {
                            player.userData.driveTime = 0;
                        }
                    }

                    updatePlayerUI();

                    player.position.x = Math.max(-bound, Math.min(bound, player.position.x));
                    player.position.z = Math.max(-bound, Math.min(bound, player.position.z));
                    handleMazeCollisions(player, prevPos);

                    if (window.__bumperOnlineMatch === true && player.userData.spawnInvincibleUntil > 0) {
                        player.userData.spawnInvincibleTimer = Math.max(0,
                            Math.ceil((player.userData.spawnInvincibleUntil - performance.now()) / (1000 / 60)));
                        if (player.userData.spawnInvincibleTimer <= 0) {
                            player.userData.spawnInvincibleUntil = 0;
                            if (player.userData.stunTimer <= 0 && player.userData.shieldTimer <= 0 && !player.userData.isStarActive) {
                                player.children[0].material.color.setHex(player.userData.baseColor);
                            }
                        }
                    } else if (player.userData.spawnInvincibleTimer > 0) {
                        player.userData.spawnInvincibleTimer--;
                        const flash = Math.floor(player.userData.spawnInvincibleTimer / 10) % 2 === 0;
                        player.children[0].material.color.setHex(flash ? 0x00ffff : player.userData.baseColor);
                        if (player.userData.spawnInvincibleTimer <= 0 && player.userData.stunTimer <= 0 && player.userData.shieldTimer <= 0) {
                            player.children[0].material.color.setHex(player.userData.baseColor);
                        }
                    }

                    if (player.userData.isStarActive) {
                        const expiresAt = player.userData.starExpiresAt || (player.userData.starStartedAt + 3000);
                        player.userData.starTimer = Math.max(0,
                            Math.ceil((expiresAt - performance.now()) / (1000 / 60)));
                        isStarActive = player.userData.starTimer > 0;
                        starTimer = player.userData.starTimer;
                        if (isStarActive) {
                            player.children[0].material.color.setHSL((Date.now() % 500) / 500, 1.0, 0.5);
                        } else {
                            player.userData.isStarActive = false;
                            player.userData.starStartedAt = 0;
                            player.userData.starExpiresAt = 0;
                            isStarActive = false;
                            if (player.userData.stunTimer <= 0 && player.userData.shieldTimer <= 0) {
                                player.children[0].material.color.setHex(player.userData.baseColor);
                            }
                        }
                    }

                    if (activeSpikes.length > 0) {
                        const time = Date.now() * 0.005;
                        activeSpikes.forEach((spike, idx) => {
                            const angle = time + (idx * (Math.PI * 2 / 3));
                            spike.position.x = player.position.x + Math.cos(angle) * 3.5;
                            spike.position.z = player.position.z + Math.sin(angle) * 3.5;
                            spike.position.y = 1;

                            if (selectedMode === 'onevone' && !player2.userData.isDead && spike.position.distanceTo(player2.position) < 2.0) {
                                applyDamage(player2, 100, player);
                            }

                            bots.forEach(bot => {
                                if (!bot.mesh.userData.isDead && spike.position.distanceTo(bot.mesh.position) < 2.0) {
                                    applyDamage(bot.mesh, 100, player);
                                }
                            });
                        });

                        player.userData.spikesTimer--;
                        if (player.userData.spikesTimer <= 0) clearSpikes();
                    }

                    if (selectedMode !== 'onevone') {
                        const camOffset = new THREE.Vector3(0, CAM_HEIGHT, -CAM_DISTANCE)
                            .applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
                        
                        const desiredCamPos = player.position.clone().add(camOffset);
                        desiredCamPos.x = Math.max(-camBound, Math.min(camBound, desiredCamPos.x));
                        desiredCamPos.z = Math.max(-camBound, Math.min(camBound, desiredCamPos.z));

                        camera.position.copy(desiredCamPos);
                        camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
                    }
                } 

                if (selectedMode === 'onevone' && !player2.userData.isDead &&
                    (!onlineMatch || !onlineLocalIsP1)) {
                    const prevPos2 = player2.position.clone();

                    let baseSpeed2 = player2.userData.isStarActive ? 0.38 : (player2.userData.nitroTimer > 0 ? 0.56 : 0.28);
                    const turnSpeed2 = 0.05;

                    let isSprinting2 = false;
                    const isMoving2 = onlineMatch
                        ? (keys['w'] || keys['s'] || keys['arrowup'] || keys['arrowdown'])
                        : (keys['arrowup'] || keys['arrowdown']);

                    const canControlPlayer2 = !player2.userData.dragState && player2.userData.stunTimer <= 0;

                    if (canControlPlayer2) {
                        if (player2.userData.nitroTimer > 0) {
                            isSprinting2 = true;
                            player2Stamina = player2MaxStamina;
                            player2StaminaCooldown = 0;
                        } else if ((keys['rightshift'] || (onlineMatch && keys['shift'])) && player2Stamina > 0 && isMoving2) {
                            isSprinting2 = true;
                            baseSpeed2 *= 1.5;
                            player2Stamina -= staminaDrainRate * delta;
                            if (player2Stamina <= 0) {
                                player2Stamina = 0;
                                player2StaminaCooldown = 1.0;
                            }
                        } else {
                            if (player2StaminaCooldown > 0) {
                                player2StaminaCooldown -= delta;
                            } else if (player2Stamina < player2MaxStamina) {
                                player2Stamina = Math.min(player2MaxStamina, player2Stamina + (staminaRechargeRate * delta));
                            }
                        }

                        let isDriving2 = false;

                        if (keys['arrowup'] || (onlineMatch && keys['w'])) {
                            player2.translateZ(baseSpeed2);
                            isDriving2 = true;
                        }
                        if (keys['arrowdown'] || (onlineMatch && keys['s'])) {
                            player2.translateZ(-baseSpeed2 / 2);
                            isDriving2 = true;
                        }
                        if (keys['arrowleft'] || (onlineMatch && keys['a'])) player2.rotation.y += turnSpeed2;
                        if (keys['arrowright'] || (onlineMatch && keys['d'])) player2.rotation.y -= turnSpeed2;

                        if (isDriving2) {
                            player2.userData.driveTime++;
                        } else {
                            player2.userData.driveTime = 0;
                        }
                    }

                    player2.position.x = Math.max(-bound, Math.min(bound, player2.position.x));
                    player2.position.z = Math.max(-bound, Math.min(bound, player2.position.z));
                    handleMazeCollisions(player2, prevPos2);

                    if (window.__bumperOnlineMatch === true && player2.userData.spawnInvincibleUntil > 0) {
                        player2.userData.spawnInvincibleTimer = Math.max(0,
                            Math.ceil((player2.userData.spawnInvincibleUntil - performance.now()) / (1000 / 60)));
                        if (player2.userData.spawnInvincibleTimer <= 0) {
                            player2.userData.spawnInvincibleUntil = 0;
                            if (player2.userData.stunTimer <= 0 && player2.userData.shieldTimer <= 0 && !player2.userData.isStarActive) {
                                player2.children[0].material.color.setHex(player2.userData.baseColor);
                            }
                        }
                    } else if (player2.userData.spawnInvincibleTimer > 0) {
                        player2.userData.spawnInvincibleTimer--;
                        const flash = Math.floor(player2.userData.spawnInvincibleTimer / 10) % 2 === 0;
                        player2.children[0].material.color.setHex(flash ? 0x00ffff : player2.userData.baseColor);
                        if (player2.userData.spawnInvincibleTimer <= 0 && player2.userData.stunTimer <= 0 && player2.userData.shieldTimer <= 0) {
                            player2.children[0].material.color.setHex(player2.userData.baseColor);
                        }
                    }

                    if (player2.userData.isStarActive) {
                        const expiresAt2 = player2.userData.starExpiresAt || (player2.userData.starStartedAt + 3000);
                        player2.userData.starTimer = Math.max(0,
                            Math.ceil((expiresAt2 - performance.now()) / (1000 / 60)));
                        if (player2.userData.starTimer > 0) {
                            player2.children[0].material.color.setHSL((Date.now() % 500) / 500, 1.0, 0.5);
                        } else {
                            player2.userData.isStarActive = false;
                            player2.userData.starStartedAt = 0;
                            player2.userData.starExpiresAt = 0;
                            if (player2.userData.stunTimer <= 0 && player2.userData.shieldTimer <= 0) {
                                player2.children[0].material.color.setHex(player2.userData.baseColor);
                            }
                        }
                    }
                }

                // V84: Player 2 also needs its own spike update loop.
                // Previously only the player-1 `activeSpikes` array was moved,
                // so Player 2's three shield objects stayed at their spawn point.
                if (selectedMode === 'onevone' && player2.userData.activeSpikes && player2.userData.activeSpikes.length > 0) {
                    const time2 = Date.now() * 0.005;
                    player2.userData.activeSpikes.forEach((spike, idx) => {
                        const angle = time2 + (idx * (Math.PI * 2 / 3));
                        spike.position.x = player2.position.x + Math.cos(angle) * 3.5;
                        spike.position.z = player2.position.z + Math.sin(angle) * 3.5;
                        spike.position.y = 1;

                        if (!player.userData.isDead && spike.position.distanceTo(player.position) < 2.0) {
                            applyDamage(player, 100, player2);
                        }
                    });

                    player2.userData.spikesTimer--;
                    if (player2.userData.spikesTimer <= 0) {
                        if (typeof clearBotSpikes === 'function') {
                            clearBotSpikes(player2);
                        } else {
                            player2.userData.activeSpikes.forEach(s => scene.remove(s));
                            player2.userData.activeSpikes = [];
                        }
                    }
                }

                if (selectedMode === 'onevone' && window.__bumperOnlineMatch) {
                    // V76: Online 1v1 camera follows the player's network role.
                    // Host owns Player 1; guest owns Player 2.
                    // Never assume `player` is the local player on the guest client.
                    const isOnlineHost =
                        window.onlineIsHost === true ||
                        window.isOnlineHost === true ||
                        window.onlineState?.isHost === true ||
                        window.onlineState?.role === 'host' ||
                        window.onlineState?.role === 'player1';

                    const localPlayer = isOnlineHost ? player : player2;

                    const onlineCamOffset = new THREE.Vector3(0, CAM_HEIGHT, -CAM_DISTANCE)
                        .applyAxisAngle(new THREE.Vector3(0, 1, 0), localPlayer.rotation.y);

                    const onlineCamPos = localPlayer.position.clone().add(onlineCamOffset);
                    onlineCamPos.x = Math.max(-camBound, Math.min(camBound, onlineCamPos.x));
                    onlineCamPos.z = Math.max(-camBound, Math.min(camBound, onlineCamPos.z));

                    camera.position.copy(onlineCamPos);
                    camera.lookAt(
                        localPlayer.position.x,
                        localPlayer.position.y + 1,
                        localPlayer.position.z
                    );
                } else if (selectedMode === 'onevone' && !window.__bumperOnlineMatch) {
                    // V74: local 1v1 gets an independent follow camera for each player.
                    const offset1 = new THREE.Vector3(0, CAM_HEIGHT, -CAM_DISTANCE)
                        .applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
                    const pos1 = player.position.clone().add(offset1);
                    pos1.x = Math.max(-camBound, Math.min(camBound, pos1.x));
                    pos1.z = Math.max(-camBound, Math.min(camBound, pos1.z));
                    camera.position.copy(pos1);
                    camera.lookAt(player.position.x, player.position.y + 1, player.position.z);

                    const offset2 = new THREE.Vector3(0, CAM_HEIGHT, -CAM_DISTANCE)
                        .applyAxisAngle(new THREE.Vector3(0, 1, 0), player2.rotation.y);
                    const pos2 = player2.position.clone().add(offset2);
                    pos2.x = Math.max(-camBound, Math.min(camBound, pos2.x));
                    pos2.z = Math.max(-camBound, Math.min(camBound, pos2.z));
                    camera2.position.copy(pos2);
                    camera2.lookAt(player2.position.x, player2.position.y + 1, player2.position.z);
                }

                if (selectedMode === 'survival' && player.userData.isDead) {
                    const aliveBots = bots.filter(b => !b.mesh.userData.isDead);
                    if (aliveBots.length > 0) {
                        spectatingTargetIndex = spectatingTargetIndex % aliveBots.length;
                        const targetBot = aliveBots[spectatingTargetIndex].mesh;

                        const camOffset = new THREE.Vector3(0, CAM_HEIGHT, -CAM_DISTANCE)
                            .applyAxisAngle(new THREE.Vector3(0, 1, 0), targetBot.rotation.y);

                        const desiredCamPos = targetBot.position.clone().add(camOffset);
                        desiredCamPos.x = Math.max(-camBound, Math.min(camBound, desiredCamPos.x));
                        desiredCamPos.z = Math.max(-camBound, Math.min(camBound, desiredCamPos.z));

                        camera.position.copy(desiredCamPos);
                        camera.lookAt(targetBot.position.x, targetBot.position.y + 1, targetBot.position.z);
                    }
                }

                for (let i = projectiles.length - 1; i >= 0; i--) {
                    const p = projectiles[i];

                    if (p.isNuke) {
                        p.life--;

                        p.mesh.position.add(p.velocity);
                        p.mesh.position.y += p.vy;
                        p.vy -= 0.022;

                        const horizSpeed = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.z * p.velocity.z);
                        p.mesh.rotation.x = -Math.atan2(p.vy, horizSpeed);

                        if (p.mesh.position.y <= 0.8 || isInsideMazeWall(p.mesh.position.x, p.mesh.position.z, 0.5) || p.life <= 0) {
                            triggerExplosion(p.mesh.position, p.owner, p.damage, 18.0);
                            scene.remove(p.mesh);
                            projectiles.splice(i, 1);
                            continue;
                        }
                    } else {
                        p.mesh.position.add(p.velocity);
                        p.life--;

                        let exploded = false;

                        if (isInsideMazeWall(p.mesh.position.x, p.mesh.position.z, 0.5)) {
                            exploded = true;
                        }

                        if (p.isGrapple) {
                            const hitTargets = [player, ...(selectedMode === 'onevone' ? [player2] : []), ...bots.map(b => b.mesh)];
                            hitTargets.forEach(target => {
                                if (!target.userData.isDead && p.owner !== target && p.mesh.position.distanceTo(target.position) < 2.2) {
                                    sound.playBump();

                                    const isOnline = window.__bumperOnlineMatch === true;
                                    const isLocalTarget = isOnline && (
                                        (window.onlineIsHost === true && target === player) ||
                                        (window.onlineIsHost !== true && target === player2)
                                    );

                                    if (isOnline && !isLocalTarget) {
                                        // The target belongs to the other client.
                                        // Let that client apply the pull locally so
                                        // incoming position snapshots cannot fight
                                        // the drag physics and cause shaking.
                                        window.sendOnlineAction?.({
                                            type: 'grappleHit',
                                            damage: p.damage,
                                            stun: 90,
                                            speed: 0.16
                                        });
                                    } else {
                                        applyDamage(target, p.damage, p.owner);
                                        target.userData.stunTimer = 90;
                                        target.userData.dragState = {
                                            puller: p.owner,
                                            speed: 0.16
                                        };
                                    }

                                    p.life = 0;
                                }
                            });
                        } else if (!p.isCannon) {
                            if (!player.userData.isDead && p.owner !== player && p.mesh.position.distanceTo(player.position) < 2.2) {
                                sound.playBump();
                                applyDamage(player, p.damage, p.owner);
                                p.life = 0;
                            }

                            if (selectedMode === 'onevone' && !player2.userData.isDead && p.owner !== player2 && p.mesh.position.distanceTo(player2.position) < 2.2) {
                                sound.playBump();
                                applyDamage(player2, p.damage, p.owner);
                                p.life = 0;
                            }

                            bots.forEach(bot => {
                                if (!bot.mesh.userData.isDead && p.owner !== bot.mesh && p.mesh.position.distanceTo(bot.mesh.position) < 2.2) {
                                    sound.playBump();
                                    applyDamage(bot.mesh, p.damage, p.owner);
                                    p.life = 0;
                                }
                            });
                        } else {
                            if (!player.userData.isDead && p.owner !== player && p.mesh.position.distanceTo(player.position) < 2.8) {
                                applyDamage(player, 100, p.owner);
                                exploded = true;
                            }
                            if (selectedMode === 'onevone' && !player2.userData.isDead && p.owner !== player2 && p.mesh.position.distanceTo(player2.position) < 2.8) {
                                applyDamage(player2, 100, p.owner);
                                exploded = true;
                            }
                            bots.forEach(bot => {
                                if (!bot.mesh.userData.isDead && p.owner !== bot.mesh && p.mesh.position.distanceTo(bot.mesh.position) < 2.8) {
                                    applyDamage(bot.mesh, 100, p.owner);
                                    exploded = true;
                                }
                            });
                        }

                        if (p.isCannon && (exploded || p.life <= 0)) {
                            triggerExplosion(p.mesh.position, p.owner);
                            p.life = 0;
                        }

                        if (p.life <= 0) {
                            scene.remove(p.mesh);
                            projectiles.splice(i, 1);
                        }
                    }
                }

                for (let i = explosionEffects.length - 1; i >= 0; i--) {
                    const exp = explosionEffects[i];
                    exp.scale += 0.35;
                    exp.mesh.scale.set(exp.scale, exp.scale, exp.scale);
                    exp.opacity -= 0.06;
                    exp.mesh.material.opacity = Math.max(0, exp.opacity);

                    if (exp.opacity <= 0 || exp.scale >= exp.maxScale) {
                        scene.remove(exp.mesh);
                        explosionEffects.splice(i, 1);
                    }
                }

                for (let i = droppedFakeCrates.length - 1; i >= 0; i--) {
                    const trap = droppedFakeCrates[i];
                    trap.mesh.rotation.y += 0.03;
                    
                    const activeTargets = [player, ...(selectedMode === 'onevone' ? [player2] : []), ...bots.map(b => b.mesh)];
                    activeTargets.forEach(target => {
                        if (!target.userData.isDead && target !== trap.owner && target.position.distanceTo(trap.mesh.position) < 2.0) {
                            triggerExplosion(trap.mesh.position, trap.owner, 60, 10.0);
                            scene.remove(trap.mesh);
                            droppedFakeCrates.splice(i, 1);
                        }
                    });
                }

                for (let i = crates.length - 1; i >= 0; i--) {
                    const crate = crates[i];
                    crate.rotation.y += 0.02;

                    if (!player.userData.isDead && player.position.distanceTo(crate.position) < 2.2) {
                        sound.playCrate();
                        grantRandomWeapon(player);
                        scene.remove(crate);
                        crates.splice(i, 1);
                        setTimeout(spawnCrate, 3000);
                        continue;
                    }

                    if (selectedMode === 'onevone' && !player2.userData.isDead && player2.position.distanceTo(crate.position) < 2.2) {
                        sound.playCrate();
                        grantRandomWeapon(player2);
                        scene.remove(crate);
                        crates.splice(i, 1);
                        setTimeout(spawnCrate, 3000);
                        continue;
                    }

                    bots.forEach(bot => {
                        if (!bot.mesh.userData.isDead && bot.mesh.position.distanceTo(crate.position) < 2.2) {
                            sound.playCrate();
                            grantRandomWeapon(bot.mesh);
                            scene.remove(crate);
                            crates.splice(i, 1);
                            setTimeout(spawnCrate, 3000);
                        }
                    });
                }

                for (let i = powerupCrates.length - 1; i >= 0; i--) {
                    const pCrate = powerupCrates[i];

                    // Power-up crates are pickup objects rather than physics bodies.
                    // Use a footprint radius so the vehicle collects the crate when
                    // its body reaches the crate instead of driving through it.
                    if (pCrate.falling) continue;

                    const crateRadius = 1.55;
                    const vehicleRadius = 2.35;
                    const pickupRadius = crateRadius + vehicleRadius + 0.35;
                    const pickupRadiusSq = pickupRadius * pickupRadius;

                    const touchesVehicle = (vehicle) => {
                        if (!vehicle || vehicle.userData.isDead) return false;

                        const dx = vehicle.position.x - pCrate.mesh.position.x;
                        const dz = vehicle.position.z - pCrate.mesh.position.z;

                        return (dx * dx + dz * dz) <= pickupRadiusSq;
                    };

                    if (touchesVehicle(player)) {
                        triggerPowerup(player, pCrate.type);
                        scene.remove(pCrate.mesh);
                        powerupCrates.splice(i, 1);
                        continue;
                    }

                    if (selectedMode === 'onevone' && touchesVehicle(player2)) {
                        triggerPowerup(player2, pCrate.type);
                        scene.remove(pCrate.mesh);
                        powerupCrates.splice(i, 1);
                        continue;
                    }

                    let collectedByBot = false;
                    bots.forEach(bot => {
                        if (!collectedByBot && touchesVehicle(bot.mesh)) {
                            triggerPowerup(bot.mesh, pCrate.type);
                            scene.remove(pCrate.mesh);
                            powerupCrates.splice(i, 1);
                            collectedByBot = true;
                        }
                    });
                }

                bots.forEach(bot => {
                    const bMesh = bot.mesh;
                    if (bMesh.userData.isDead) return;

                    const prevBotPos = bMesh.position.clone();

                    if (bMesh.userData.spawnInvincibleTimer > 0) {
                        bMesh.userData.spawnInvincibleTimer--;
                        const flash = Math.floor(bMesh.userData.spawnInvincibleTimer / 10) % 2 === 0;
                        bMesh.children[0].material.color.setHex(flash ? 0x00ffff : bMesh.userData.baseColor);
                        if (bMesh.userData.spawnInvincibleTimer <= 0 && bMesh.userData.stunTimer <= 0 && bMesh.userData.shieldTimer <= 0) {
                            bMesh.children[0].material.color.setHex(bMesh.userData.baseColor);
                        }
                    }

                    if (bMesh.userData.isStarActive) {
                        if (window.__bumperOnlineMatch === true && bMesh.userData.starStartedAt) {
                            bMesh.userData.starTimer = Math.max(0, 180 - Math.floor((performance.now() - bMesh.userData.starStartedAt) / (1000 / 60)));
                        } else {
                            bMesh.userData.starTimer = Math.max(0, (Number(bMesh.userData.starTimer) || 0) - 1);
                        }
                        bMesh.children[0].material.color.setHSL((Date.now() % 500) / 500, 1.0, 0.5);
                        if (bMesh.userData.starTimer <= 0) {
                            bMesh.userData.isStarActive = false;
                            if (bMesh.userData.stunTimer <= 0 && bMesh.userData.shieldTimer <= 0) {
                                bMesh.children[0].material.color.setHex(bMesh.userData.baseColor);
                            }
                        }
                    }

                    if (bMesh.userData.activeSpikes && bMesh.userData.activeSpikes.length > 0) {
                        const time = Date.now() * 0.005;
                        bMesh.userData.activeSpikes.forEach((spike, idx) => {
                            const angle = time + (idx * (Math.PI * 2 / 3));
                            spike.position.x = bMesh.position.x + Math.cos(angle) * 3.5;
                            spike.position.z = bMesh.position.z + Math.sin(angle) * 3.5;
                            spike.position.y = 1;

                            if (!player.userData.isDead && (selectedMode !== 'twovtwo' || bMesh.userData.team !== player.userData.team)) {
                                if (spike.position.distanceTo(player.position) < 2.0) {
                                    applyDamage(player, 100, bMesh);
                                }
                            }

                            bots.forEach(otherBot => {
                                if (otherBot.mesh !== bMesh && !otherBot.mesh.userData.isDead) {
                                    if (selectedMode !== 'twovtwo' || bMesh.userData.team !== otherBot.mesh.userData.team) {
                                        if (spike.position.distanceTo(otherBot.mesh.position) < 2.0) {
                                            applyDamage(otherBot.mesh, 100, bMesh);
                                        }
                                    }
                                }
                            });
                        });

                        bMesh.userData.spikesTimer--;
                        if (bMesh.userData.spikesTimer <= 0) clearBotSpikes(bMesh);
                    }

                    if (bMesh.userData.dragState || bMesh.userData.stunTimer > 0) {
                        return;
                    }

                    let targetPos = null;

                    if (bMesh.userData.weapon) {
                        let opp = getClosestOpponent(bMesh);
                        if (opp) targetPos = opp.position;
                    }

                    if (!targetPos && crates.length > 0) {
                        let closestCrate = crates[0];
                        let minDist = bMesh.position.distanceTo(crates[0].position);
                        for (let i = 1; i < crates.length; i++) {
                            const d = bMesh.position.distanceTo(crates[i].position);
                            if (d < minDist) {
                                minDist = d;
                                closestCrate = crates[i];
                            }
                        }
                        targetPos = closestCrate.position;
                    }

                    if (!targetPos) {
                        let opp = getClosestOpponent(bMesh);
                        if (opp) targetPos = opp.position;
                    }

                    if (bMesh.userData.reverseTimer > 0) {
                        bMesh.userData.reverseTimer--;
                        bMesh.rotation.y += bMesh.userData.stuckAngle;
                        bMesh.translateZ(-bot.speed * 0.8);
                        bMesh.userData.driveTime = 0;
                    } else if (targetPos) {
                        const dx = targetPos.x - bMesh.position.x;
                        const dz = targetPos.z - bMesh.position.z;
                        const targetAngle = Math.atan2(dx, dz);

                        let diff = targetAngle - bMesh.rotation.y;
                        while (diff < -Math.PI) diff += Math.PI * 2;
                        while (diff > Math.PI) diff -= Math.PI * 2;

                        bMesh.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), 0.06);

                        let moveSpeed = bot.speed;
                        if (bMesh.userData.nitroTimer > 0) moveSpeed *= 1.8;
                        bMesh.translateZ(moveSpeed);
                        bMesh.userData.driveTime++;

                        if (Math.abs(diff) < 0.3 && bMesh.userData.weapon) {
                            if (bMesh.userData.weapon === 'nuke') {
                                if (!bMesh.userData.chargingNuke) {
                                    bMesh.userData.chargingNuke = true;
                                    bMesh.userData.nukeChargeTime = 0;
                                    const dist = bMesh.position.distanceTo(targetPos);
                                    const neededRange = Math.max(20, Math.min(250, dist));
                                    bMesh.userData.targetNukeCharge = ((neededRange - 20) / 230) * 5;
                                } else if (bMesh.userData.nukeChargeTime >= bMesh.userData.targetNukeCharge) {
                                    useWeapon(bMesh);
                                }
                            } else {
                                useWeapon(bMesh);
                            }
                        }
                    }

                    bMesh.position.x = Math.max(-bound, Math.min(bound, bMesh.position.x));
                    bMesh.position.z = Math.max(-bound, Math.min(bound, bMesh.position.z));

                    const oldX = bMesh.position.x;
                    const oldZ = bMesh.position.z;

                    handleMazeCollisions(bMesh, prevBotPos);

                    if (Math.abs(bMesh.position.x - oldX) > 0.01 || Math.abs(bMesh.position.z - oldZ) > 0.01) {
                        if (bMesh.userData.reverseTimer <= 0) {
                            bMesh.userData.reverseTimer = 30;
                            bMesh.userData.stuckAngle = (Math.random() - 0.5) * 1.5;
                        }
                    }
                });

                if (selectedMode === 'onevone' && !player.userData.isDead && !player2.userData.isDead) {
                    handleVehicleCollisions(player, player2);
                }

                for (let i = 0; i < bots.length; i++) {
                    if (!player.userData.isDead && !bots[i].mesh.userData.isDead) {
                        handleVehicleCollisions(player, bots[i].mesh);
                    }
                    if (selectedMode === 'onevone' && !player2.userData.isDead && !bots[i].mesh.userData.isDead) {
                        handleVehicleCollisions(player2, bots[i].mesh);
                    }
                    for (let j = i + 1; j < bots.length; j++) {
                        if (!bots[i].mesh.userData.isDead && !bots[j].mesh.userData.isDead) {
                            handleVehicleCollisions(bots[i].mesh, bots[j].mesh);
                        }
                    }
                }

                // Vehicle-to-vehicle impacts can push a car into a maze wall
                // after its normal wall-collision pass. Resolve that penetration
                // again at the end of the physics step.
                const mazeCollisionEntities = [];
                if (!player.userData.isDead) mazeCollisionEntities.push(player);
                if (selectedMode === 'onevone' && !player2.userData.isDead) mazeCollisionEntities.push(player2);
                bots.forEach(bot => {
                    if (!bot.mesh.userData.isDead) mazeCollisionEntities.push(bot.mesh);
                });

                for (const entity of mazeCollisionEntities) {
                    handleMazeCollisions(entity);
                }
            }

            window.updateOnlineState?.(delta);

            // V74: render local 1v1 as two independent camera viewports.
            const useLocalSplitScreen = selectedMode === 'onevone' && !window.__bumperOnlineMatch;
            if (useLocalSplitScreen) {
                const width = window.innerWidth;
                const height = window.innerHeight;
                const leftWidth = Math.floor(width / 2);

                renderer.setScissorTest(true);

                // Player 1 — left half.
                renderer.setViewport(0, 0, leftWidth, height);
                renderer.setScissor(0, 0, leftWidth, height);
                renderer.render(scene, camera);

                // Player 2 — right half.
                renderer.setViewport(leftWidth, 0, width - leftWidth, height);
                renderer.setScissor(leftWidth, 0, width - leftWidth, height);
                renderer.render(scene, camera2);

                renderer.setScissorTest(false);
                renderer.setViewport(0, 0, width, height);
            } else {
                renderer.setScissorTest(false);
                renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
                renderer.render(scene, camera);
            }
        }
