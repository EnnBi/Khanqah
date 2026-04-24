# Native Broadcast Design (Android + iOS + Web)

**Date:** 2026-04-24
**Status:** Draft, awaiting approval
**Related:** extends `2026-04-23-live-broadcast-hardening-design.md`

## Goal

Admins can start a live audio broadcast from **web, Android, and iOS**. Today only web works; native crashes with `Cannot read property 'getUserMedia' of undefined`. Listener side is already cross-platform and stays untouched.

## Constraints

- Broadcast must keep running when the screen is locked or the app is backgrounded.
- Must auto-resume after audio interruption (phone call, Siri, another app taking the mic).
- Keep existing HLS listener pipeline (nginx-rtmp → `.m3u8` served from DigitalOcean box). No changes on the listener side.
- Minimize new native code. Prefer extending the existing server+client pipeline over replacing it with WebRTC.

## Non-goals

- Low-latency (< 1 s) interactive audio. Current pipeline is ~4–6 s glass-to-glass and that is acceptable for one-way bayaans. If sub-second latency is wanted later, migrate to WebRTC as a separate project.
- Authenticated relay. Current relay accepts any WebSocket connection; hardening this is tracked separately.
- Video broadcast.

## Architecture

```
                   ┌──────────────────────────┐
                   │ lib/broadcast.ts         │  shared orchestrator
                   │   (session row, WS,      │  runs on all platforms
                   │    heartbeats, errors)   │
                   └────────────┬─────────────┘
                                │ MicSource interface
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
    ┌────────────────┐                     ┌──────────────────────┐
    │ lib/mic.web.ts │                     │ lib/mic.native.ts    │
    │  MediaRecorder │                     │  react-native-audio- │
    │  → WebM/Opus   │                     │  record + custom     │
    │                │                     │  Android FG service  │
    └────────┬───────┘                     └──────────┬───────────┘
             │ {format:"webm"}                        │ {format:"pcm", sampleRate:16000}
             │ binary WebM chunks                     │ s16le mono chunks
             ▼                                        ▼
                      ┌──────────────────────────┐
                      │  audio-relay.js (DO box) │
                      │   ffmpeg → RTMP → HLS    │
                      └──────────────────────────┘
                                     │
                                     ▼
                    Existing HLS listener (Shaka on web,
                     expo-av on native)
```

Metro's platform-extension resolution picks `mic.web.ts` for web builds and `mic.native.ts` for native builds automatically. No runtime `Platform.OS` branching in `broadcast.ts`.

## Wire format

Unchanged from today except the PCM branch now specifies sample rate:

**Web (first frame)**
```json
{ "format": "webm" }
```
followed by binary WebM/Opus chunks.

**Native (first frame)**
```json
{ "format": "pcm", "sampleRate": 16000 }
```
followed by raw `s16le` mono PCM chunks.

## Client changes

### Files added

| File | Purpose |
|---|---|
| `lib/mic.ts` | Defines `MicSource` interface: `start(opts) → Promise<void>`, `stop()`, `onChunk(cb)`, `onError(cb)`, `onInterruption(cb)`. |
| `lib/mic.web.ts` | Wraps `navigator.mediaDevices.getUserMedia` + `MediaRecorder`. Extracted from the current `broadcast.ts` MediaRecorder block. |
| `lib/mic.native.ts` | Wraps `react-native-audio-record` for 16 kHz mono s16le capture. Converts base64 data events to `Uint8Array`. Calls the Expo module wrapper to start/stop the Android foreground service (iOS) or activate/deactivate `AVAudioSession`. Subscribes to the module's `interruption-began` / `interruption-ended` events and surfaces them as `MicSource.onInterruption`. |
| `plugins/with-broadcast-native.js` | Expo config plugin. Android: adds `RECORD_AUDIO`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`, `POST_NOTIFICATIONS`, `WAKE_LOCK`, declares `<service android:foregroundServiceType="microphone">`. iOS: adds `UIBackgroundModes: audio` and `NSMicrophoneUsageDescription` to `Info.plist`. |
| `modules/broadcast-service/android/src/main/java/.../BroadcastForegroundService.kt` | ~60 lines of Kotlin. On start, calls `startForeground()` with a persistent notification ("Broadcasting live") and acquires a `PARTIAL_WAKE_LOCK`. Releases both on stop. |
| `modules/broadcast-service/ios/BroadcastModule.swift` | ~80 lines of Swift. Activates `AVAudioSession` with `.playAndRecord` on start, deactivates on stop. Observes `AVAudioSession.interruptionNotification` and forwards `interruption-began` / `interruption-ended` events to JS (which then pause/resume the WebSocket via `broadcast.ts`). |
| `modules/broadcast-service/expo-module.config.json` + `package.json` | Registers the module with Expo autolinking. |

### Files modified

| File | Change |
|---|---|
| `lib/broadcast.ts` | Remove MediaRecorder-specific code. Delegate to `MicSource`. Add `paused: boolean` to state. Add interruption handlers that pause/resume without ending the `live_sessions` row. Keep heartbeats running during pause. |
| `app/admin/go-live.tsx` | Catch new `MicPermissionDeniedError` and show "Grant mic access" button that calls `Linking.openSettings()`. No other UI change. |
| `app.json` | Add `./plugins/with-broadcast-native` to `plugins`. |

### Files unchanged

`hooks/useBroadcastState.ts`, `hooks/useLiveSession.ts`, `app/player/live.tsx`, `providers/PlayerProvider.*`, all listener-side code.

## Server changes

**One file, one surgical change:** `server/audio-relay.js`.

Read `sampleRate` from the first JSON config frame and pass it to ffmpeg's `-ar`. Whitelist the value to `[8000, 16000, 22050, 44100, 48000]` so malformed clients can't pass arbitrary values.

Also add: when ffmpeg spawn errors or exits with non-zero, send `{status:"error", message:"<ffmpeg error>"}` JSON frame to the client before closing, so the client-side error banner can be specific.

Deploy via the existing `server/deploy-relay.sh` (rsync + `systemctl restart khanqah-audio-relay`).

## State machine

Shared orchestrator in `lib/broadcast.ts`:

```
               start()
  ┌────────┐   ──────▶  ┌────────┐   chunk(s)   ┌──────────┐
  │  idle  │            │starting│  ──────▶     │  active  │
  └────────┘            └────────┘              └─────┬────┘
       ▲                                              │
       │                                         interrupt
       │                                              │
       │                                              ▼
       │                                        ┌──────────┐
       │                                        │  paused  │
       │                                        └─────┬────┘
       │                                              │
       │                                         resume
       │                                              │
       │            stop()                            ▼
       └──────────────────────────────────────── (back to active)
```

- `paused` keeps the `live_sessions` row, the `state.active` session metadata, and writes heartbeats. WebSocket is closed, capture stopped.
- `resume` reopens the WebSocket (passing `resumeExistingId: state.active.id`), restarts capture, transitions back to `active`.
- Permanent errors (airplane mode, relay dead, admin-initiated stop) go straight to `idle` via `stop()`.

## Lifecycle matrix

| Event | Android behavior | iOS behavior |
|---|---|---|
| Screen lock | FG service + wake lock keeps capture alive | `UIBackgroundModes: audio` keeps `AVAudioEngine` running |
| App switch | FG service survives; notification remains tappable | iOS red recording pill shown; capture continues |
| Phone call | `AUDIOFOCUS_LOSS_TRANSIENT` → pause; `AUDIOFOCUS_GAIN` → resume | `interruptionNotification .began` → pause; `.ended` with `shouldResume` → resume |
| OS low-memory kill | app dies → `live_sessions` row falls stale → 90 s sweep marks it `ended` | same |
| Force-kill from recents | notification dismissed → capture stops → WebSocket close | app dies → same |

## Permissions

Requested at first "Start Broadcast" tap, not at app launch.

| Platform | Permission | If denied |
|---|---|---|
| Android | `RECORD_AUDIO` | throw `MicPermissionDeniedError`; UI shows "Grant mic access" + `Linking.openSettings()` |
| Android 13+ | `POST_NOTIFICATIONS` | FG service falls back to silent mode; broadcast still works, notification just invisible |
| iOS | Mic access | same as Android mic denial |

## Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| WebSocket drops mid-stream | `ws.onclose` while `state.active` | emit `error('Relay connection closed')` → UI banner → session ends. Admin taps Start again; row reused via `resumeExistingId`. |
| Mic returns all-zero samples for > 10 s | chunk byte-sum check | log only; don't fail — hardware may recover. |
| Airplane mode / zero signal | `ws.send` throws | existing error path; session ends. |
| ffmpeg crash on relay | new `{status:"error"}` frame from relay | surface message in UI error banner. |
| Interruption > 5 min | heartbeats continue during pause | unlimited pause length as long as app stays alive. |

## Listener experience during pauses

HLS segments stall for the duration of the interruption (typical 10 s – 2 min for calls). Shaka (web) and expo-av (native) already retry on segment 404 loops. Once admin is back, ffmpeg resumes writing segments and listeners hear audio again with no action on their side.

## Testing plan

1. **Unit tests (Jest):** `broadcast.ts` state transitions with a mocked `MicSource`. Cover start → chunk → pause → resume → stop, error paths, collision, heartbeat timing.
2. **Native smoke test screen:** temporary route that renders live mic level from `mic.native.ts` without touching WebSocket. Ships in `__DEV__` only.
3. **Manual device matrix** before shipping:

    | Device | Case | Expected |
    |---|---|---|
    | Android 12 MIUI | 60 s screen lock | audio continues, notification visible |
    | Android 12 MIUI | 30 s incoming call | pause, then resume automatically |
    | Android 14 stock | airplane toggle | error banner, session ends |
    | Android 14 stock | force-kill from recents | capture stops, session goes stale |
    | iOS 17 | Siri invocation | pause on `.began`, resume on `.ended` |
    | iOS 17 | phone call | pause, resume |
    | Web Chrome | compare audio quality to current | should match |

4. **Staging relay smoke test:** 30-minute continuous broadcast. Verify no memory leak (`pmap` on ffmpeg PID), no descriptor leak (`ss -np` on relay).

## Rollout

1. Merge server-side `sampleRate` change first; deploy. Existing web clients keep working (they don't send `sampleRate`, server defaults to 44100 as today).
2. Ship native work behind no flag — `broadcast.start()` stops throwing the "web browser only" error once the native `MicSource` implementation exists.
3. One local APK build (`eas build --local` or the gradle path we already use) and one TestFlight build to validate on real devices before opening the admin UI to other admins.

## Open questions

None at draft time. All design questions surfaced in the brainstorm have been resolved in this spec.
