// V69 network state adapter. Loaded after the core game scripts.
(() => {
    let accumulator = 0;
    const INTERVAL = 1 / 15;

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
            health: Number.isFinite(obj.userData?.health) ? obj.userData.health : null
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

    window.onOnlineState = function(state, from) {
        if (!state) return;
        const remote = (typeof window.getOnlineRemotePlayer === 'function')
            ? window.getOnlineRemotePlayer(from) : null;
        if (!remote) return;

        if (remote.position && state.x != null) {
            remote.position.x = state.x;
            remote.position.y = state.y;
            remote.position.z = state.z;
        }
        if (remote.rotation && state.ry != null) {
            remote.rotation.x = state.rx || 0;
            remote.rotation.y = state.ry || 0;
            remote.rotation.z = state.rz || 0;
        }
        if (remote.userData && state.health != null) {
            remote.userData.health = state.health;
        }
    };

    // Reliable gameplay action channel for effects that cannot be
    // represented safely by independent client-side physics.
    window.onOnlineAction = function(action, from) {
        if (!action || action.type !== 'grappleHit') return;
        if (window.__bumperOnlineMatch !== true) return;

        const local = (typeof window.getOnlineLocalPlayer === 'function')
            ? window.getOnlineLocalPlayer() : null;
        const remote = (typeof window.getOnlineRemotePlayer === 'function')
            ? window.getOnlineRemotePlayer(from) : null;

        if (!local || !remote || local.userData.isDead) return;

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
