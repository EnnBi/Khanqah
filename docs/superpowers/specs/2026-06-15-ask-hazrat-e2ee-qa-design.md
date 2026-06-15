# Ask Hazrat — End-to-End Encrypted Private Q&A — Design

**Date:** 2026-06-15
**Branch:** `feat/ask-hazrat`
**Status:** Approved design — ready for implementation planning

## Objective

A highly secure, private Question & Answer feature inside Khanqah where users ask
personal religious questions to a single Shaykh and receive private answers.

Access guarantee — only:

- The questioner can read their own questions and answers.
- The Shaykh can read questions directed to him.
- **No** developer, admin, DBA, cloud provider, support staff, or third party can
  read, listen to, or decrypt any message.

Supported content: text questions, audio questions, audio answers, text answers (optional).

## Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Shaykh interface | **New dedicated native Android app** (`com.khanqah.shaykh`) | Cleanest single-purpose UX for a non-technical elderly user; reuses admin app plumbing |
| Platforms | **Android-first** (Expo user app + native Shaykh app); iOS = later phase | Matches current build/ship reality (Android only today) |
| Shaykh count | **Single Shaykh** | One public key, trivial distribution & routing |
| Crypto | **X25519 + AES-256-GCM hybrid** via libsodium (authenticated `crypto_box` for the key) | Audited primitives, ideal for async one-to-one; no custom crypto |
| Text→speech | **User-side pre-render, always Urdu** | Shaykh always just taps Play; never depends on his device |
| Translation/TTS location | **On-device only** (ML Kit translate + Android TTS) | Cloud TTS/translation would leak plaintext to a third party → breaks E2EE |
| Shaykh app language | **Urdu-only, RTL, Jameel Noori Nastaleeq font** | Shaykh reads/understands only Urdu Nastaleeq |
| Phasing | **Phase 1 MVP first**, recovery/audit in Phase 2, hardening + iOS in Phase 3 | Ship a secure core, layer on recovery/hardening |

## 1. System architecture

Three surfaces; one invariant: **the server only ever holds ciphertext + metadata.**

```
┌────────────────┐         ┌──────────────────────┐         ┌────────────────┐
│  User app      │         │  Go backend          │         │  Shaykh app    │
│  (Expo/RN,     │◀───────▶│  (key registry,      │◀───────▶│  (new native   │
│   Android)     │  HTTPS  │   encrypted blob      │  HTTPS  │   Kotlin app)  │
│                │         │   store, push relay)  │         │                │
│ • X25519 keys  │         │                       │         │ • X25519 keys  │
│ • translate→ur │         │  Postgres: metadata + │         │ • decrypt Q    │
│ • TTS→ur audio │         │  enc_cek (no plaintext)│        │ • encrypt ans  │
│ • encrypt→Shaykh│        │  R2: encrypted audio  │         │ • Urdu/RTL UI  │
│ • decrypt ans  │         └──────────────────────┘         └────────────────┘
└────────────────┘
```

The Shaykh app is brand new (own package) but reuses the admin app's proven plumbing:
Retrofit/OkHttp client, OTP auth flow, R2 presigned upload pattern, Gradle build/sign
pipeline, the APK download-page CI.

## 2. Cryptography (no custom crypto)

Per message (question or answer):

1. Generate a random **256-bit content key (CEK)**.
2. Encrypt the payload (text bytes *or* audio file bytes) with **AES-256-GCM** under the
   CEK + a random 96-bit nonce. Portability fallback: **XChaCha20-Poly1305** on the rare
   device lacking AES-NI hardware acceleration — both are AEAD.
3. Encrypt the CEK with **authenticated `crypto_box`** (X25519 + sender's private key →
   recipient's public key) + a random nonce.

**Why authenticated `crypto_box`, not an anonymous sealed box:** the recipient's public key
is public, so a malicious server could otherwise forge a message "from the Shaykh" by
encrypting to the user's public key. `crypto_box` requires the *sender's private key*, which
the server never holds — so the server cannot forge messages. The recipient verifies
authenticity on decrypt.

The server stores: `enc_cek`, both nonces, sender/recipient IDs, sender's public-key
reference, and the ciphertext (R2 object key for audio, inline `bytea` for small text). It
can decrypt nothing.

## 3. Identity & key management

- Each device generates an **X25519 identity keypair** immediately after OTP login.
- **Private key never leaves the device.** Android Keystore cannot store raw X25519 keys, so
  we use the standard wrap pattern:
  - A **hardware-backed, non-exportable AES-256 key in the Android Keystore** wraps
    (AES-GCM-encrypts) the X25519 private key.
  - The wrapped blob is persisted in `EncryptedSharedPreferences` (Kotlin Shaykh app) /
    `expo-secure-store` (RN user app — Keystore-backed).
  - iOS (Phase 3) uses Keychain / Secure Enclave with the same wrap pattern.
- The **public key** is uploaded to the server key registry (`device_keys`).
- **Single Shaykh:** his public key is published via the existing `config.json` plus
  `GET /api/keys/shaykh`. Both apps **pin it on first use (TOFU)** and warn loudly if it
  ever changes (key rotation requires explicit re-trust).
- **User public keys** are fetched by the Shaykh app on demand (participant-gated) to encrypt
  answers.

## 3a. Provisioning & pinning the Shaykh

The Shaykh identity is **pinned to a single phone number, configured only by a developer** —
it cannot be granted, changed, or revoked from any app or admin screen.

- A server env var **`SHAYKH_PHONE`** (in the backend `.env`, editable only by dev/ops)
  designates the Shaykh's phone number.
- **Auto-grant on login:** when that phone completes OTP login, `VerifyOTP` promotes the user
  to `role = 'shaykh'` automatically (idempotent). No admin action, no in-app toggle.
- **Immutable from the app:**
  - The admin `UpdateUserRole` allowlist excludes `shaykh`, so no one can be *promoted* to
    Shaykh via the API.
  - `UpdateUserRole` and `DeleteUser` refuse to change the role of, or delete, the current
    Shaykh account (returns 403).
- **Switching the Shaykh** is a deliberate developer operation: update `SHAYKH_PHONE` and
  demote the previous Shaykh's row directly in the database. It is impossible through any
  client.
- After first login, the Shaykh's device must register its public key (`POST /keys`) before
  users can encrypt questions to him.

## 4. Database schema (new tables, self-hosted Postgres)

```sql
-- Public keys only. Supports rotation / future multi-device.
CREATE TABLE device_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  public_key  BYTEA NOT NULL,
  algo        TEXT NOT NULL DEFAULT 'x25519',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

CREATE TABLE qa_threads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),   -- questioner
  shaykh_id       UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'open',          -- open | answered | closed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE qa_messages (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id          UUID NOT NULL REFERENCES qa_threads(id),
  sender_id          UUID NOT NULL REFERENCES users(id),
  recipient_id       UUID NOT NULL REFERENCES users(id),
  direction          TEXT NOT NULL,            -- 'q' (question) | 'a' (answer)
  content_type       TEXT NOT NULL,            -- 'text' | 'audio'
  ciphertext_ref     TEXT,                     -- R2 object key (audio)
  ciphertext_inline  BYTEA,                    -- inline ciphertext (small text)
  enc_cek            BYTEA NOT NULL,           -- CEK sealed via crypto_box
  nonce_key          BYTEA NOT NULL,           -- nonce for crypto_box
  nonce_payload      BYTEA NOT NULL,           -- nonce for AES-256-GCM
  sender_key_id      UUID NOT NULL REFERENCES device_keys(id),
  byte_size          BIGINT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at       TIMESTAMPTZ,
  read_at            TIMESTAMPTZ
  -- NO plaintext columns, ever.
);
CREATE INDEX ON qa_messages (thread_id, created_at);
CREATE INDEX ON qa_messages (recipient_id, read_at);

CREATE TABLE qa_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  event_type  TEXT NOT NULL,   -- login | device_register | key_gen | msg_sent | msg_delivered | msg_read
  device_id   TEXT,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- never logs decrypted content
);

-- Phase 2. Passphrase-encrypted; server cannot decrypt.
CREATE TABLE key_backups (
  user_id          UUID PRIMARY KEY REFERENCES users(id),
  enc_private_key  BYTEA NOT NULL,   -- X25519 private key encrypted under Argon2id(recovery phrase)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

A new role value **`shaykh`** is added to the existing `user_role` enum.

## 5. Backend API (Go, added to the existing Chi router)

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/keys` | any JWT | Register/rotate this device's public key |
| `GET /api/keys/shaykh` | any JWT | Fetch current Shaykh public key (also in `config.json`) |
| `GET /api/keys/{userId}` | participant-gated | Shaykh fetches a user's key to encrypt the answer |
| `POST /api/qa/upload` | any JWT | Presigned R2 PUT for an **already-encrypted** audio blob (`qa/{thread}/{id}`) |
| `POST /api/qa/messages` | any JWT | Submit encrypted message (metadata + enc_cek + ciphertext ref/inline) |
| `GET /api/qa/threads` | any JWT | User: own threads. Shaykh: full queue |
| `GET /api/qa/messages?thread_id=` | participant-gated | Encrypted messages for a thread |
| `POST /api/qa/messages/{id}/read` | participant-gated | Mark read |

Authorization middleware: only a thread's participants (sender/recipient, derived from the
JWT `user_id`) may read/write its messages; the `shaykh` role may list the full queue. The
server sets `sender_id` from the JWT, never from the client body.

The presigned upload reuses the existing R2 client/storage code; the MIME whitelist is
extended for the encrypted blob content type (`application/octet-stream`).

## 6. Content-free push notifications

Push payloads for Q&A carry **no message content** — only a generic localized string plus a
`thread_id` for deep-linking:

- To the Shaykh: *"آپ کے پاس ایک نیا سوال ہے۔"* ("You have a new question.")
- To the user: *"آپ کو شیخ کی طرف سے جواب موصول ہوا ہے۔"* ("You have received a response from the Shaykh.")

This is a dedicated push path, separate from the existing content/broadcast topic pushes
(which legitimately carry title/body). Delivered via the existing OneSignal (client) + FCM
(server) infrastructure.

## 6a. User app — Ask Hazrat screens

The user-app feature replaces the current Coming Soon route (`/coming-soon?feature=ask`).
**Authentication is required** — a guest tapping "Ask Hazrat" is routed to login first; no
guest access to Q&A.

**Three screens:**

1. **Thread list (entry):** the user's past questions to the Shaykh, each row showing a
   snippet, a status chip (Pending / Answered), timestamp, and an unread dot for new answers.
   A prominent "Ask a new question" button. Empty state for first-time users.

2. **Compose:** input fields —
   - **Name** (required; prefilled from profile, editable)
   - **Phone** (required; prefilled from auth, editable)
   - **Address** (required; multiline)
   - **Question mode** toggle: ✍️ Text / 🎙 Audio
   - **Question text** (multiline; any language → auto-translated to Urdu per §7)
   - **Audio recorder** (record/stop/preview) with a **5-minute maximum** and a live countdown
   - Privacy notice label; **Send** button.

   Identity fields are collected once and cached locally for prefill (not re-typed each time),
   but remain required.

3. **Conversation (WhatsApp-style):** chat bubbles — the user's questions on one side, the
   Shaykh's answers on the other. Each bubble shows text or an inline ▶ audio player plus a
   **timestamp**, with **date separators** ("Today", "14 Jun 2026") between days. Sent /
   Delivered / Read ticks; unread highlight on new answers; full scrollable history.
   **Follow-up questions** are allowed in the same thread (the schema already supports multiple
   messages per thread). Opening the conversation auto-marks new answers read
   (`POST /qa/messages/{id}/read`).

**Identity handling & privacy:** name, address, and phone are **bundled inside the
end-to-end-encrypted question payload** (alongside the question text/audio), so the Shaykh sees
them but the server / DBA / cloud never can. The address is **never** stored as a plaintext
server column; its prefill value is cached in encrypted local storage on the device. (Phone is
the sole exception already present in plaintext server-side, because OTP login requires it.)
This keeps the §12 threat model intact for personal data.

## 7. Urdu-always question pipeline (all on-device)

When a user submits a text question, the **user's device** does this *before* encryption:

1. **Language-detect** the typed text (ML Kit language identification, ~1 MB bundled model).
2. If not Urdu (e.g. English), **translate → Urdu** with **on-device ML Kit translation**
   (Urdu supported; ~30 MB model downloaded once over the network, then fully offline).
3. **Render the Urdu text to speech on-device** (Android `TextToSpeech`, Urdu locale).
4. **Encrypt both** the Urdu audio and the Urdu text, and upload.

The Shaykh therefore only ever hears/sees **Urdu**, and just taps ▶ Play.

**Hard constraint — on-device only.** Cloud translation/TTS (Google Cloud, Azure, etc.) would
transmit the user's plaintext question to a third party and break the E2EE guarantee, so they
are prohibited. ML Kit translation is fully on-device; Android `TextToSpeech` is on-device.

**ML Kit footprint** (user app only — the Shaykh app needs no ML Kit):

- APK: small — translate/language-ID SDK + the ~1 MB language-ID model (a few MB total).
- Device storage / first run: ~30 MB Urdu translation model downloaded once (needs network
  that one time), then offline. Trigger this download gracefully with progress UI when the
  user first opens Ask Hazrat.

**Fallback chain (a question is never lost):**

- Translate to Urdu → always succeeds (ML Kit, offline after first download).
- Try on-device Urdu TTS → if a voice exists, attach Urdu audio.
- If the user's device has no Urdu voice → prompt to install one (Settings → Text-to-speech);
  the **encrypted Urdu text is always sent regardless**, so the Shaykh app renders it in large
  Jameel Noori Nastaleeq and may attempt TTS on its side.

Machine translation of religious questions is imperfect, so the Urdu **text** always
accompanies the audio — the Shaykh sees the actual wording, not only hears it.

## 8. Shaykh app UX (audio-first, Urdu-only)

Native Android (Kotlin + Jetpack Compose), package `com.khanqah.shaykh`.

- **Fully Urdu, fully RTL** (`android:supportsRtl="true"`, `layoutDirection = Rtl`).
- **Jameel Noori Nastaleeq** bundled as a font asset and applied app-wide via the Compose
  `Typography` / a custom `FontFamily` — **not** the system Arabic naskh font. Android's text
  stack (HarfBuzz) performs Nastaleeq ligature shaping correctly for bundled TTF.
- **Urdu / Eastern-Arabic numerals** (۰۱۲۳۴۵۶۷۸۹) for counts.
- **Home screen:** "سوالات: ۵" (pending count) + one large `▶ سنیں` (Listen Next Question)
  button. Nothing else.
- **Question screen:** large buttons only — `▶ چلائیں` (Play), `🎙 جواب ریکارڈ کریں`
  (Record Answer), `✓ بھیجیں` (Send). No keyboard, no chat list, no settings, no nav.
- Login once via OTP; biometric unlock thereafter.

Answers: the Shaykh records audio (`MediaRecorder`); optionally a short text answer can be
typed (Urdu). Audio is encrypted to the user's public key and uploaded; the user is notified
via content-free push.

## 9. Device security

- `FLAG_SECURE` on all Q&A screens (blocks screenshots and the recents-screen preview).
- Biometric + PIN gate (`BiometricPrompt` / `expo-local-authentication`); biometric also
  gates unwrapping the private key.
- Auto-lock on background / after an idle timeout.
- **No plaintext at rest:** messages are decrypted on view only; nothing decrypted is cached
  to disk. Any unavoidable transient cache is encrypted under a Keystore key.
- Encrypted local storage for the wrapped private key and tokens.

## 10. Key recovery (no admin backdoor — ever)

- A **BIP39-style recovery phrase** is generated at onboarding.
- The phrase derives a backup key via **Argon2id**; that key AES-256-GCM-encrypts the X25519
  private key; the encrypted blob is stored server-side (`key_backups`).
- Restore on a new device: enter the phrase → fetch the blob → derive key → decrypt →
  re-import. The server never sees the phrase, so it can never recover keys.
- Shaykh: same mechanism; the recovery phrase is printed once and kept safe by a trusted aide.
  If the phrase is lost, the Shaykh rotates to a new keypair — older encrypted questions become
  unreadable (acceptable for transient Q&A; users re-ask).
- There is **no** administrator/developer recovery path by construction.

## 11. Audit & compliance

`qa_audit_log` records login attempts, device registration, key generation, and message
delivery/read events — **never decrypted content**. Logs are queryable by admins for
operational/compliance purposes but reveal only metadata.

## 12. Threat model

| Adversary | Mitigation |
|---|---|
| Malicious/compromised server, DBA, cloud provider, support staff | E2EE — only ciphertext + metadata stored; no server decryption capability |
| Server forging a message "from the Shaykh" | Authenticated `crypto_box` — server lacks the sender's private key |
| Network MITM | TLS + TOFU public-key pinning + loud key-change warnings |
| Lost/stolen device | Keystore-wrapped non-exportable keys + biometric/PIN + auto-lock + FLAG_SECURE |
| Cloud TTS/translation leaking plaintext | Prohibited; all translation/TTS on-device |
| Push payload leaking content | Content-free push (generic string + thread id only) |

**Residual risks (documented, accepted for MVP):**

- **Metadata** (who asked whom, when, message sizes) is visible to the server.
- **Server-side public-key substitution** (active MITM swapping a user's registered key) —
  mitigated by TOFU pinning + key-change warnings; fully addressed by **safety-number
  verification** (Signal-style) in Phase 3.
- **Endpoint compromise** (rooted device / malware) is out of scope.
- Transient plaintext (typed text, decrypted audio) exists in device memory during use.

## 13. Scalability (100k+ users)

- Stateless Go API scales horizontally behind nginx.
- Ciphertext lives in **R2** (effectively unbounded), not the database.
- Indexed `(thread_id, created_at)` and `(recipient_id, read_at)`; paginated thread/message
  lists.
- Push via OneSignal/FCM scales independently.
- The single Shaykh is a **human** throughput limit, not a system one — handled with a queue
  UI and ordering, not by scaling infrastructure.

## 14. Disaster recovery

- **Data:** Postgres backups (metadata) + R2 versioning/lifecycle (ciphertext). Restoring
  these restores *encrypted* data — confidentiality is preserved even in a full restore.
- **Keys:** users restore via recovery phrase (§10). There is intentionally no server-side
  key escrow, so a server compromise never exposes private keys.

## 15. Recommended libraries / SDKs

- **User app (Expo/RN):** `react-native-libsodium` (X25519, `crypto_box`, AEAD),
  `expo-secure-store` (Keystore-backed key storage), `expo-local-authentication` (biometric),
  existing `expo-av` (audio record/play), ML Kit translate + language-ID (via a RN ML Kit
  wrapper), a BIP39 mnemonic library.
- **Shaykh app (Kotlin):** `lazysodium-android` (libsodium), Android Keystore +
  `EncryptedSharedPreferences`, `BiometricPrompt`, `MediaRecorder`/`MediaPlayer`, Retrofit/
  OkHttp (reuse admin patterns), DataStore. Bundled Jameel Noori Nastaleeq TTF.
- **Backend (Go):** no new crypto — only store opaque blobs. Reuse `pgx`, the existing R2
  storage client, and the FCM client.

## 16. Phasing

**Phase 1 — MVP (secure core):**
keypair generation + Keystore-wrapped storage; public-key registry + Shaykh-key distribution
(TOFU); text & audio questions; audio & text answers; authenticated `crypto_box` +
AES-256-GCM; on-device Urdu translation + TTS pre-render; content-free push; Shaykh app
(Urdu/RTL/Nastaleeq queue → play → record → send); user ask/receive screens; FLAG_SECURE +
biometric/PIN; no plaintext at rest.

**Phase 2 — recovery & operability:**
recovery phrase + Argon2id encrypted backup + restore; audit-log surfacing; auto-lock; key
rotation flow; TTS/translation UX polish + model-download UX.

**Phase 3 — hardening & reach:**
safety-number verification; multi-device support; security review / pen-test; **iOS port**
(Keychain/Secure Enclave).

## Deliverables coverage

1. System architecture — §1
2. Database schema — §4
3. Encryption workflow — §2, §7
4. Mobile app architecture — §7, §8, §9, §15
5. Backend architecture — §1, §5
6. Key management — §3, §10
7. Threat model — §12
8. Android implementation plan — Phase 1 (§16); detailed plan via writing-plans
9. iOS implementation plan — Phase 3 (§16)
10. Recommended libraries/SDKs — §15
11. Scalability — §13
12. Disaster & key recovery — §10, §14
