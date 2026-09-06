// V65 Refactor — Vehicle/entity construction
// Depends on: THREE and shared game state from main.js.

function createHealthBarMesh() {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 16;
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(3, 0.375, 1);
            sprite.position.y = 2.2;
            return { sprite, canvas, texture };
        }

function updateHealthBar(barObj, hp) {
            const ctx = barObj.canvas.getContext('2d');
            ctx.clearRect(0, 0, 128, 16);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, 128, 16);
            const ratio = Math.max(0, hp / 100);
            ctx.fillStyle = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f1c40f' : '#e74c3c';
            ctx.fillRect(2, 2, 124 * ratio, 12);
            barObj.texture.needsUpdate = true;
        }

function createVehicle(colorHex, team = 1) {
            const group = new THREE.Group();
            
            const bodyGeo = new THREE.BoxGeometry(2, 1, 3.5);
            const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.5;
            body.castShadow = true;
            group.add(body);

            const bumperGeo = new THREE.BoxGeometry(2.3, 0.4, 3.8);
            const bumperMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
            const bumper = new THREE.Mesh(bumperGeo, bumperMat);
            bumper.position.y = 0.3;
            group.add(bumper);

            const roofGeo = new THREE.BoxGeometry(1.4, 0.6, 1.2);
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.set(0, 1.1, 0.3);
            group.add(roof);

            const healthBar = createHealthBarMesh();
            group.add(healthBar.sprite);
            group.userData.healthBar = healthBar;

            group.userData.knockback = new THREE.Vector3(0, 0, 0);
            group.userData.driveTime = 0;
            group.userData.stunTimer = 0;
            group.userData.dragState = null;
            group.userData.grappleCount = 3;
            group.userData.shieldTimer = 0;
            group.userData.nitroTimer = 0;
            group.userData.chargingNuke = false;
            group.userData.nukeChargeTime = 0;
            group.userData.targetNukeCharge = 0;
            group.userData.team = team;

            scene.add(group);
            return group;
        }
