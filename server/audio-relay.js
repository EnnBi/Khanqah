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
const { spawn, execSync } = require("child_process");

// Ensure HLS output directory exists (survives reboots that wipe /tmp)
try { execSync("mkdir -p /tmp/hls"); } catch (_) {}

const PORT = 3001;
const HLS_URL = "/tmp/hls/stream.m3u8";
const RTMP_URL = "rtmp://127.0.0.1:1935/live/stream";

// How often to ping clients so we can detect dead connections that the OS
// hasn't closed for us. If a client misses a pong we treat the socket as
// dead and free the activeStream slot — otherwise a silent disconnect
// (tab crash behind nginx's hour-long proxy_read_timeout) jams the relay
// until the process is restarted.
const PING_MS = 15_000;

// If a connected client hasn't sent any data within this window, assume
// it's dead and tear it down so a new broadcaster can claim the slot.
const IDLE_MS = 45_000;

const ALLOWED_SAMPLE_RATES = [8000, 16000, 22050, 44100, 48000];

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

  let ffmpeg = null;
  let inputFormat = null;
  let configured = false;
  let lastDataAt = Date.now();
  let pongReceived = true;
  let pingInterval = null;
  let idleInterval = null;

  function startFfmpeg(format, sampleRate) {
    const lowLatencyInput = ['-fflags', 'nobuffer', '-flags', 'low_delay'];
    const lowLatencyOutput = ['-flush_packets', '1'];

    const args = format === 'pcm'
      ? [
          ...lowLatencyInput,
          '-f', 's16le',
          '-ar', String(sampleRate),
          '-ac', '1',
          '-i', 'pipe:0',
          '-c:a', 'aac',
          '-b:a', '128k',
          ...lowLatencyOutput,
          // Audio-only HLS direct. Bypasses nginx-rtmp's HLS muxer
          // which adds a phantom 0x0 h264 video track on audio-only
          // RTMP input — that phantom track stalls Android playback.
          '-vn',
          '-f', 'hls',
          '-hls_time', '2',
          '-hls_list_size', '15',
          '-hls_flags', 'delete_segments+append_list+omit_endlist',
          '-hls_segment_filename', '/tmp/hls/stream-%d.ts',
          HLS_URL,
        ]
      : [
          ...lowLatencyInput,
          '-f', 'webm',
          '-i', 'pipe:0',
          '-c:a', 'aac',
          '-b:a', '128k',
          ...lowLatencyOutput,
          '-vn',
          '-f', 'hls',
          '-hls_time', '2',
          '-hls_list_size', '15',
          '-hls_flags', 'delete_segments+append_list+omit_endlist',
          '-hls_segment_filename', '/tmp/hls/stream-%d.ts',
          HLS_URL,
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
      if (code !== 0 && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ status: 'error', message: `ffmpeg exited (code ${code})` }));
        } catch (_) {}
      }
      cleanup();
    });

    return proc;
  }

  function cleanup() {
    if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
    if (idleInterval) { clearInterval(idleInterval); idleInterval = null; }
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

  // Heartbeat: ping every PING_MS; if no pong by the next tick, terminate
  // the socket so a dead client can't keep the slot.
  pingInterval = setInterval(() => {
    if (!pongReceived) {
      console.log('[relay] Client missed pong — terminating');
      try { ws.terminate(); } catch (_) {}
      cleanup();
      return;
    }
    pongReceived = false;
    try { ws.ping(); } catch (_) {}
  }, PING_MS);

  // Idle-data watchdog: if the client connected but never sends audio
  // (or stops sending for IDLE_MS), reclaim the slot.
  idleInterval = setInterval(() => {
    if (Date.now() - lastDataAt > IDLE_MS) {
      console.log('[relay] Client idle too long — terminating');
      try { ws.close(4002, 'Idle timeout'); } catch (_) {}
      cleanup();
    }
  }, Math.max(5_000, Math.floor(IDLE_MS / 2)));

  ws.on('pong', () => { pongReceived = true; });

  ws.on('message', (data) => {
    lastDataAt = Date.now();

    if (!configured) {
      let format = 'webm';
      let sampleRate = 44100;
      try {
        const config = JSON.parse(data.toString());
        if (config.format === 'pcm' || config.format === 'webm') {
          format = config.format;
        }
        if (
          typeof config.sampleRate === 'number' &&
          ALLOWED_SAMPLE_RATES.includes(config.sampleRate)
        ) {
          sampleRate = config.sampleRate;
        }
      } catch (_) {
        console.log('[relay] No config message, defaulting to webm');
      }
      inputFormat = format;
      if (inputFormat === 'pcm') {
        console.log(`[relay] Input format: pcm, sample rate: ${sampleRate}`);
      } else {
        console.log(`[relay] Input format: ${inputFormat}`);
      }
      ffmpeg = startFfmpeg(inputFormat, sampleRate);
      configured = true;
      ws.send(JSON.stringify({ status: 'ok', message: 'Streaming started' }));
      return;
    }

    if (ffmpeg && ffmpeg.stdin.writable) {
      ffmpeg.stdin.write(Buffer.isBuffer(data) ? data : Buffer.from(data));
    }
  });

  ws.on('close', (code) => {
    console.log(`[relay] Client disconnected (code=${code})`);
    cleanup();
  });

  ws.on('error', (err) => {
    console.error('[relay] WebSocket error:', err.message);
    cleanup();
  });
});

console.log(`[relay] Audio relay server listening on ws://0.0.0.0:${PORT}`);
