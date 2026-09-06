// V69 online multiplayer signaling + authoritative relay server
// Node.js 18+ recommended. Install: npm install
// Run: npm start
//
// The browser client uses this server to create/join private 1v1 rooms.
// The server relays player input/state messages between the two peers.

const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const rooms = new Map();

function makeRoomId() {
  let id;
  do {
    id = crypto.randomBytes(4).toString('hex');
  } while (rooms.has(id));
  return id;
}

function send(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Weapon Mayhem online server is running.');
});

const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws) => {
  ws.roomId = null;
  ws.slot = null;

  send(ws, { type: 'welcome' });

  ws.on('message', raw => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'createRoom') {
      const roomId = makeRoomId();
      rooms.set(roomId, { host: ws, guest: null });
      ws.roomId = roomId;
      ws.slot = 'host';
      send(ws, { type: 'roomCreated', roomId });
      return;
    }

    if (msg.type === 'joinRoom') {
      const room = rooms.get(String(msg.roomId || '').toLowerCase());
      if (!room || room.guest) {
        send(ws, { type: 'joinFailed', reason: 'Room not found or already full.' });
        return;
      }

      room.guest = ws;
      ws.roomId = String(msg.roomId).toLowerCase();
      ws.slot = 'guest';

      send(room.host, { type: 'peerJoined' });
      send(ws, { type: 'joinedRoom', roomId: ws.roomId });
      return;
    }

    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;

    if (msg.type === 'signal' || msg.type === 'input' || msg.type === 'state' || msg.type === 'action') {
      const peer = ws === room.host ? room.guest : room.host;
      if (peer) {
        send(peer, { ...msg, from: ws.slot });
      }
    }
  });

  ws.on('close', () => {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;

    const peer = ws === room.host ? room.guest : room.host;
    if (peer) {
      send(peer, { type: 'peerDisconnected' });
      peer.roomId = null;
      peer.slot = null;
    }
    rooms.delete(ws.roomId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Weapon Mayhem online server listening on port ${PORT}`);
});
