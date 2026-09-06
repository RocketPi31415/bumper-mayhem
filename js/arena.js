// V65 Refactor — Arena & maze systems
// Depends on: THREE and shared game state from main.js.

function createCrateTexture(symbol, bgColor = '#e67e22', borderColor = '#d35400') {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, 256, 256);

            ctx.lineWidth = 14;
            ctx.strokeStyle = borderColor;
            ctx.strokeRect(7, 7, 242, 242);

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (symbol === '?') {
                ctx.font = 'bold 160px sans-serif';
                ctx.fillText('?', 128, 138);
            } else if (symbol === '💀') {
                ctx.font = '130px sans-serif';
                ctx.fillText('💀', 128, 128);
            }

            return new THREE.CanvasTexture(canvas);
        }

function createArenaFloorTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1024;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#181a20';
            ctx.fillRect(0, 0, 1024, 1024);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 3;
            const tileSize = 64;
            for (let x = 0; x <= 1024; x += tileSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, 1024);
                ctx.stroke();
            }
            for (let y = 0; y <= 1024; y += tileSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(1024, y);
                ctx.stroke();
            }

            const margin = 40;
            ctx.save();
            ctx.lineWidth = 24;
            ctx.strokeStyle = '#e67e22';
            ctx.setLineDash([24, 24]);
            ctx.strokeRect(margin, margin, 1024 - margin * 2, 1024 - margin * 2);
            ctx.restore();

            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 6;
            ctx.strokeRect(margin + 30, margin + 30, 1024 - (margin + 30) * 2, 1024 - (margin + 30) * 2);

            ctx.save();
            ctx.lineWidth = 12;
            ctx.strokeStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(512, 512, 180, 0, Math.PI * 2);
            ctx.stroke();

            ctx.lineWidth = 4;
            ctx.strokeStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(512, 512, 200, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(231, 76, 60, 0.12)';
            ctx.beginPath();
            ctx.arc(512, 512, 180, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.font = '900 48px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('BUMPER ARENA', 512, 512);
            ctx.restore();

            return new THREE.CanvasTexture(canvas);
        }

function createCornerLightTower(x, z) {
            const towerGroup = new THREE.Group();

            const poleGeo = new THREE.CylinderGeometry(0.6, 0.8, 22, 8);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.7, roughness: 0.3 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.y = 11;
            towerGroup.add(pole);

            const frameGeo = new THREE.BoxGeometry(6, 3, 1.5);
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e1e2f });
            const frame = new THREE.Mesh(frameGeo, frameMat);
            frame.position.set(0, 22, 0);
            towerGroup.add(frame);

            const lightPanelGeo = new THREE.BoxGeometry(5.2, 2.2, 0.4);
            const lightPanelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const lightPanel = new THREE.Mesh(lightPanelGeo, lightPanelMat);
            lightPanel.position.set(0, 22, 0.6);
            towerGroup.add(lightPanel);

            const spot = new THREE.PointLight(0xfff5e6, 1.2, 100);
            spot.position.set(0, 22, 2);
            towerGroup.add(spot);

            towerGroup.position.set(x, 0, z);
            towerGroup.lookAt(0, 5, 0);
            scene.add(towerGroup);
        }

function createMazeWall(x, z, w, d) {
            const wallHeight = 5.0;
            const group = new THREE.Group();

            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), mazeWallMat);
            mesh.position.y = wallHeight / 2;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);

            const cap = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mazeCapMat);
            cap.position.y = wallHeight + 0.1;
            group.add(cap);

            group.position.set(x, 0, z);
            scene.add(group);

            const halfW = w / 2;
            const halfD = d / 2;
            mazeWalls.push({
                minX: x - halfW,
                maxX: x + halfW,
                minZ: z - halfD,
                maxZ: z + halfD
            });
        }

function isInsideMazeWall(x, z, padding = 3) {
            return mazeWalls.some(w => 
                x >= w.minX - padding && x <= w.maxX + padding &&
                z >= w.minZ - padding && z <= w.maxZ + padding
            );
        }

function getSafeSpawnPosition(preferredX, preferredZ, padding = 4.0) {
            if (!isInsideMazeWall(preferredX, preferredZ, padding)) {
                return new THREE.Vector3(preferredX, 0, preferredZ);
            }
            let posX = preferredX, posZ = preferredZ;
            let tries = 0;
            const maxBound = (arenaSize / 2) - 10;
            do {
                posX = (Math.random() - 0.5) * (maxBound * 2);
                posZ = (Math.random() - 0.5) * (maxBound * 2);
                tries++;
            } while (isInsideMazeWall(posX, posZ, padding) && tries < 100);
            return new THREE.Vector3(posX, 0, posZ);
        }

function handleMazeCollisions(entity, prevPos = null) {
            // Treat each vehicle as a circle in the X/Z plane and each maze wall
            // as an axis-aligned rectangle. Resolve penetration directly instead
            // of simply restoring the previous position.
            const radius = 1.8;
            const epsilon = 0.02;

            for (const wall of mazeWalls) {
                const closestX = Math.max(wall.minX, Math.min(entity.position.x, wall.maxX));
                const closestZ = Math.max(wall.minZ, Math.min(entity.position.z, wall.maxZ));

                let distX = entity.position.x - closestX;
                let distZ = entity.position.z - closestZ;
                const distSq = distX * distX + distZ * distZ;

                if (distSq < radius * radius) {
                    let normalX = 0;
                    let normalZ = 0;
                    let dist = Math.sqrt(distSq);

                    if (dist > 0.0001) {
                        // Vehicle is outside the rectangle and touching a face/corner.
                        normalX = distX / dist;
                        normalZ = distZ / dist;
                    } else {
                        // Vehicle center is already inside the wall. Pick the nearest
                        // wall face and push the vehicle completely outside it.
                        const left = Math.abs(entity.position.x - wall.minX);
                        const right = Math.abs(wall.maxX - entity.position.x);
                        const top = Math.abs(entity.position.z - wall.minZ);
                        const bottom = Math.abs(wall.maxZ - entity.position.z);
                        const nearest = Math.min(left, right, top, bottom);

                        if (nearest === left) {
                            normalX = -1;
                            dist = left;
                        } else if (nearest === right) {
                            normalX = 1;
                            dist = right;
                        } else if (nearest === top) {
                            normalZ = -1;
                            dist = top;
                        } else {
                            normalZ = 1;
                            dist = bottom;
                        }
                    }

                    const pushDistance = Math.max(radius - dist, 0) + epsilon;
                    entity.position.x += normalX * pushDistance;
                    entity.position.z += normalZ * pushDistance;

                    // Remove knockback velocity pointing into the wall so the next
                    // frame cannot immediately drive the vehicle back through it.
                    if (entity.userData.knockback) {
                        const intoWall = entity.userData.knockback.x * normalX +
                                         entity.userData.knockback.z * normalZ;
                        if (intoWall < 0) {
                            entity.userData.knockback.x -= normalX * intoWall;
                            entity.userData.knockback.z -= normalZ * intoWall;
                        }
                        entity.userData.knockback.addScaledVector(
                            new THREE.Vector3(normalX, 0, normalZ), 0.15
                        );
                    }
                }
            }

            // Keep the vehicle inside the arena after wall resolution.
            const boundWithRadius = bound - radius - epsilon;
            entity.position.x = Math.max(-boundWithRadius, Math.min(boundWithRadius, entity.position.x));
            entity.position.z = Math.max(-boundWithRadius, Math.min(boundWithRadius, entity.position.z));
        }
