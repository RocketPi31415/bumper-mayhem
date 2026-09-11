// V85 network state adapter. Loaded after the core game scripts.
(() => {
    let accumulator = 0;
    const INTERVAL = 1 / 15;
    // Kill events are reliable, one-time events. Keep a small dedupe cache so
    // reconnects or duplicate packets cannot award the same kill twice.
    const processedKillEvents = new Set();

    function num(v) {
        return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : 0;
    }

    function snapshot(obj) {
        if (!obj) return null;
        const p = obj.position;
        const r = obj.rotation;
        return {
            x: num(p?.x), y: num(p?.y), z: num(p?.z),
            rx: num(r?.x), ry: num(r?.y), rz: num(r?.z),
            health: Number.isFinite(obj.userData?.health) ? obj.userData.health : null,
            isDead: !!obj.userData?.isDead,
            isStarActive: !!obj.userData?.isStarActive,
            starTimer: Number.isFinite(obj.userData?.starTimer) ? obj.userData.starTimer : 0,
            spawnInvincibleTimer: Number.isFinite(obj.userData?.spawnInvincibleTimer) ? obj.userData.spawnInvincibleTimer : 0,
            chargingNuke: !!obj.userData?.chargingNuke,
            nukeChargeTime: Number.isFinite(obj.userData?.nukeChargeTime) ? obj.userData.nukeChargeTime : 0,
            targetNukeCharge: Number.isFinite(obj.userData?.targetNukeCharge) ? obj.userData.targetNukeCharge : 5
        };
    }

    // Host drives `player` locally (WASD) and treats `player2` as the network peer.
    // Guest drives `player2` locally (arrow keys) and treats `player` as the network peer.
    window.getOnlineLocalPlayer = function() {
        if (typeof player !== 'undefined' && player.userData &&
            (player.userData.onlineRole === 'host' || player.userData.onlineRole === 'local')) {
            return player;
        }
        if (typeof player2 !== 'undefined' && player2.userData &&
            (player2.userData.onlineRole === 'host' || player2.userData.onlineRole === 'local')) {
            return player2;
        }
        return null;
    };

    window.getOnlineRemotePlayer = function(from) {
        if (typeof player !== 'undefined' && player.userData &&
            (player.userData.onlineRole === 'remote' || player.userData.onlineRole === 'guest')) {
            return player;
        }
        if (typeof player2 !== 'undefined' && player2.userData &&
            (player2.userData.onlineRole === 'remote' || player2.userData.onlineRole === 'guest')) {
            return player2;
        }
        return null;
    };

    window.getOnlineLocalSlot = function() {
        return window.onlineIsHost === true ? 'p1' : 'p2';
    };

    function resetRemoteDeathState(remote) {
        if (!remote || !remote.userData) return;
        remote.userData.isDead = true;
        remote.userData.health = 0;
        remote.userData.spawnInvincibleTimer = 0;
        remote.userData.spawnInvincibleUntil = 0;
        remote.userData.stunTimer = 0;
        remote.userData.dragState = null;
        remote.userData.shieldTimer = 0;
        remote.userData.nitroTimer = 0;
        remote.userData.chargingNuke = false;
        remote.userData.nukeChargeTime = 0;
        remote.userData.isStarActive = false;
        remote.userData.starTimer = 0;
        remote.userData.starStartedAt = 0;
        remote.userData.starExpiresAt = 0;
        remote.visible = false;
        remote.position.set(0, -500, 0);
    }

    function syncRemoteRespawn(remote, state) {
        if (!remote || !remote.userData) return;
        remote.userData.isDead = false;
        remote.userData.health = Number.isFinite(state.health) ? state.health : 100;
        remote.visible = true;
    }

    window.onOnlineState = function(state, from) {
        if (!state) return;
        const remote = (typeof window.getOnlineRemotePlayer === 'function')
            ? window.getOnlineRemotePlayer(from) : null;
        if (!remote) return;

        // V88: never move a dead remote back into the arena from a stale
        // position snapshot. A respawn snapshot is allowed to restore it.
        if (remote.position && state.x != null && !state.isDead) {
            remote.position.x = state.x;
            remote.position.y = state.y;
            remote.position.z = state.z;
        }
        if (remote.rotation && state.ry != null) {
            remote.rotation.x = state.rx || 0;
            remote.rotation.y = state.ry || 0;
            remote.rotation.z = state.rz || 0;
        }
        if (remote.userData && state.health != null && !state.isDead) {
            remote.userData.health = state.health;
        }

        if (remote.userData) {
            const wasDead = !!remote.userData.isDead;
            const wasStarActive = !!remote.userData.isStarActive;

            if (state.isDead) {
                resetRemoteDeathState(remote);
                return;
            }

            // V88: a dead remote is not resurrected by an ordinary state
            // snapshot. Respawn is an explicit reliable action, preventing
            // stale pre-death packets from bringing the player back early.
            if (!wasDead && remote.visible === false) {
                remote.visible = false;
            }
            remote.userData.isStarActive = !!state.isStarActive;
            remote.userData.starTimer = Math.max(0, Number(state.starTimer) || 0);
            if (remote.userData.isStarActive && !wasStarActive) {
                remote.userData.starStartedAt = performance.now() -
                    Math.max(0, 180 - remote.userData.starTimer) * (1000 / 60);
                remote.userData.starExpiresAt = remote.userData.starStartedAt + 3000;
            } else if (!remote.userData.isStarActive) {
                remote.userData.starStartedAt = 0;
                remote.userData.starExpiresAt = 0;
            }
            // Remote spawn protection is driven by the remote snapshot.
            // The local player's timer is never overwritten here.
            remote.userData.spawnInvincibleTimer = Math.max(0, Number(state.spawnInvincibleTimer) || 0);
            remote.userData.chargingNuke = !!state.chargingNuke;
            remote.userData.nukeChargeTime = Math.max(0, Number(state.nukeChargeTime) || 0);
            remote.userData.targetNukeCharge = Math.max(0, Number(state.targetNukeCharge) || 5);
        }
    };

    // Reliable gameplay action channel for effects that cannot be
    // represented safely by independent client-side physics.
    window.onOnlineAction = function(action, from) {
        if (!action || window.__bumperOnlineMatch !== true) return;

        const local = (typeof window.getOnlineLocalPlayer === 'function')
            ? window.getOnlineLocalPlayer() : null;
        const remote = (typeof window.getOnlineRemotePlayer === 'function')
            ? window.getOnlineRemotePlayer(from) : null;

        if (!local || !remote) return;

        if (action.type === 'playerRespawn') {
            const localSlot = window.getOnlineLocalSlot();
            const targetSlot = action.targetSlot;

            if (targetSlot !== 'p1' && targetSlot !== 'p2') return;

            if (targetSlot === localSlot) {
                // Normally the local client already respawned itself.
                // Do not restart its countdown or otherwise alter local state.
                return;
            }

            // Explicitly restore only the opponent after their own respawn.
            syncRemoteRespawn(remote, {
                health: 100
            });
            return;
        }

        if (action.type === 'playerDeath') {
            const localSlot = window.getOnlineLocalSlot();
            const targetSlot = action.targetSlot;

            if (targetSlot !== 'p1' && targetSlot !== 'p2') return;

            // V89: the victim's client determines who got the kill and sends
            // that result once. The other client applies the same score event
            // instead of calculating its own local score.
            const killerSlot = action.killerSlot;
            const eventId = String(action.eventId || (
                targetSlot + ':' + (killerSlot || 'unknown')
            ));

            if (killerSlot === 'p1' || killerSlot === 'p2') {
                if (!processedKillEvents.has(eventId)) {
                    processedKillEvents.add(eventId);
                    if (killerSlot === 'p1') playerKills++;
                    else player2Kills++;
                    updatePlayerUI();
                }
            }

            // If the dead player is local, run the normal local death flow so
            // only that player sees the respawn countdown.
            if (targetSlot === localSlot) {
                if (!local.userData.isDead) {
                    killPlayer(local, { fromNetwork: true });
                }
            } else {
                // Otherwise this is the opponent. Hide them and keep them
                // completely inactive without showing a local overlay.
                resetRemoteDeathState(remote);
            }
            return;
        }

        if (action.type === 'weaponGranted') {
            const weapon = action.weapon;
            if (!weapon || !Array.isArray(WEAPONS) || !WEAPONS.includes(weapon)) return;

            // Mirror the crate result onto the remote player's representation.
            remote.userData.grappleCount = Number.isFinite(action.grappleCount)
                ? action.grappleCount : 3;
            window.__receivingOnlineWeaponAction = true;
            try {
                setWeapon(weapon, remote);
            } finally {
                window.__receivingOnlineWeaponAction = false;
            }
            return;
        }

        if (action.type === 'weaponUse') {
            const weapon = action.weapon;
            if (!weapon || !Array.isArray(WEAPONS) || !WEAPONS.includes(weapon)) return;
            if (remote.userData.isDead) return;

            // Give the remote representation the exact same weapon before
            // invoking the normal weapon implementation.
            remote.userData.grappleCount = Number.isFinite(action.grappleCount)
                ? action.grappleCount : remote.userData.grappleCount;
            if (weapon === 'grapple' && !Number.isFinite(remote.userData.grappleCount)) {
                remote.userData.grappleCount = 3;
            }

            if (weapon === 'nuke') {
                remote.userData.nukeChargeTime = Number.isFinite(action.nukeChargeTime)
                    ? Math.max(0, action.nukeChargeTime) : 0;
                remote.userData.chargingNuke = true;
            }

            window.__receivingOnlineWeaponAction = true;
            try {
                setWeapon(weapon, remote);
                useWeapon(remote);
            } finally {
                window.__receivingOnlineWeaponAction = false;
            }
            return;
        }

        if (action.type === 'grappleHit') {
            if (local.userData.isDead) return;

            // Apply the hit once, on the target's own client.
            if (Number.isFinite(action.damage)) {
                applyDamage(local, action.damage, remote);
            }

            if (!local.userData.isDead) {
                local.userData.stunTimer = Number.isFinite(action.stun) ? action.stun : 90;
                local.userData.dragState = {
                    puller: remote,
                    speed: Number.isFinite(action.speed) ? action.speed : 0.16
                };
            }
            return;
        }

    };

    window.updateOnlineState = function(dt) {
        if (typeof window.sendOnlineState !== 'function') return;
        if (!document.hidden) {
            accumulator += Math.min(dt || 0, 0.1);
            if (accumulator >= INTERVAL) {
                accumulator = 0;
                const local = (typeof window.getOnlineLocalPlayer === 'function')
                    ? window.getOnlineLocalPlayer() : null;
                if (local) window.sendOnlineState(snapshot(local));
            }
        }
    };
})();
