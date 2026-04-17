# Local Bug Reporter — Design Spec

## Overview

A dev-only, local-only bug capture system for the Khanqah app. Captures UI and backend issues both **automatically** (errors, warnings, failed network calls) and **manually** (via a floating bug button for issues the user spots). Reports persist to local storage and are viewable both via filesystem and an in-app admin screen.

**Goal:** Catch bugs that would otherwise slip by during local development and testing, without any cloud dependencies or user-data concerns.

**Non-goals:**
- Not for production: `__DEV__` guard disables everything in release builds
- No screenshots in v1 (would require extra native/web libraries)
- No cloud sync or sharing — strictly local
- Not a replacement for real observability tooling (Sentry, LogRocket) if the app later needs that in production

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   App Runtime                              │
│                                                            │
│  ┌────────────────┐       ┌─────────────────────┐         │
│  │  log-buffer.ts │◄──────┤  console.log/warn/  │         │
│  │  (ring, 50)    │       │  error (patched)    │         │
│  └───────┬────────┘       └─────────────────────┘         │
│          │                                                │
│  ┌───────▼────────┐       ┌─────────────────────┐         │
│  │ network-buffer │◄──────┤  fetch (patched)    │         │
│  │  (ring, 20)    │       │  supabase responses │         │
│  └───────┬────────┘       └─────────────────────┘         │
│          │                                                │
│  ┌───────▼─────────────────────────┐                      │
│  │   bug-reporter.ts               │                      │
│  │   - report(type, note, error?)  │                      │
│  │   - getAll()                    │                      │
│  │   - clear()                     │                      │
│  └───┬─────────────────────────┬───┘                      │
│      │                         │                          │
│  ┌───▼───────────────┐     ┌───▼──────────────────┐       │
│  │ BugReporterButton │     │ /admin/bug-reports   │       │
│  │ (floating 🐛)     │     │ (list + detail view) │       │
│  └───────────────────┘     └──────────────────────┘       │
│                                                            │
└──────────────────┬─────────────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │  Local Storage     │
         │  - Native: FS/JSON │
         │  - Web: IndexedDB  │
         └────────────────────┘
```

## File layout

```
services/
  log-buffer.ts          # Ring buffer + console patching
  network-buffer.ts      # Ring buffer + fetch patching
  bug-reporter.ts        # Public API + storage abstraction
  bug-reporter.web.ts    # Web-specific storage (IndexedDB)

components/
  BugReporterButton.tsx  # Floating button + submit modal

app/admin/
  bug-reports.tsx        # List + detail screen
```

## Data model

### BugReport

```typescript
interface BugReport {
  id: string;               // UUID
  timestamp: string;        // ISO 8601
  type: 'ui' | 'backend' | 'auto-error' | 'auto-warn' | 'auto-network' | 'other';
  note: string | null;      // User-written note (null for auto-captures)

  // Context
  route: string;            // Current pathname (from expo-router)
  appVersion: string;       // From remote-config
  platform: 'ios' | 'android' | 'web';

  // Captured buffers at moment of report
  logs: LogEntry[];         // Last 50 console entries
  network: NetworkEntry[];  // Last 20 network calls

  // Error info (only for auto-captures)
  error?: {
    message: string;
    stack?: string;
    source?: string;        // Which function patched it
  };
}

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error';
  message: string;          // Serialized args
}

interface NetworkEntry {
  timestamp: string;
  method: string;           // GET/POST/etc
  url: string;
  status?: number;          // Undefined if network error
  durationMs?: number;
  error?: string;           // Error message if the request failed
}
```

## Components

### 1. `services/log-buffer.ts`

A fixed-size ring buffer that captures console output.

**Public API:**
```typescript
export function installLogBuffer(): void;        // Call once on app start
export function getLogBuffer(): LogEntry[];      // Returns copy of current buffer
export function clearLogBuffer(): void;
```

**Behavior:**
- Patches `console.log`, `console.warn`, `console.error` when installed
- Buffers last 50 entries (FIFO drop)
- Original console methods still fire normally (tee, don't replace)
- Serializes args using `String(arg)` with circular-ref-safe JSON fallback for objects
- No-op when `!__DEV__`

**Trigger points for auto-reports:**
- Every `console.error` call also calls `bugReporter.report('auto-error', null, { message, stack })`
- Every `console.warn` call also calls `bugReporter.report('auto-warn', null, { message })`

### 2. `services/network-buffer.ts`

**Public API:**
```typescript
export function installNetworkBuffer(): void;
export function getNetworkBuffer(): NetworkEntry[];
export function clearNetworkBuffer(): void;
```

**Behavior:**
- Patches global `fetch` to record request/response metadata
- Buffers last 20 entries
- Records: method, url, status, duration (from start to response)
- On rejection, records the error message
- Does not capture request/response bodies (too much data)
- When a response has status >= 400, also triggers `bugReporter.report('auto-network', ...)`

### 3. `services/bug-reporter.ts` (native) + `bug-reporter.web.ts` (web stub)

**Public API:**
```typescript
export function installBugReporter(): void;      // Sets up all patches
export function reportBug(params: {
  type: BugReport['type'];
  note?: string | null;
  error?: { message: string; stack?: string; source?: string };
  route?: string;
}): Promise<BugReport>;
export function getAllReports(): Promise<BugReport[]>;
export function getReport(id: string): Promise<BugReport | null>;
export function clearReports(): Promise<void>;
export function exportReportsJson(): Promise<string>;  // Returns JSON string for clipboard
```

**Native storage** (iOS/Android):
- Directory: `FileSystem.documentDirectory + 'bug-reports/'`
- One JSON file per report: `<timestamp>-<id>.json`
- `getAllReports()` reads all files, sorts newest-first
- `clearReports()` deletes the directory contents

**Web storage**:
- IndexedDB database `khanqah-bug-reports`, object store `reports`
- Keyed by report `id`, indexed by `timestamp`
- Implemented in `bug-reporter.web.ts` (auto-resolved by Metro for web)

**Error handling:**
- All storage operations wrapped in try/catch — a reporter failure never bubbles up
- If storage fails, logs warning to original `console.warn` (not the patched one, to avoid loops)

**Capacity management:**
- On report add, if total report count > 500, delete the oldest one
- Prevents unbounded storage growth during long dev sessions

### 4. `components/BugReporterButton.tsx`

A floating button visible only when `__DEV__ === true`.

**UI:**
- 48×48 circle, bottom-right corner, 24px margin from safe-area bottom edge
- Gold background, black 🐛 emoji icon
- Subtle shadow, no animation
- Z-index higher than all other content

**Interaction:**
- Tap → opens a modal with:
  - Type radio: UI Bug / Backend Bug / Other
  - Note textarea (multiline, placeholder: "What went wrong?")
  - Cancel / Submit buttons
- Submit → calls `reportBug({ type, note, route: currentRoute })`
- Success feedback: button briefly turns green with a ✓
- Failure feedback: alert with error message

**Where mounted:**
- In `app/_layout.tsx`, render `<BugReporterButton />` alongside `<Slot />` inside the root layout (inside providers, outside Slot). Only visible in dev.

### 5. `app/admin/bug-reports.tsx`

In-app list + detail screen, linked from the admin dashboard.

**List view:**
- Header: "BUG REPORTS" kicker + italic "Local captures" subtitle (matches Calm Architecture design)
- Filter chips: All / UI / Backend / Auto-Error / Auto-Network
- Rows: colored type badge, route, relative time, first line of note or error message
- Tap row → detail view
- Top-right: "Export" (copies all reports as JSON to clipboard) and "Clear All" (with confirm alert)

**Detail view:**
- Back button
- Metadata: type, timestamp, route, platform, app version
- Note (if manual report)
- Error section (if auto-capture): message + collapsible stack trace
- Logs section: last 50 entries with color-coded levels
- Network section: last 20 entries with status-color indicators

**Access control:**
- Linked from admin dashboard nav cards for admin/editor only
- The route itself checks `__DEV__` and shows a "Not available in production" message if flagged off

## Data flow

### Automatic capture (error)
1. Code calls `console.error("something broke")`
2. `log-buffer.ts` patched console: push entry to ring buffer, call original console.error
3. Patch also calls `bugReporter.report('auto-error', null, { message: "something broke" })`
4. `bugReporter.report()` captures current route, logs buffer, network buffer
5. Writes BugReport JSON to FS (native) or IndexedDB (web)

### Manual capture (button)
1. User taps 🐛 button
2. Modal opens, user selects type and writes note
3. Submit → `bugReporter.report({ type: 'ui', note: 'login button misaligned' })`
4. Report captured and stored

### Viewing
1. User navigates to `/admin/bug-reports`
2. Screen calls `getAllReports()`, renders list
3. Tap row → detail view with all captured context

## Dev-only guards

Every entry point checks `__DEV__`:

```typescript
export function installBugReporter() {
  if (!__DEV__) return;
  // ... setup
}

export function reportBug(...) {
  if (!__DEV__) return Promise.resolve(null as any);
  // ... actual work
}
```

The button component returns `null` when `!__DEV__`.

## Testing

### Unit tests (where cheap)
- `log-buffer.ts`: ring buffer FIFO behavior, capacity limits
- `network-buffer.ts`: same
- `bug-reporter.ts`: serialization, capacity pruning

### Manual test plan
1. **Auto-error**: call `console.error('test')` in a screen → verify a report appears in `/admin/bug-reports`
2. **Auto-network**: hit an endpoint that returns 500 → verify a report appears
3. **Manual UI**: tap 🐛 button, submit with type=ui, note="test" → verify appears with correct type
4. **Capacity**: generate 501 reports → verify oldest is dropped
5. **Clear all**: click Clear All → verify empty list
6. **Export**: click Export → paste into a text editor → verify valid JSON array
7. **Production guard**: build a production bundle → verify button not visible, service is no-op

## Dependencies

**New:**
- None. Uses existing `expo-file-system` for native storage and built-in `IndexedDB` API for web.

## Out of scope for v1

- Screenshots (requires `react-native-view-shot` for native + `html2canvas` for web)
- Cloud sync or export-to-Supabase
- Real-time bug indicator on the button (e.g. red badge when errors happen)
- Triggering bug reports from backend (e.g. Supabase edge function errors)
- Breadcrumb tracking (user interactions leading up to an error)
- Uploading reports as a bundle to GitHub Issues or similar
