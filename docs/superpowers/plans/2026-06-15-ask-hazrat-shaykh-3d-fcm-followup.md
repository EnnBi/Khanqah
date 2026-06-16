# Ask Hazrat — Shaykh App 3D: FCM Push (DEFERRED — needs Firebase setup)

**Status:** The CI build job + downloads-page entry for the Shaykh app are **DONE** (commit `5226b58`). FCM "new question" push to the Shaykh is **deferred** because it requires an external Firebase step only the project owner can do.

## Why deferred
Adding the `google-services` Gradle plugin makes the build **fail** unless a valid `google-services.json` containing the app's package is present. The Shaykh app's package `com.khanqah.shaykh` is **not** registered in the Firebase project yet, and there's no `google-services.json` for it. So FCM can't be wired without that file.

## What the project owner must do first (external, one-time)
1. In the **Firebase console** for the existing Khanqah project, **Add app → Android**, package name `com.khanqah.shaykh`.
2. Download the generated **`google-services.json`** (it will now include all registered apps incl. shaykh).
3. Add it as a **GitHub Actions secret** (e.g. `GOOGLE_SERVICES_JSON_SHAYKH`) — mirroring how the user app uses `GOOGLE_SERVICES_JSON`.

## Then implement (small)
**Gradle:**
- `android-shaykh/app/build.gradle.kts` plugins: `alias(libs.plugins.google.services)` (the catalog already defines `google-services`).
- deps: `implementation(platform(libs.firebase.bom))` + `implementation(libs.firebase.messaging)` (add `firebase-bom`/`firebase-messaging` to the catalog as in `android/`).
- CI `build-shaykh-app` job: add a "Write google-services.json" step before the build:
  ```yaml
  - name: Write google-services.json
    env:
      GOOGLE_SERVICES_JSON_SHAYKH: ${{ secrets.GOOGLE_SERVICES_JSON_SHAYKH }}
    run: printf '%s' "$GOOGLE_SERVICES_JSON_SHAYKH" > android-shaykh/app/google-services.json
  ```
  (And a local `google-services.json` for dev builds — gitignored.)

**Code:**
- `TokenManager`: add `getUserId()` (mirror `getDisplayName`) — save `user_id` from `AuthResponse` in `AuthRepository.verifyOtp` (the response already carries `user_id`).
- Create `ShaykhFirebaseMessagingService` (mirror the user app's `KhanqahFirebaseMessagingService`): on a QA push (topic `/topics/user-<shaykhUid>`), show a content-free notification ("نیا سوال موصول ہوا"); tapping it opens the feed (`MainActivity`, e.g. an `ACTION_OPEN_FEED`). Register the service in the manifest.
- `ShaykhApp.onLoggedIn()`: subscribe `FirebaseMessaging.getInstance().subscribeToTopic("user-$uid")` (uid from `tokenManager.getUserId()`).

## Backend note
The backend already pushes "new question" to the questioner's recipient = the Shaykh; the Shaykh's per-user topic is `user-<shaykhUserId>`. To deep-link to the exact thread, also include `{type:"qa", thread_id}` in the push `data` (the user-app push-deep-link follow-up — see [[project_ask_hazrat_e2ee]]).

## Until FCM is added
The Shaykh app works fine **without** push — he opens the app, biometric-unlocks, and the feed loads the pending queue. Push is a convenience (proactive "you have a new question"), not a functional dependency.
