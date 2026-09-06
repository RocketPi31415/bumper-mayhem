window.enterOnlineMode = function(host) {
    // V76: host is Player 1; guest is Player 2.
    window.__bumperOnlineMatch = true;
    window.onlineIsHost = !!host;
    window.setOnlineRole?.(!!host);
    selectedMode = 'onevone';
    if (typeof player2 !== 'undefined') player2.visible = true;

    if (typeof player !== 'undefined' && player.userData) {
        player.userData.onlineRole = host ? 'host' : 'guest';
    }
    if (typeof player2 !== 'undefined' && player2.userData) {
        player2.userData.onlineRole = host ? 'remote' : 'local';
    }

    const overlay = document.getElementById('menu-overlay');
    if (overlay) overlay.style.display = 'none';

    if (typeof startGame === 'function') startGame();
};


// V69 Refactor — Menus, match lifecycle, and UI event wiring
// Depends on: shared game state and player/bot systems.

function endGame() {
            gameRunning = false;
            sound.stopBGM();
            if (matchTimerInterval) clearInterval(matchTimerInterval);

            document.getElementById('ui').style.display = 'none';
            document.getElementById('respawn-overlay').style.display = 'none';
            document.getElementById('spectator-overlay').style.display = 'none';
            document.getElementById('powerup-notice').style.display = 'none';

            const winnerAnnounceEl = document.getElementById('winner-announcement');
            let standingsHTML = "";

            if (selectedMode === 'onevone') {
                if (playerKills > player2Kills) {
                    sound.playPowerup();
                    winnerAnnounceEl.innerText = `🏆 PLAYER 1 WINS! (${playerKills} vs ${player2Kills})`;
                    winnerAnnounceEl.style.color = "#3498db";
                } else if (player2Kills > playerKills) {
                    sound.playPowerup();
                    winnerAnnounceEl.innerText = `🏆 PLAYER 2 WINS! (${player2Kills} vs ${playerKills})`;
                    winnerAnnounceEl.style.color = "#e74c3c";
                } else {
                    winnerAnnounceEl.innerText = `IT'S A TIE! (${playerKills} - ${player2Kills})`;
                    winnerAnnounceEl.style.color = "#f1c40f";
                }

                standingsHTML = "<b>1v1 Match Final Score:</b><ol>";
                standingsHTML += `<li><b>Player 1 (WASD):</b> ${playerKills} Kills</li>`;
                standingsHTML += `<li><b>Player 2 (Arrows):</b> ${player2Kills} Kills</li>`;
                standingsHTML += "</ol>";
            } else if (selectedMode === 'twovtwo') {
                if (team1Kills > team2Kills) {
                    sound.playPowerup();
                    winnerAnnounceEl.innerText = `🏆 YOUR TEAM WINS! (${team1Kills} vs ${team2Kills})`;
                    winnerAnnounceEl.style.color = "#2ecc71";
                } else if (team2Kills > team1Kills) {
                    winnerAnnounceEl.innerText = `🤖 ENEMY TEAM WINS! (${team2Kills} vs ${team1Kills})`;
                    winnerAnnounceEl.style.color = "#e74c3c";
                } else {
                    winnerAnnounceEl.innerText = `IT'S A TIE! (${team1Kills} - ${team2Kills})`;
                    winnerAnnounceEl.style.color = "#f1c40f";
                }

                standingsHTML = "<b>2v2 Final Standings:</b><ol>";
                standingsHTML += `<li><b>Team 1 (You & Teammate):</b> ${team1Kills} Kills</li>`;
                standingsHTML += `<li><b>Team 2 (Enemy Bots):</b> ${team2Kills} Kills</li>`;
                standingsHTML += "</ol>";
            } else {
                const leaderboard = [
                    { name: 'You (Player)', kills: playerKills, isDead: player.userData.isDead }
                ];

                bots.forEach(b => {
                    leaderboard.push({ name: b.name, kills: b.kills, isDead: b.mesh.userData.isDead });
                });

                if (selectedMode === 'survival') {
                    leaderboard.sort((a, b) => (a.isDead ? 1 : 0) - (b.isDead ? 1 : 0) || b.kills - a.kills);
                } else {
                    leaderboard.sort((a, b) => b.kills - a.kills);
                }

                const winner = leaderboard[0];

                if (selectedMode !== 'survival' && leaderboard.length > 1 && leaderboard[0].kills === leaderboard[1].kills) {
                    winnerAnnounceEl.innerText = `IT'S A TIE! (${winner.kills} Kills)`;
                    winnerAnnounceEl.style.color = "#f1c40f";
                } else if (winner.name === 'You (Player)') {
                    sound.playPowerup();
                    winnerAnnounceEl.innerText = `🏆 YOU ARE THE WINNER!`;
                    winnerAnnounceEl.style.color = "#2ecc71";
                } else {
                    winnerAnnounceEl.innerText = `🤖 ${winner.name.toUpperCase()} IS THE WINNER!`;
                    winnerAnnounceEl.style.color = "#e74c3c";
                }

                standingsHTML = "<b>Final Match Standings:</b><ol>";
                leaderboard.forEach(entry => {
                    if (selectedMode === 'survival') {
                        const statusStr = entry.isDead ? "Eliminated" : "SURVIVED / WINNER";
                        standingsHTML += `<li>${entry.name}: <b>${statusStr}</b> (<b>${entry.kills}</b> Kills)</li>`;
                    } else {
                        standingsHTML += `<li>${entry.name}: <b>${entry.kills}</b> Kills</li>`;
                    }
                });
                standingsHTML += "</ol>";
            }

            document.getElementById('final-scores').innerHTML = standingsHTML;
            document.getElementById('game-over-overlay').style.display = 'flex';
        }

function updateLocalSplitScreenUI() {
            const localSplit = selectedMode === 'onevone' && !window.__bumperOnlineMatch;
            const divider = document.getElementById('local-split-divider');
            const p1 = document.getElementById('local-split-p1');
            const p2 = document.getElementById('local-split-p2');
            [divider, p1, p2].forEach(el => {
                if (el) el.style.display = localSplit ? 'block' : 'none';
            });
        }

function startGame() {
            sound.init();
            sound.startBGM();

            const requestedMode = document.getElementById('game-mode').value;
            // Local 1v1 and online 1v1 use different camera layouts.
            window.__bumperOnlineMatch = requestedMode === 'online';
            selectedMode = requestedMode;
            // Online Multiplayer uses the existing 1v1 gameplay path.
            // The menu value is 'online', but the physics/camera code expects 'onevone'.
            if (selectedMode === 'online') selectedMode = 'onevone';
            updateLocalSplitScreenUI();
            const difficultySelect = document.getElementById('bot-difficulty').value;

            playerKills = 0;
            player2Kills = 0;
            team1Kills = 0;
            team2Kills = 0;

            initBots(difficultySelect);

            player.userData.team = 1;
            player.userData.health = 100;
            playerMaxStamina = 100;
            playerStamina = playerMaxStamina;
            playerStaminaCooldown = 0;
            player.userData.isDead = false;
            player.userData.spawnInvincibleTimer = 0;
            player.userData.driveTime = 0;
            player.userData.stunTimer = 0;
            player.userData.dragState = null;
            player.userData.grappleCount = 3;
            player.userData.shieldTimer = 0;
            player.userData.nitroTimer = 0;
            player.userData.chargingNuke = false;
            player.userData.nukeChargeTime = 0;
            player.visible = true;
            setWeapon(null, player);

            if (selectedMode === 'onevone') {
                player2.userData.team = 2;
                player2.userData.health = 100;
                player2MaxStamina = 100;
                player2Stamina = player2MaxStamina;
                player2StaminaCooldown = 0;
                player2.userData.isDead = false;
                player2.userData.spawnInvincibleTimer = 0;
                player2.userData.driveTime = 0;
                player2.userData.stunTimer = 0;
                player2.userData.dragState = null;
                player2.userData.grappleCount = 3;
                player2.userData.shieldTimer = 0;
                player2.userData.nitroTimer = 0;
                player2.userData.chargingNuke = false;
                player2.userData.nukeChargeTime = 0;
                player2.position.copy(getSafeSpawnPosition(60, 0));
                player2.rotation.set(0, 0, 0);
                player2.visible = true;
                setWeapon(null, player2);
            } else {
                player2.visible = false;
                player2.userData.isDead = true;
            }

            updatePlayerUI();

            document.getElementById('powerup-notice').style.display = 'none';

            const playerSpawnX = (selectedMode === 'twovtwo' || selectedMode === 'onevone') ? -60 : 0;
            player.position.copy(getSafeSpawnPosition(playerSpawnX, 0));
            player.rotation.set(0, 0, 0);

            if (selectedMode === 'time_attack') {
                gameTimeRemaining = 60;
            } else if (selectedMode === 'survival') {
                gameTimeRemaining = 300;
            } else {
                gameTimeRemaining = 120;
            }

            updateTimerUI();
            if (matchTimerInterval) clearInterval(matchTimerInterval);

            matchTimerInterval = setInterval(() => {
                if (!gameRunning) return;
                gameTimeRemaining--;
                updateTimerUI();

                if (gameTimeRemaining <= 0) {
                    endGame();
                }
            }, 1000);

            document.getElementById('game-over-overlay').style.display = 'none';
            document.getElementById('respawn-overlay').style.display = 'none';
            document.getElementById('spectator-overlay').style.display = 'none';
            menuOverlay.style.display = 'none';
            hud.style.display = 'block';
            gameRunning = true;
        }

function toggleMenu() {
            gameRunning = !gameRunning;
            if (!gameRunning) {
                sound.stopBGM();
                menuOverlay.style.display = 'flex';
                hud.style.display = 'none';
                document.getElementById('spectator-overlay').style.display = 'none';
                document.getElementById('powerup-notice').style.display = 'none';
            } else {
                sound.startBGM();
                menuOverlay.style.display = 'none';
                if (player.userData.isDead && selectedMode === 'survival') {
                    document.getElementById('spectator-overlay').style.display = 'block';
                } else {
                    hud.style.display = 'block';
                }
            }
        }
