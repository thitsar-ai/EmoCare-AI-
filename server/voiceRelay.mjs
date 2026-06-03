/**
 * Local dev voice relay for EmoCare Voice Talk.
 * Protocol-compatible with VoiceStreamClient (start / audio / barge_in / stop).
 *
 * Usage:
 *   npm run voice-server
 *   EXPO_PUBLIC_VOICE_WS_URL=ws://localhost:8787/stream  (iOS simulator)
 *   EXPO_PUBLIC_VOICE_WS_URL=ws://YOUR_LAN_IP:8787/stream (physical device)
 */
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.VOICE_RELAY_PORT || 8787);

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('EmoCare voice relay running. Connect via ws://HOST:8787/stream\n');
});

const wss = new WebSocketServer({ server: httpServer, path: '/stream' });

wss.on('connection', (ws) => {
  let turnId = `${Date.now()}`;

  ws.send(JSON.stringify({ type: 'intent', mode: 'sanctuary' }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      if (msg.type === 'start') {
        turnId = msg.turnId || turnId;
        ws.send(JSON.stringify({ type: 'intent', mode: 'sanctuary' }));
        ws.send(JSON.stringify({
          type: 'transcript',
          text: 'Emo is listening.',
          isFinal: false,
        }));
      }
      if (msg.type === 'barge_in') {
        turnId = msg.turnId || `${Date.now()}`;
      }
      if (msg.type === 'stop') {
        ws.close();
      }
    } catch {
      // ignore malformed frames
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`EmoCare voice relay listening on ws://0.0.0.0:${PORT}/stream`);
});
