// V76: authoritative client-side role used by the camera.
// Host = Player 1, guest = Player 2.
window.onlineIsHost = false;

// V69 — Online 1v1 networking
(() => {
    const ONLINE_SERVER_URL =
        window.WEAPON_MAYHEM_ONLINE_SERVER ||
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname || 'localhost'}:8080`;

    let socket = null;
    let roomId = null;
    let role = null;
    let connected = false;
    let matchStarted = false;
    let reconnectTimer = null;

    const $ = id => document.getElementById(id);

    function status(message, color = '#f1c40f') {
        const el = $('online-room-status');
        if (el) {
            el.textContent = message;
            el.style.color = color;
        }
    }

    function error(message) {
        const el = $('online-error');
        if (el) {
            el.textContent = message;
            el.style.display = message ? 'block' : 'none';
        }
    }

    function roomLink(id) {
        const u = new URL(location.href);
        u.searchParams.set('room', id);
        return u.toString();
    }

    function connect() {
        return new Promise((resolve, reject) => {
            try {
                socket = new WebSocket(ONLINE_SERVER_URL);
            } catch (e) {
                reject(e);
                return;
            }

            let settled = false;
            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    try { socket.close(); } catch {}
                    reject(new Error('Timed out connecting to the multiplayer server.'));
                }
            }, 8000);

            socket.addEventListener('open', () => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    connected = true;
                    resolve();
                }
            }, { once: true });

            socket.addEventListener('error', () => {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    reject(new Error('Could not connect to the multiplayer server.'));
                }
            }, { once: true });

            socket.addEventListener('close', () => {
                connected = false;
                if (matchStarted) {
                    status('Connection lost. Trying to reconnect...', '#e67e22');
                    scheduleReconnect();
                }
            });

            socket.addEventListener('message', e => {
                let msg;
                try { msg = JSON.parse(e.data); } catch { return; }

                if (msg.type === 'roomCreated') {
                    roomId = msg.roomId;
                    role = 'host';
                    $('online-room-created').style.display = 'block';
                    $('online-room-link').value = roomLink(roomId);
                    status('Waiting for opponent...');
                    return;
                }

                if (msg.type === 'peerJoined') {
                    role = 'host';
                    status('Opponent connected! Starting 1v1...', '#2ecc71');
                    beginMatch(true);
                    return;
                }

                if (msg.type === 'joinedRoom') {
                    roomId = msg.roomId;
                    role = 'guest';
                    status('Connected to room. Starting 1v1...', '#2ecc71');
                    beginMatch(false);
                    return;
                }

                if (msg.type === 'joinFailed') {
                    error(msg.reason || 'Room is unavailable.');
                    return;
                }

                if (msg.type === 'peerDisconnected') {
                    connected = false;
                    matchStarted = false;
                    status('Opponent disconnected.', '#e74c3c');
                    return;
                }

                if (msg.type === 'input') {
                    window.onOnlineInput?.(msg.payload, msg.from);
                } else if (msg.type === 'state') {
                    window.onOnlineState?.(msg.payload, msg.from);
                } else if (msg.type === 'action') {
                    window.onOnlineAction?.(msg.payload, msg.from);
                }
            });
        });
    }

    function scheduleReconnect() {
        if (reconnectTimer || !roomId) return;
        reconnectTimer = setTimeout(async () => {
            reconnectTimer = null;
            try {
                await connect();
                socket.send(JSON.stringify({ type: 'joinRoom', roomId }));
            } catch {
                scheduleReconnect();
            }
        }, 2000);
    }

    function send(type, payload) {
        if (!socket || socket.readyState !== WebSocket.OPEN || !roomId) return;
        socket.send(JSON.stringify({ type, roomId, payload }));
    }

    function beginMatch(isHost) {
        matchStarted = true;
        const select = $('game-mode');
        // Keep the menu selection as Online Multiplayer; startGame() maps
        // the 'online' UI value to the existing onevone gameplay/camera path.

        if (typeof window.enterOnlineMode === 'function') {
            window.enterOnlineMode(isHost);
        }
    }

    async function createRoom() {
        error('');
        try {
            if (!socket || socket.readyState !== WebSocket.OPEN) await connect();
            socket.send(JSON.stringify({ type: 'createRoom' }));
        } catch (e) {
            error(e.message + ' Make sure the multiplayer server is running.');
        }
    }

    async function joinRoom(id) {
        error('');
        try {
            if (!socket || socket.readyState !== WebSocket.OPEN) await connect();
            socket.send(JSON.stringify({ type: 'joinRoom', roomId: id }));
        } catch (e) {
            error(e.message + ' Make sure the multiplayer server is running.');
        }
    }

    window.sendOnlineInput = payload => send('input', payload);
    window.sendOnlineState = payload => send('state', payload);
    window.sendOnlineAction = payload => send('action', payload);

    $('create-online-room-btn')?.addEventListener('click', createRoom);

    $('copy-online-link-btn')?.addEventListener('click', async () => {
        const input = $('online-room-link');
        if (!input?.value) return;
        try {
            await navigator.clipboard.writeText(input.value);
        } catch {
            input.select();
            document.execCommand('copy');
        }
        status('Link copied! Send it to your opponent.', '#2ecc71');
    });

    const mode = $('game-mode');
    const panel = $('online-panel');
    mode?.addEventListener('change', () => {
        if (panel) panel.style.display = mode.value === 'online' ? 'block' : 'none';
    });

    const incomingRoom = new URLSearchParams(location.search).get('room');
    if (incomingRoom) {
        const overlay = $('online-join-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            $('join-online-room-btn')?.addEventListener('click', () => {
                overlay.style.display = 'none';
                if (mode) mode.value = 'online';
                if (panel) panel.style.display = 'block';
                joinRoom(incomingRoom);
            });
            $('cancel-online-join-btn')?.addEventListener('click', () => {
                overlay.style.display = 'none';
            });
        }
    }

    window.weaponMayhemOnline = {
        createRoom,
        joinRoom,
        send
    };
})();

// V76 role setter. Host is Player 1; guest is Player 2.
window.setOnlineRole = function(host) {
    window.onlineIsHost = !!host;
};
