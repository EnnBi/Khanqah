# Local Bug Reporter (Dev Only)

A dev-only, local-only bug capture system for the Khanqah app. Captures UI and backend issues automatically (errors, warnings, failed network calls) and manually (via a floating button for issues you spot).

## Usage

- **Spot a bug**: tap the floating 🐛 button (bottom-right, above tab bar) → pick a type → add a note → submit. The button briefly turns green with a ✓ on success.
- **Auto-captured events**: every `console.error`, `console.warn`, and failed network request (status ≥ 400 or network error) creates a report automatically with the last 50 console entries and last 20 network calls attached.
- **View all reports**: Admin dashboard → "Bug Reports" card (visible only in dev builds).
- **Export**: tap **EXPORT** in the report list to copy all reports as JSON to the clipboard.
- **Clear**: tap **CLEAR** (with confirmation) to delete all stored reports.

## What gets captured

Every report contains:

- `id`, `timestamp`, `type` (ui | backend | auto-error | auto-warn | auto-network | other)
- `note` (user-written, null for auto-captures)
- `route` — current pathname from expo-router
- `appVersion`, `platform` (ios | android | web)
- `logs` — last 50 console entries (log / warn / error)
- `network` — last 20 fetch calls (method, url, status, durationMs, error if any)
- `error` — message + stack + source (for auto-captures)

## Storage

- **iOS / Android**: `FileSystem.documentDirectory + 'bug-reports/'` — one JSON file per report, filename is `<timestamp>-<id>.json` so lexicographic sort matches chronological order.
- **Web**: IndexedDB database `khanqah-bug-reports` → object store `reports` (keyed on `id`, indexed on `timestamp`).

Reports are capped at **500**. When the limit is exceeded, the oldest is dropped.

## Disabled in production

Everything is gated by `__DEV__`. In production builds:

- The floating button returns `null` (not rendered)
- `installConsolePatch`, `installFetchPatch` are never called
- `reportBug()` throws only if storage is configured — in prod it isn't, and the callers already handle errors
- The admin bug reports screen shows "Bug reports are only available in development builds."
- The admin dashboard's "Bug Reports" nav card is excluded from the list entirely

This means zero runtime overhead and zero bundle bloat for end users.

## Architecture

```
services/
  bug-reporter-types.ts   Shared types (BugReport, LogEntry, NetworkEntry)
  log-buffer.ts           Ring buffer + console patch
  network-buffer.ts       Ring buffer + fetch patch
  bug-reporter.ts         Public API + native filesystem storage
  bug-reporter.web.ts     Web IndexedDB storage (auto-resolved by Metro)

components/
  BugReporterButton.tsx   Floating dev-only button + submit modal

app/admin/
  bug-reports.tsx         List + detail view
app/_layout.tsx           Install patches + wire storage at startup
```

## Extending

To add more automatic captures:

- Call `reportBug({ type: 'other', note: '...', error: {...} })` from anywhere in the app (still dev-only due to the `__DEV__` guards in storage setup)
- To change the ring-buffer sizes, edit `LOG_BUFFER_SIZE` and `NETWORK_BUFFER_SIZE` in `services/bug-reporter-types.ts`
- To change the report retention cap, edit `MAX_REPORTS` in the same file
