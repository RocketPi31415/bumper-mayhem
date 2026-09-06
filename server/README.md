# Weapon Mayhem online server

This server provides private-room links for the browser game's 1v1 online mode.

## Run locally

```bash
npm install
npm start
```

Default port: `8080`.

For players on the public internet, host this server on a reachable HTTPS/WSS-capable service
and set the browser game's `ONLINE_SERVER_URL` to its `wss://...` endpoint.

The browser game is not able to create a working internet room from a static local HTML file
alone; a signaling/relay server is required.
