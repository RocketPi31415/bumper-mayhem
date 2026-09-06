// V65 Refactor — Player lifecycle and HUD updates
// Depends on: shared game state and UI elements.

function updatePlayerUI() {
            if (selectedMode === 'onevone') {
                document.getElementById('health-box').innerText = `P1 HP: ${Math.max(0, Math.round(player.userData.health))} | P2 HP: ${Math.max(0, Math.round(player2.userData.health))}`;
                document.getElementById('stamina-box').innerText = `P1 STAMINA: ${Math.round(playerStamina)} | P2 STAMINA: ${Math.round(player2Stamina)}`;
                document.getElementById('kills').innerText = `P1 Score: ${playerKills} - P2 Score: ${player2Kills}`;
                document.getElementById('score-box').style.display = 'none';
                
                const fill = document.getElementById('stamina-bar-fill');
                fill.style.width = `${(playerStamina / playerMaxStamina) * 100}%`;
                fill.style.backgroundColor = player.userData.nitroTimer > 0 ? '#e67e22' : (playerStaminaCooldown > 0 ? '#e74c3c' : '#3498db');
            } else {
                document.getElementById('health-box').innerText = `HP: ${Math.max(0, Math.round(player.userData.health))} / 100`;
                document.getElementById('stamina-box').innerText = `STAMINA: ${Math.round(playerStamina)} / ${playerMaxStamina}`;
                const fill = document.getElementById('stamina-bar-fill');
                fill.style.width = `${(playerStamina / playerMaxStamina) * 100}%`;
                fill.style.backgroundColor = player.userData.nitroTimer > 0 ? '#e67e22' : (playerStaminaCooldown > 0 ? '#e74c3c' : '#3498db');
                document.getElementById('kills').innerText = `Kills: ${playerKills}`;
                
                if (selectedMode === 'twovtwo') {
                    document.getElementById('score-box').style.display = 'block';
                    document.getElementById('score-box').innerText = `Team Score: ${team1Kills} - ${team2Kills}`;
                } else {
                    document.getElementById('score-box').style.display = 'none';
                }
            }
            updateHealthBar(player.userData.healthBar, player.userData.health);
            if (selectedMode === 'onevone') updateHealthBar(player2.userData.healthBar, player2.userData.health);
        }

function updateTimerUI() {
            const mins = Math.floor(gameTimeRemaining / 60);
            const secs = gameTimeRemaining % 60;
            const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            document.getElementById('timer-box').innerText = `TIME: ${formatted}`;
        }

function killPlayer(targetPlayer = player) {
            sound.playExplosion();
            if (targetPlayer === player) clearSpikes();
            nukeAimLine.visible = false;
            targetPlayer.userData.isDead = true;
            targetPlayer.userData.stunTimer = 0;
            targetPlayer.userData.dragState = null;
            targetPlayer.userData.shieldTimer = 0;
            targetPlayer.userData.nitroTimer = 0;
            targetPlayer.userData.chargingNuke = false;
            targetPlayer.userData.nukeChargeTime = 0;
            targetPlayer.visible = false;
            targetPlayer.position.set(0, -500, 0);
            targetPlayer.userData.driveTime = 0;
            targetPlayer.userData.grappleCount = 3;
            setWeapon(null, targetPlayer);
            if (targetPlayer === player) isStarActive = false;

            document.getElementById('powerup-notice').style.display = 'none';

            if (selectedMode === 'survival') {
                hud.style.display = 'none';
                document.getElementById('spectator-overlay').style.display = 'block';
                spectatingTargetIndex = 0;

                const aliveBots = bots.filter(b => !b.mesh.userData.isDead);
                if (aliveBots.length > 0) {
                    document.getElementById('spectator-target-name').innerText = `SPECTATING: ${aliveBots[0].name.toUpperCase()}`;
                }

                checkSurvivalEnd();
                return;
            }

            const overlay = document.getElementById('respawn-overlay');
            const timerSpan = document.getElementById('respawn-timer');
            overlay.style.display = 'block';
            let timeLeft = 5;
            timerSpan.innerText = timeLeft;

            const countdownInterval = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    timerSpan.innerText = timeLeft;
                } else {
                    clearInterval(countdownInterval);
                    overlay.style.display = 'none';
                    
                    if (!gameRunning) return;

                    targetPlayer.userData.isDead = false;
                    targetPlayer.userData.health = 100;
                    
                    if (targetPlayer === player) {
                        playerMaxStamina = 100;
                        playerStamina = playerMaxStamina;
                        playerStaminaCooldown = 0;
                        const spawnX = (selectedMode === 'twovtwo' || selectedMode === 'onevone') ? -60 : 0;
                        targetPlayer.position.copy(getSafeSpawnPosition(spawnX, 0));
                    } else if (targetPlayer === player2) {
                        player2MaxStamina = 100;
                        player2Stamina = player2MaxStamina;
                        player2StaminaCooldown = 0;
                        targetPlayer.position.copy(getSafeSpawnPosition(60, 0));
                    }

                    targetPlayer.rotation.set(0, 0, 0);
                    targetPlayer.userData.driveTime = 0;
                    targetPlayer.userData.stunTimer = 0;
                    targetPlayer.userData.dragState = null;
                    targetPlayer.userData.grappleCount = 3;
                    targetPlayer.userData.shieldTimer = 0;
                    targetPlayer.userData.nitroTimer = 0;
                    targetPlayer.userData.chargingNuke = false;
                    targetPlayer.userData.nukeChargeTime = 0;
                    targetPlayer.children[0].material.color.setHex(targetPlayer.userData.baseColor);
                    targetPlayer.visible = true;
                    updatePlayerUI();
                    targetPlayer.userData.spawnInvincibleTimer = 180;
                }
            }, 1000);
        }
