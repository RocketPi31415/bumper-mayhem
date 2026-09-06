// V65 Refactor — Weapons, powerups, and weapon effects
// Depends on: THREE, sound, scene, players, bots, and shared game state.

function showPowerupNotice(type) {
            const noticeEl = document.getElementById('powerup-notice');
            noticeEl.innerText = POWERUP_NAMES[type] || 'POWERUP ACTIVATED!';
            noticeEl.style.display = 'block';

            if (powerupNoticeTimeout) clearTimeout(powerupNoticeTimeout);
            powerupNoticeTimeout = setTimeout(() => {
                noticeEl.style.display = 'none';
            }, 2000);
        }

function triggerPowerup(entity, type) {
            sound.playPowerup();
            if (entity === player || entity === player2) {
                showPowerupNotice(type);
            }

            if (type === 'health') {
                entity.userData.health = 100;
                if (entity === player) updatePlayerUI();
                else if (entity === player2) updatePlayerUI();
                else updateHealthBar(entity.userData.healthBar, 100);
            } else if (type === 'shield') {
                entity.userData.shieldTimer = 300;
            } else if (type === 'overdrive_nitro') {
                entity.userData.nitroTimer = 300;
                if (entity === player) {
                    playerStamina = playerMaxStamina;
                    playerStaminaCooldown = 0;
                    updatePlayerUI();
                } else if (entity === player2) {
                    player2Stamina = player2MaxStamina;
                    player2StaminaCooldown = 0;
                    updatePlayerUI();
                } else {
                    entity.userData.stamina = entity.userData.maxStamina;
                    entity.userData.staminaCooldown = 0;
                }
            }
        }

function spawnFlameParticle(entity) {
            const backDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), entity.rotation.y);
            const flameGeo = new THREE.SphereGeometry(0.6 + Math.random() * 0.4, 8, 8);
            const flameMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xe67e22 : 0xe74c3c, transparent: true, opacity: 0.8 });
            const flameMesh = new THREE.Mesh(flameGeo, flameMat);
            
            flameMesh.position.copy(entity.position).addScaledVector(backDir, 2.0);
            flameMesh.position.y = 0.4;
            scene.add(flameMesh);

            flameTrails.push({
                mesh: flameMesh,
                owner: entity,
                life: 45
            });
        }

function setWeapon(wName, targetEntity = player) {
            const isOnline1v1 = window.__bumperOnlineMatch === true;
            const localEntity = isOnline1v1
                ? (window.onlineIsHost === true ? player : player2)
                : player;

            if (targetEntity === player) {
                currentWeapon = wName;

                if (targetEntity === localEntity) {
                    const chargeBg = document.getElementById('charge-bar-bg');
                    if (chargeBg) {
                        chargeBg.style.display = (wName === 'nuke') ? 'block' : 'none';
                    }

                    if (wName === 'grapple') {
                        document.getElementById('weapon-box').innerText =
                            `${isOnline1v1 ? 'Item' : 'P1 Item'}: ${WEAPON_NAMES[wName]} (${player.userData.grappleCount})`;
                    } else {
                        document.getElementById('weapon-box').innerText =
                            `${isOnline1v1 ? 'Item' : 'P1 Item'}: ${wName ? WEAPON_NAMES[wName] : 'NONE'}`;
                    }
                }
            } else if (targetEntity === player2) {
                player2Weapon = wName;

                // In an online match, never expose the remote player's item.
                if (targetEntity !== localEntity) return;

                if (wName === 'grapple') {
                    document.getElementById('weapon-box').innerText =
                        `Item: ${WEAPON_NAMES[wName]} (${player2.userData.grappleCount})`;
                } else {
                    document.getElementById('weapon-box').innerText =
                        `Item: ${wName ? WEAPON_NAMES[wName] : 'NONE'}`;
                }
            }
        }

function grantRandomWeapon(entity) {
            const randomWep = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
            entity.userData.grappleCount = 3;
            if (entity === player) {
                setWeapon(randomWep, player);
            } else if (entity === player2) {
                setWeapon(randomWep, player2);
            } else {
                entity.userData.weapon = randomWep;
            }
        }

function useWeapon(entity) {
            const isPlayer1 = (entity === player);
            const isPlayer2 = (entity === player2);
            const w = isPlayer1 ? currentWeapon : (isPlayer2 ? player2Weapon : entity.userData.weapon);

            if (!w || entity.userData.isDead) return;

            if (w === 'nuke') {
                sound.playLaser();
                const chargedSecs = entity.userData.nukeChargeTime;
                entity.userData.chargingNuke = false;
                entity.userData.nukeChargeTime = 0;

                if (isPlayer1) {
                    setWeapon(null, player);
                    nukeAimLine.visible = false;
                } else if (isPlayer2) {
                    setWeapon(null, player2);
                } else {
                    entity.userData.weapon = null;
                }

                const damage = 75;
                const targetRange = 20 + (chargedSecs / 5) * 230;
                const flightFrames = 83.037;
                const nukeSpeed = targetRange / flightFrames;

                const nukeGroup = new THREE.Group();
                const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 2.5, 12);
                const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
                const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
                bodyMesh.rotation.x = Math.PI / 2;
                nukeGroup.add(bodyMesh);

                const tipGeo = new THREE.ConeGeometry(0.5, 1.0, 12);
                const tipMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
                const tipMesh = new THREE.Mesh(tipGeo, tipMat);
                tipMesh.rotation.x = Math.PI / 2;
                tipMesh.position.z = 1.25;
                nukeGroup.add(tipMesh);

                const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), entity.rotation.y);
                nukeGroup.position.copy(entity.position).addScaledVector(dir, 2.5);
                nukeGroup.position.y = 1;
                nukeGroup.rotation.y = entity.rotation.y;
                scene.add(nukeGroup);

                projectiles.push({
                    mesh: nukeGroup,
                    tipMesh: tipMesh,
                    velocity: dir.clone().multiplyScalar(nukeSpeed),
                    vy: 0.45,
                    life: 600,
                    owner: entity,
                    isNuke: true,
                    damage: damage
                });
            }
            else if (w === 'cannon') {
                sound.playLaser();
                if (isPlayer1) setWeapon(null, player);
                else if (isPlayer2) setWeapon(null, player2);
                else entity.userData.weapon = null;

                const ballGeo = new THREE.SphereGeometry(1.4, 16, 16);
                const ballMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 });
                const ball = new THREE.Mesh(ballGeo, ballMat);
                
                const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), entity.rotation.y);
                ball.position.copy(entity.position).addScaledVector(dir, 2.5);
                ball.position.y = 1;
                scene.add(ball);

                projectiles.push({
                    mesh: ball,
                    velocity: dir.multiplyScalar(0.8),
                    life: 120,
                    owner: entity,
                    isCannon: true
                });
            } 
            else if (w === 'grapple') {
                sound.playGrapple();
                const countToShoot = entity.userData.grappleCount;

                let angleOffsets = [0];
                if (countToShoot === 3) {
                    angleOffsets = [-0.25, 0, 0.25];
                } else if (countToShoot === 2) {
                    angleOffsets = [-0.15, 0.15];
                } else if (countToShoot === 1) {
                    angleOffsets = [0];
                }

                angleOffsets.forEach(offset => {
                    const hookGroup = new THREE.Group();
                    const hookHeadGeo = new THREE.ConeGeometry(0.3, 0.8, 8);
                    const hookMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.8 });
                    const hookHead = new THREE.Mesh(hookHeadGeo, hookMat);
                    hookHead.rotation.x = Math.PI / 2;
                    hookGroup.add(hookHead);

                    const ropeGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
                    const ropeMat = new THREE.MeshBasicMaterial({ color: 0x8e44ad });
                    const rope = new THREE.Mesh(ropeGeo, ropeMat);
                    rope.rotation.x = Math.PI / 2;
                    rope.position.z = -0.75;
                    hookGroup.add(rope);

                    const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), entity.rotation.y + offset);
                    hookGroup.position.copy(entity.position).addScaledVector(dir, 2);
                    hookGroup.position.y = 0.8;
                    hookGroup.rotation.y = entity.rotation.y + offset;
                    scene.add(hookGroup);

                    projectiles.push({
                        mesh: hookGroup,
                        velocity: dir.multiplyScalar(1.0),
                        life: 45,
                        owner: entity,
                        isGrapple: true,
                        damage: 20
                    });
                });

                entity.userData.grappleCount--;

                if (entity.userData.grappleCount <= 0) {
                    entity.userData.grappleCount = 3;
                    if (isPlayer1) setWeapon(null, player);
                    else if (isPlayer2) setWeapon(null, player2);
                    else entity.userData.weapon = null;
                } else if (isPlayer1) {
                    setWeapon('grapple', player);
                } else if (isPlayer2) {
                    setWeapon('grapple', player2);
                }
            }
            else if (w === 'star') {
                sound.playPowerup();
                if (isPlayer1) setWeapon(null, player);
                else if (isPlayer2) setWeapon(null, player2);
                else entity.userData.weapon = null;

                entity.userData.isStarActive = true;
                entity.userData.starTimer = 180;
                if (isPlayer1) {
                    isStarActive = true;
                    starTimer = 180;
                }
            } 
            else if (w === 'spiky_balls') {
                sound.playPowerup();
                if (isPlayer1) setWeapon(null, player);
                else if (isPlayer2) setWeapon(null, player2);
                else entity.userData.weapon = null;

                if (isPlayer1) clearSpikes();
                else clearBotSpikes(entity);

                entity.userData.activeSpikes = [];
                for (let i = 0; i < 3; i++) {
                    const spikeGeo = new THREE.SphereGeometry(0.5, 8, 8);
                    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.9, roughness: 0.1 });
                    const spike = new THREE.Mesh(spikeGeo, spikeMat);
                    scene.add(spike);
                    entity.userData.activeSpikes.push(spike);
                    if (isPlayer1) activeSpikes.push(spike);
                }
                entity.userData.spikesTimer = 300;
            } 
            else if (w === 'minigun') {
                if (isPlayer1) setWeapon(null, player);
                else if (isPlayer2) setWeapon(null, player2);
                else entity.userData.weapon = null;

                let target = getClosestOpponent(entity);
                let shotCount = 0;

                const interval = setInterval(() => {
                    if (!gameRunning || shotCount >= 10 || entity.userData.health <= 0 || entity.userData.isDead) {
                        clearInterval(interval);
                        return;
                    }

                    sound.playLaser();
                    const bulletGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8);
                    const bulletMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f });
                    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
                    bullet.rotation.x = Math.PI / 2;

                    let dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), entity.rotation.y);
                    if (target) {
                        dir = target.position.clone().sub(entity.position).normalize();
                    }

                    bullet.position.copy(entity.position).addScaledVector(dir, 2);
                    bullet.position.y = 1;
                    scene.add(bullet);

                    projectiles.push({
                        mesh: bullet,
                        velocity: dir.multiplyScalar(2.2),
                        life: 60,
                        owner: entity,
                        damage: 20
                    });

                    shotCount++;
                }, 100);
            } 
            else if (w === 'fake_crate') {
                sound.playBump();
                if (isPlayer1) setWeapon(null, player);
                else if (isPlayer2) setWeapon(null, player2);
                else entity.userData.weapon = null;

                const trapGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
                const trapMat = (isPlayer1 || isPlayer2) ? playerFakeCrateMat : botFakeCrateMat;
                const trap = new THREE.Mesh(trapGeo, trapMat);
                
                const backDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), entity.rotation.y);
                trap.position.copy(entity.position).addScaledVector(backDir, 4);
                trap.position.y = 0.9;
                trap.castShadow = true;
                scene.add(trap);

                droppedFakeCrates.push({ mesh: trap, owner: entity });
            }
        }

function clearSpikes() {
            activeSpikes.forEach(s => scene.remove(s));
            activeSpikes = [];
        }

function clearBotSpikes(botMesh) {
            if (botMesh.userData.activeSpikes) {
                botMesh.userData.activeSpikes.forEach(s => scene.remove(s));
                botMesh.userData.activeSpikes = [];
            }
        }
