/**
 * Audio Relay Server
 *
 * Accepts WebSocket connections from the admin "Go Live" screen,
 * receives binary audio chunks (WebM/Opus from MediaRecorder on web,
 * or raw PCM from expo-av on native), and pipes them through ffmpeg
 * into the local Nginx-RTMP server.
 *
 * Usage:  node audio-relay.js
 * Listens on port 3001 (WebSocket).
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');

const PORT = 3001;
const RTMP_URL = 'rtmp://127.0.0.1:1935/live/stream';

const wss = new WebSocket.Server({ port: PORT });

// Only allow one active stream at a time
let activeStream = null;

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[relay] Client connected from ${clientIp}`);

  if (activeStream) {
    console.log('[relay] Rejected connection — another stream is already active');
    ws.close(4001, 'Another stream is already active');
    return;
  }

  // The first message is a JSON config packet that tells us the input format.
  // Subsequent messages are binary audio data.
  let ffmpeg = null;
  let inputFormat = null;
  let configured = false;

  function startFfmpeg(format) {
    const args = format === 'pcm'
      ? [
          // expo-av on native sends raw PCM (16-bit LE, 44100 Hz, mono)
          '-f', 's16le',
          '-ar', '44100',
          '-ac', '1',
          '-i', 'pipe:0',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-f', 'flv',
          RTMP_URL,
        ]
      : [
          // Web MediaRecorder sends WebM/Opus
          '-f', 'webm',
          '-i', 'pipe:0',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-f', 'flv',
          RTMP_URL,
        ];

    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });

    proc.stderr.on('data', (d) => {
      const line = d.toString().trim();
      if (line) console.log(`[ffmpeg] ${line}`);
    });

    proc.on('error', (err) => {
      console.error('[ffmpeg] spawn error:', err.message);
      cleanup();
    });

    proc.on('close', (code) => {
      console.log(`[ffmpeg] exited with code ${code}`);
      cleanup();
    });

    return proc;
  }

  function cleanup() {
    if (activeStream === ws) {
      activeStream = null;
    }
    if (ffmpeg) {
      try { ffmpeg.stdin.end(); } catch (_) {}
      try { ffmpeg.kill('SIGTERM'); } catch (_) {}
      ffmpeg = null;
    }
  }

  activeStream = ws;

  ws.on('message', (data) => {
    // First message: JSON config like { "format": "webm" } or { "format": "pcm" }
    if (!configured) {
      try {
        const config = JSON.parse(data.toString());
        inputFormat = config.format || 'webm';
        console.log(`[relay] Input format: ${inputFormat}`);
        ffmpeg = startFfmpeg(inputFormat);
        configured = true;
        ws.send(JSON.stringify({ status: 'ok', message: 'Streaming started' }));
        return;
      } catch (_) {
        // Not JSON — assume webm and treat this as audio data
        inputFormat = 'webm';
        ffmpeg = startFfmpeg(inputFormat);
        configured = true;
        console.log('[relay] No config message, defaulting to webm');
      }
    }

    // Binary audio data
    if (ffmpeg && ffmpeg.stdin.writable) {
      ffmpeg.stdin.write(Buffer.isBuffer(data) ? data : Buffer.from(data));
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[relay] Client disconnected (code=${code})`);
    cleanup();
  });

  ws.on('error', (err) => {
    console.error('[relay] WebSocket error:', err.message);
    cleanup();
  });
});

console.log(`[relay] Audio relay server listening on ws://0.0.0.0:${PORT}`);
