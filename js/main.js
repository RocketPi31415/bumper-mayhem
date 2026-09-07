// V65 Refactor — Main application state and initialization
// This file intentionally keeps V65's shared state in one place so the refactor
// changes organization without changing gameplay behavior.

class SoundEngine {
            constructor() {
                this.ctx = null;
                this.enabled = true;
                this.bgmTimer = null;
                this.bgmIndex = 0;
            }

            init() {
                if (!this.ctx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.ctx = new AudioContext();
                }
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            }

            playTone(freq, type, duration, vol = 0.1, slideFreq = null) {
                if (!this.enabled || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = type;
                    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                    if (slideFreq !== null) {
                        osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
                    }
                    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + duration);
                } catch(e) {}
            }

            playNoise(duration, vol = 0.2) {
                if (!this.enabled || !this.ctx) return;
                try {
                    const bufferSize = this.ctx.sampleRate * duration;
                    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = buffer;
                    const gain = this.ctx.createGain();
                    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
                    noise.connect(gain);
                    gain.connect(this.ctx.destination);
                    noise.start();
                } catch(e) {}
            }

            playBump() { this.playTone(120, 'square', 0.15, 0.2, 40); }
            playCrate() { 
                this.playTone(400, 'sine', 0.1, 0.15);
                setTimeout(() => this.playTone(800, 'sine', 0.15, 0.15), 60);
            }
            playExplosion() {
                this.playNoise(0.5, 0.4);
                this.playTone(80, 'sawtooth', 0.4, 0.3, 20);
            }
            playLaser() { this.playTone(900, 'sawtooth', 0.08, 0.08, 200); }
            playGrapple() { this.playTone(300, 'triangle', 0.2, 0.15, 600); }
            playPowerup() {
                const notes = [261, 329, 392, 523];
                notes.forEach((n, i) => {
                    setTimeout(() => this.playTone(n, 'sine', 0.1, 0.15), i * 50);
                });
            }

            startBGM() {
                this.stopBGM();
                if (!this.enabled) return;
                const bassline = [110, 110, 130, 110, 146, 130, 98, 110];
                this.bgmIndex = 0;
                this.bgmTimer = setInterval(() => {
                    if (!this.enabled || !gameRunning) return;
                    const freq = bassline[this.bgmIndex % bassline.length];
                    this.playTone(freq, 'sawtooth', 0.2, 0.04, freq * 0.8);
                    if (this.bgmIndex % 2 === 0) {
                        this.playTone(440, 'triangle', 0.02, 0.02);
                    }
                    this.bgmIndex++;
                }, 220);
            }

            stopBGM() {
                if (this.bgmTimer) {
                    clearInterval(this.bgmTimer);
                    this.bgmTimer = null;
                }
            }
        }

        const sound = new SoundEngine();

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0b0c10);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        // V74: second camera for local 1v1 split-screen.
        const camera2 = new THREE.PerspectiveCamera(60, 0.5, 0.1, 1000);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            camera2.aspect = (window.innerWidth * 0.5) / window.innerHeight;
            camera2.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(40, 60, 40);
        dirLight.castShadow = true;
        scene.add(dirLight);


        const realCrateTex = createCrateTexture('?', '#e67e22', '#d35400');
        const powerupCrateTex = createCrateTexture('?', '#2980b9', '#1f618d');
        const playerFakeCrateTex = createCrateTexture('💀', '#2ecc71', '#27ae60');
        const botFakeCrateTex = createCrateTexture('💀', '#e67e22', '#d35400');

        const crateMat = new THREE.MeshStandardMaterial({ map: realCrateTex, roughness: 0.3, metalness: 0.1 });
        const powerupCrateMat = new THREE.MeshStandardMaterial({ map: powerupCrateTex, roughness: 0.3, metalness: 0.1 });
        const playerFakeCrateMat = new THREE.MeshStandardMaterial({ map: playerFakeCrateTex, roughness: 0.3, metalness: 0.1 });
        const botFakeCrateMat = new THREE.MeshStandardMaterial({ map: botFakeCrateTex, roughness: 0.3, metalness: 0.1 });


        const arenaSize = 180;
        const outerWallHeight = 8;
        const wallThickness = 4;
        
        const arenaFloorTex = createArenaFloorTexture();
        const floorGeo = new THREE.BoxGeometry(arenaSize, 1, arenaSize);
        const floorMat = new THREE.MeshStandardMaterial({ map: arenaFloorTex, roughness: 0.6, metalness: 0.2 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        scene.add(floor);

        const stadiumOuterMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.8 });
        const stadiumOuter = new THREE.Mesh(new THREE.BoxGeometry(arenaSize + 30, 2, arenaSize + 30), stadiumOuterMat);
        stadiumOuter.position.y = -1.5;
        scene.add(stadiumOuter);

        const wallMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
        const capMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, emissive: 0x551111 });

        const createWallBorder = (w, h, d, x, y, z) => {
            const wallGroup = new THREE.Group();

            const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
            wall.castShadow = true;
            wall.receiveShadow = true;
            wallGroup.add(wall);

            const capWidth = w > d ? w : d + 0.2;
            const capDepth = d > w ? d : w + 0.2;
            const cap = new THREE.Mesh(new THREE.BoxGeometry(capWidth, 0.6, capDepth), capMat);
            cap.position.y = h / 2 + 0.3;
            wallGroup.add(cap);

            wallGroup.position.set(x, y, z);
            scene.add(wallGroup);
        };

        createWallBorder(arenaSize + wallThickness, outerWallHeight, wallThickness, 0, outerWallHeight / 2, arenaSize / 2);
        createWallBorder(arenaSize + wallThickness, outerWallHeight, wallThickness, 0, outerWallHeight / 2, -arenaSize / 2);
        createWallBorder(wallThickness, outerWallHeight, arenaSize + wallThickness, arenaSize / 2, outerWallHeight / 2, 0);
        createWallBorder(wallThickness, outerWallHeight, arenaSize + wallThickness, -arenaSize / 2, outerWallHeight / 2, 0);


        const offset = (arenaSize / 2) - 6;
        createCornerLightTower(-offset, -offset);
        createCornerLightTower(offset, -offset);
        createCornerLightTower(-offset, offset);
        createCornerLightTower(offset, offset);

        const nukeLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,1)]);
        const nukeLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
        const nukeAimLine = new THREE.Line(nukeLineGeo, nukeLineMat);
        nukeAimLine.visible = false;
        scene.add(nukeAimLine);

        const mazeWalls = [];
        const mazeWallMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.4 });
        const mazeCapMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, emissive: 0x442200 });


        const smashKartsLayout = [
            { x: -35, z: -35, w: 18, d: 18 },
            { x: 35, z: -35, w: 18, d: 18 },
            { x: -35, z: 35, w: 18, d: 18 },
            { x: 35, z: 35, w: 18, d: 18 },
            { x: 0, z: -62, w: 45, d: 6 },
            { x: 0, z: 62, w: 45, d: 6 },
            { x: -62, z: 0, w: 6, d: 45 },
            { x: 62, z: 0, w: 6, d: 45 },
            { x: -65, z: -65, w: 14, d: 14 },
            { x: 65, z: -65, w: 14, d: 14 },
            { x: -65, z: 65, w: 14, d: 14 },
            { x: 65, z: 65, w: 14, d: 14 }
        ];

        smashKartsLayout.forEach(b => createMazeWall(b.x, b.z, b.w, b.d));







        let gameRunning = false;
        let selectedMode = 'classic';
        let playerKills = 0;
        let player2Kills = 0;
        let team1Kills = 0;
        let team2Kills = 0;
        let currentWeapon = null;
        let player2Weapon = null;
        const keys = {};

        let gameTimeRemaining = 120;
        let matchTimerInterval = null;

        let spectatingTargetIndex = 0;

        let playerStamina = 100;
        let playerMaxStamina = 100;
        let playerStaminaCooldown = 0;

        let player2Stamina = 100;
        let player2MaxStamina = 100;
        let player2StaminaCooldown = 0;

        const staminaDrainRate = 20;
        const staminaRechargeRate = 12;

        const player = createVehicle(0x3498db, 1);
        player.position.copy(getSafeSpawnPosition(-60, 0));
        player.userData.health = 100;
        player.userData.baseColor = 0x3498db;
        player.userData.isDead = false;
        player.userData.spawnInvincibleTimer = 0;
        player.userData.spawnInvincibleUntil = 0;
        updateHealthBar(player.userData.healthBar, 100);

        const player2 = createVehicle(0xe74c3c, 2);
        player2.position.copy(getSafeSpawnPosition(60, 0));
        player2.userData.health = 100;
        player2.userData.baseColor = 0xe74c3c;
        player2.userData.isDead = false;
        player2.userData.spawnInvincibleTimer = 0;
        player2.userData.spawnInvincibleUntil = 0;
        player2.visible = false;
        updateHealthBar(player2.userData.healthBar, 100);

        let isStarActive = false;
        let starTimer = 0;
        let activeSpikes = [];
        let projectiles = [];
        let droppedFakeCrates = [];
        let explosionEffects = [];
        let flameTrails = [];

        const CAM_DISTANCE = 16;
        const CAM_HEIGHT = 6;

        document.getElementById('game-mode').addEventListener('change', (e) => {
            const mode = e.target.value;
            const botSetupLabel = document.getElementById('bot-setup-label');
            const botDifficultySelect = document.getElementById('bot-difficulty');
            
            if (mode === 'onevone') {
                botSetupLabel.style.display = 'none';
                botDifficultySelect.style.display = 'none';
            } else {
                botSetupLabel.style.display = 'block';
                botDifficultySelect.style.display = 'block';
            }
        });

        function getOnlineLocalEntity() {
            if (window.__bumperOnlineMatch === true) {
                return window.onlineIsHost === true ? player : player2;
            }
            return player;
        }

        window.addEventListener('keydown', (e) => {
            sound.init();
            const k = e.key.toLowerCase();
            const online = window.__bumperOnlineMatch === true;
            const localEntity = getOnlineLocalEntity();

            // In online 1v1, both Space and Enter fire the LOCAL player's item.
            // This is intentionally local-only: no keyboard event is ever sent
            // to the opponent as an input command.
            const fireKey = e.code === 'Space' || (online && e.key === 'Enter');
            if (!keys[k] && fireKey && gameRunning && localEntity && !localEntity.userData.isDead) {
                const weapon = localEntity === player ? currentWeapon : player2Weapon;
                if (weapon === 'nuke') {
                    localEntity.userData.chargingNuke = true;
                    localEntity.userData.nukeChargeTime = 0;
                    const chargeBg = document.getElementById('charge-bar-bg');
                    const chargeFill = document.getElementById('charge-bar-fill');
                    if (chargeBg) chargeBg.style.display = 'block';
                    if (chargeFill) chargeFill.style.width = '0%';
                } else {
                    useWeapon(localEntity);
                }
            }

            // Keep the existing local-1v1 controls when that mode is used.
            if (!online && !keys[k] && e.key === 'Shift' && e.location === 2 &&
                gameRunning && selectedMode === 'onevone' && !player2.userData.isDead) {
                if (player2Weapon === 'nuke') {
                    player2.userData.chargingNuke = true;
                    player2.userData.nukeChargeTime = 0;
                } else {
                    useWeapon(player2);
                }
            }

            keys[k] = true;
            if (e.key === 'Shift' && e.location !== 2) keys['shift'] = true;
            if (e.key === 'Shift' && e.location === 2) keys['rightshift'] = true;

            if (player.userData.isDead && selectedMode === 'survival' && gameRunning) {
                if (k === 'a' || k === 'arrowleft') cycleSpectatorTarget(-1);
                if (k === 'd' || k === 'arrowright') cycleSpectatorTarget(1);
            }

            if (e.key === 'Escape' && document.getElementById('game-over-overlay').style.display !== 'flex') {
                toggleMenu();
            }
        });

        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            const online = window.__bumperOnlineMatch === true;
            const localEntity = getOnlineLocalEntity();

            // In online 1v1, both Space and Enter release the LOCAL player's nuke.
            if (gameRunning && localEntity && !localEntity.userData.isDead &&
                (e.code === 'Space' || (online && e.key === 'Enter'))) {
                const weapon = localEntity === player ? currentWeapon : player2Weapon;
                if (weapon === 'nuke' && localEntity.userData.chargingNuke) {
                    useWeapon(localEntity);
                }
            }

            // Preserve the old local-1v1 Player 2 Enter/right-shift behavior.
            if (!online && e.key === 'Enter' && gameRunning && selectedMode === 'onevone' &&
                !player2.userData.isDead && player2Weapon === 'nuke' && player2.userData.chargingNuke) {
                useWeapon(player2);
            }

            keys[k] = false;
            if (e.key === 'Shift' && e.location !== 2) keys['shift'] = false;
            if (e.key === 'Shift' && e.location === 2) keys['rightshift'] = false;
        });

        document.getElementById('audio-btn').addEventListener('click', () => {
            sound.enabled = !sound.enabled;
            document.getElementById('audio-btn').innerText = sound.enabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
            if (sound.enabled && gameRunning) {
                sound.init();
                sound.startBGM();
            } else {
                sound.stopBGM();
            }
        });

        const WEAPONS = ['cannon', 'star', 'spiky_balls', 'minigun', 'fake_crate', 'grapple', 'nuke'];
        const WEAPON_NAMES = {
            'cannon': '💣 Cannon Ball',
            'star': '⭐ Invincible Star',
            'spiky_balls': '⚙️ Spiky Shields',
            'minigun': '🔫 Auto Minigun',
            'fake_crate': '📦 Fake Crate Trap',
            'grapple': '🪝 Grappling Hook',
            'nuke': '🚀 Tactical Nuke'
        };

        const POWERUPS = ['shield', 'health', 'overdrive_nitro'];
        const POWERUP_NAMES = {
            'shield': '🛡️ SHIELD POWERUP!',
            'health': '❤️ FULL HEALTH!',
            'overdrive_nitro': '🔥 OVERDRIVE NITRO BOOST!'
        };

        let powerupNoticeTimeout = null;














        const crates = [];
        const powerupCrates = [];
        const crateGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);



        for (let i = 0; i < 16; i++) spawnCrate();

        setInterval(() => {
            if (gameRunning && powerupCrates.length < 5) {
                spawnPowerupCrate();
            }
        }, 8000);

        let bots = [];








        const menuOverlay = document.getElementById('menu-overlay');
        const hud = document.getElementById('ui');
        const startBtn = document.getElementById('start-btn');
        const returnMenuBtn = document.getElementById('return-menu-btn');

        document.getElementById('prev-target-btn').addEventListener('click', () => cycleSpectatorTarget(-1));
        document.getElementById('next-target-btn').addEventListener('click', () => cycleSpectatorTarget(1));
        document.getElementById('spec-menu-btn').addEventListener('click', () => {
            gameRunning = false;
            sound.stopBGM();
            document.getElementById('spectator-overlay').style.display = 'none';
            menuOverlay.style.display = 'flex';
        });



        startBtn.addEventListener('click', startGame);

        returnMenuBtn.addEventListener('click', () => {
            sound.stopBGM();
            document.getElementById('game-over-overlay').style.display = 'none';
            menuOverlay.style.display = 'flex';
        });

        const bound = (arenaSize / 2) - 3.5;
        const camBound = (arenaSize / 2) - 2.0;

        let lastFrameTime = performance.now();


        animate();
