# Ask Hazrat — Shaykh App 3A: Scaffold + Auth + Theme

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new native Android app `android-shaykh/` (`com.khanqah.shaykh`) — a stripped clone of the admin app's proven scaffold — that the Shaykh logs into via OTP (his phone = `SHAYKH_PHONE`, auto-granted the `shaykh` role), landing on a placeholder home. Urdu-only, RTL, Jameel Noori Nastaleeq throughout.

**Architecture:** Clone `android-admin/`'s Gradle infrastructure (wrapper, settings, build files, version catalog) and its auth stack (`ApiService` auth endpoints, `ApiClient`, `TokenManager`, `AuthRepository`, `AuthViewModel`, `LoginScreen`, `PhoneInputField`, theme), rename the package `com.khanqah.admin → com.khanqah.shaykh`, delete all admin-specific feature code, force the whole UI to RTL + Nastaleeq, and wire a minimal nav: Login → placeholder Home showing the logged-in name. Crypto/QA/screens come in 3B/3C.

**Tech Stack:** Kotlin, Jetpack Compose, Retrofit/OkHttp, DataStore, the Go backend OTP auth (`auth/otp/send|verify|refresh`), Jameel Noori Nastaleeq TTF. minSdk 26, compileSdk 35.

This is **sub-plan 3A** of the Shaykh app. The user app (2A–2E) is done; the Go QA backend exists (deploy pending).

---

## File Structure (new project `android-shaykh/`)

Cloned + renamed from `android-admin/`, then stripped to:

| Path (under `android-shaykh/`) | Keep / Change |
|---|---|
| `settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`, `gradlew`, `gradlew.bat`, `gradle/` (wrapper + `libs.versions.toml`), `local.properties` | Clone; set `rootProject.name = "KhanqahShaykh"` |
| `app/build.gradle.kts` | Clone; `namespace`/`applicationId = "com.khanqah.shaykh"` |
| `app/src/main/AndroidManifest.xml` | Clone; `android:supportsRtl="true"`; app label "خانقاہ — حضرت"; remove admin-only services/permissions (broadcast/foreground-service) |
| `app/src/main/java/com/khanqah/shaykh/ShaykhApp.kt` | From `AdminApp.kt`, stripped to TokenManager + ApiClient + AuthRepository + AuthViewModel |
| `…/MainActivity.kt` | Compose host, **forces RTL** layout direction, hosts nav |
| `…/data/api/ApiService.kt` | From `AdminApiService.kt` — keep only `auth/otp/send`, `auth/otp/verify`, `auth/refresh` (QA/keys added in 3B) |
| `…/data/api/ApiClient.kt`, `TokenManager.kt` | Clone as-is (rename pkg) |
| `…/data/model/Models.kt` | Keep `AuthResponse` only (trim the rest) |
| `…/data/repository/AuthRepository.kt` | Clone (rename pkg) |
| `…/ui/auth/{AuthViewModel,LoginScreen,PhoneInputField}.kt` | Clone; Urdu strings |
| `…/ui/theme/{Color,Theme,Type}.kt` | Clone; `Type.kt` uses Nastaleeq as the default family |
| `…/ui/home/HomeScreen.kt` | New placeholder ("السلام علیکم" + name + a disabled "سوالات" tile) |
| `…/ui/navigation/ShaykhNavGraph.kt` | Minimal: Login ↔ Home |
| `…/ui/util/Urdu.kt` | Eastern-Arabic numeral helper + `@OptIn` RTL helpers |
| `app/src/main/res/font/jameel_noori_nastaleeq.ttf` | Copy from `android/app/src/main/res/font/` |
| `app/src/main/res/values/strings.xml`, mipmap icons | Clone/minimal |

All gradle commands run from `android-shaykh/`. The user does **not** have admin-app baggage here — delete everything admin-specific so the app is a clean single-purpose shell.

---

### Task 1: Clone the admin scaffold into `android-shaykh/`

**Files:** create `android-shaykh/` by copying `android-admin/` infra.

- [ ] **Step 1: Copy, excluding build outputs**

From repo root:
```bash
rsync -a --exclude 'build/' --exclude '.gradle/' --exclude '*.apk' android-admin/ android-shaykh/
```
(If `rsync` is unavailable, `cp -r` then `rm -rf android-shaykh/build android-shaykh/app/build android-shaykh/.gradle android-shaykh/*.apk`.)

- [ ] **Step 2: Rename the Kotlin package directory**

```bash
git -C . rm -r --cached --quiet android-shaykh 2>/dev/null || true
mkdir -p android-shaykh/app/src/main/java/com/khanqah/shaykh
# Move sources from the cloned admin package path to the shaykh path:
cp -r android-shaykh/app/src/main/java/com/khanqah/admin/* android-shaykh/app/src/main/java/com/khanqah/shaykh/
rm -rf android-shaykh/app/src/main/java/com/khanqah/admin
```

- [ ] **Step 3: Rewrite package references admin → shaykh**

Replace `com.khanqah.admin` with `com.khanqah.shaykh` in every Kotlin file and the manifest/build files:
```bash
grep -rl "com.khanqah.admin" android-shaykh --include="*.kt" --include="*.kts" --include="*.xml" \
  | xargs sed -i '' 's/com\.khanqah\.admin/com.khanqah.shaykh/g'
```
(`sed -i ''` is the macOS form; on Linux use `sed -i`.)

- [ ] **Step 4: Set identifiers**
- `android-shaykh/settings.gradle.kts`: `rootProject.name = "KhanqahShaykh"`.
- `android-shaykh/app/build.gradle.kts`: `namespace` and `applicationId` → `"com.khanqah.shaykh"`.
- `android-shaykh/app/src/main/AndroidManifest.xml`: ensure `android:supportsRtl="true"` on `<application>`; app label string → "خانقاہ — حضرت".

- [ ] **Step 5: Copy the Nastaleeq font**
```bash
mkdir -p android-shaykh/app/src/main/res/font
cp android/app/src/main/res/font/jameel_noori_nastaleeq.ttf android-shaykh/app/src/main/res/font/
```

- [ ] **Step 6: Commit the raw clone (compile comes after stripping)**
```bash
git add android-shaykh
git commit -m "chore(shaykh): clone admin scaffold into android-shaykh (com.khanqah.shaykh)"
```

> Do not build yet — the clone still contains admin feature code referencing endpoints/models we'll strip in Task 2.

---

### Task 2: Strip admin features down to the auth shell

**Files:** delete admin-specific source under `android-shaykh/app/src/main/java/com/khanqah/shaykh/`.

- [ ] **Step 1: Delete admin feature code**

```bash
cd android-shaykh/app/src/main/java/com/khanqah/shaykh
rm -f BroadcastForegroundService.kt
rm -rf ui/bugs ui/categories ui/content ui/live ui/more ui/schedule ui/settings ui/team ui/upload
rm -rf ui/navigation              # admin nav (BottomNavBar/AdminNavGraph) — replaced in Task 4
rm -f ui/home/HomeViewModel.kt    # admin home VM — placeholder home in Task 4
rm -f ui/home/HomeScreen.kt       # replaced in Task 4
rm -f data/repository/BugRepository.kt data/repository/CategoryRepository.kt \
      data/repository/ContentAdminRepository.kt data/repository/LiveRepository.kt \
      data/repository/ScheduleRepository.kt data/repository/SettingsRepository.kt \
      data/repository/TeamRepository.kt data/repository/UploadRepository.kt
cd -
```

- [ ] **Step 2: Trim `data/api/ApiService.kt`** to only:

```kotlin
package com.khanqah.shaykh.data.api

import com.khanqah.shaykh.data.model.*
import retrofit2.http.*

interface ApiService {
    @POST("auth/otp/send")
    suspend fun sendOtp(@Body body: Map<String, String>): Map<String, String>

    @POST("auth/otp/verify")
    suspend fun verifyOtp(@Body body: Map<String, String>): AuthResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: Map<String, String>): Map<String, String>
}
```
(If the admin file was named `AdminApiService.kt`/`interface AdminApiService`, rename file+interface to `ApiService`, and update `ApiClient.kt` references from `AdminApiService` → `ApiService`.)

- [ ] **Step 3: Trim `data/model/Models.kt`** to keep only the `AuthResponse` data class (delete admin models: Content, Category, BugReport, etc.). Keep its `@SerializedName` fields (`access_token`, `refresh_token`, `role`, `display_name`, `user_id`).

- [ ] **Step 4: Fix `AuthRepository.kt` / `AuthViewModel.kt`** if they referenced removed types; keep `sendOtp`, `verifyOtp` (saving tokens), `isLoggedIn`, `logout`, `getDisplayName`/`getRole`. Remove admin-only methods.

- [ ] **Step 5: Trim `ShaykhApp.kt`** (from `AdminApp.kt`) to construct only `TokenManager`, `ApiClient`, `AuthRepository`, `AuthViewModel`. Remove all admin repos/VMs and any FCM topic subscriptions for admin topics.

- [ ] **Step 6: Commit** (still may not compile until Task 4 adds Home/nav — that's fine; commit the deletions)
```bash
git add -A android-shaykh
git commit -m "chore(shaykh): strip admin features to auth shell"
```

---

### Task 3: Urdu/RTL theme

**Files:** modify `…/ui/theme/Type.kt`, `…/ui/theme/Theme.kt`; create `…/ui/util/Urdu.kt`.

- [ ] **Step 1: `Type.kt`** — define the Nastaleeq family and make it the default for the Material `Typography` (so all text renders Nastaleeq):

```kotlin
package com.khanqah.shaykh.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import com.khanqah.shaykh.R

val NastaleeqFontFamily = FontFamily(Font(R.font.jameel_noori_nastaleeq))

private fun nastaleeq(size: Int, line: Int) =
    TextStyle(fontFamily = NastaleeqFontFamily, fontSize = size.sp, lineHeight = line.sp)

// Nastaleeq needs generous line height for its descending ligatures.
val Typography = Typography(
    displayLarge = nastaleeq(40, 64), displayMedium = nastaleeq(34, 56),
    headlineLarge = nastaleeq(30, 52), headlineMedium = nastaleeq(26, 46),
    titleLarge = nastaleeq(24, 44), titleMedium = nastaleeq(20, 38),
    bodyLarge = nastaleeq(20, 40), bodyMedium = nastaleeq(18, 36), bodySmall = nastaleeq(15, 30),
    labelLarge = nastaleeq(18, 34), labelMedium = nastaleeq(16, 30), labelSmall = nastaleeq(14, 28),
)
```

- [ ] **Step 2: `Theme.kt`** — keep the cloned color scheme (deep green / gold to match the brand). Ensure the `@Composable fun ...Theme(...)` passes `typography = Typography`. (Adjust the function/file to use the new `Typography`.)

- [ ] **Step 3: `Urdu.kt`** — Eastern-Arabic numerals helper:

```kotlin
package com.khanqah.shaykh.ui.util

/** Render an Int with Urdu/Eastern-Arabic digits (۰۱۲۳۴۵۶۷۸۹). */
fun Int.toUrduDigits(): String {
    val map = charArrayOf('۰','۱','۲','۳','۴','۵','۶','۷','۸','۹')
    return this.toString().map { if (it in '0'..'9') map[it - '0'] else it }.joinToString("")
}
```

- [ ] **Step 4: Commit** — `git add -A android-shaykh && git commit -m "feat(shaykh): urdu/RTL nastaleeq theme + numerals"`

---

### Task 4: MainActivity (force RTL) + Login → placeholder Home nav

**Files:** modify `MainActivity.kt`; create `…/ui/home/HomeScreen.kt`, `…/ui/navigation/ShaykhNavGraph.kt`; keep `ui/auth/LoginScreen.kt` (Urdu).

- [ ] **Step 1: `MainActivity.kt`** — host Compose, force RTL app-wide, and render the nav graph. Mirror the user app's `CompositionLocalProvider(LocalLayoutDirection provides Rtl)` approach:

```kotlin
package com.khanqah.shaykh

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.runtime.CompositionLocalProvider
import com.khanqah.shaykh.ui.navigation.ShaykhNavGraph
import com.khanqah.shaykh.ui.theme.KhanqahShaykhTheme   // use the actual theme fn name from Theme.kt
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as ShaykhApp
        val initialLoggedIn = runBlocking { app.authRepo.isLoggedIn() }
        val initialName = runBlocking { app.authRepo.getDisplayName() }
        setContent {
            KhanqahShaykhTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    ShaykhNavGraph(
                        authViewModel = app.authViewModel,
                        startLoggedIn = initialLoggedIn,
                        initialName = initialName,
                    )
                }
            }
        }
    }
}
```
> Use the real theme composable name from the cloned `Theme.kt` (it may be `KhanqahAdminTheme`→ rename to `KhanqahShaykhTheme`). Rename it in `Theme.kt` and here.

- [ ] **Step 2: `HomeScreen.kt`** placeholder:

```kotlin
package com.khanqah.shaykh.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun ShaykhHomeScreen(displayName: String, onLogout: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("السلام علیکم", style = MaterialTheme.typography.displayMedium, textAlign = TextAlign.Center)
        if (displayName.isNotBlank()) {
            Spacer(Modifier.height(8.dp))
            Text(displayName, style = MaterialTheme.typography.titleLarge)
        }
        Spacer(Modifier.height(40.dp))
        Text("سوالات یہاں آئیں گے", style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center) // "Questions will appear here"
        Spacer(Modifier.height(40.dp))
        TextButton(onClick = onLogout) { Text("لاگ آؤٹ") }
    }
}
```

- [ ] **Step 3: `ShaykhNavGraph.kt`** — minimal Login ↔ Home:

```kotlin
package com.khanqah.shaykh.ui.navigation

import androidx.compose.runtime.*
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.khanqah.shaykh.ui.auth.AuthViewModel
import com.khanqah.shaykh.ui.auth.LoginScreen
import com.khanqah.shaykh.ui.home.ShaykhHomeScreen

@Composable
fun ShaykhNavGraph(authViewModel: AuthViewModel, startLoggedIn: Boolean, initialName: String) {
    val nav = rememberNavController()
    var name by remember { mutableStateOf(initialName) }
    val start = if (startLoggedIn) "home" else "login"
    NavHost(nav, startDestination = start) {
        composable("login") {
            LoginScreen(authViewModel = authViewModel, onLoggedIn = {
                nav.navigate("home") { popUpTo("login") { inclusive = true } }
            })
        }
        composable("home") {
            ShaykhHomeScreen(displayName = name, onLogout = {
                authViewModel.logout()
                nav.navigate("login") { popUpTo("home") { inclusive = true } }
            })
        }
    }
}
```
> Adapt to the **actual** `LoginScreen`/`AuthViewModel` signatures from the cloned admin code — the admin `LoginScreen` likely already takes an `onLoggedIn`/success callback and an `AuthViewModel`. Match its real parameters; keep its Urdu phone-OTP UI (translate any English labels to Urdu). Ensure `authViewModel.logout()` exists (add a passthrough to `AuthRepository.logout()` if needed).

- [ ] **Step 4: Build the whole app**

Run from `android-shaykh/`: `./gradlew :app:assembleDebug --no-daemon`
Expected: `BUILD SUCCESSFUL`. Fix all compile errors from the strip/rename (unresolved admin refs, theme fn name, LoginScreen signature) until green.

- [ ] **Step 5: Commit**
```bash
git add -A android-shaykh
git commit -m "feat(shaykh): RTL MainActivity + OTP login + placeholder home"
```

---

### Task 5: Verify identifiers + RTL

- [ ] **Step 1:** Confirm no stale admin references remain:
```bash
grep -rn "com.khanqah.admin\|KhanqahAdmin\|AdminApiService\|AdminApp" android-shaykh/app/src 2>/dev/null
```
Expected: no output (all renamed). Fix any stragglers, rebuild, amend the previous commit or add a fixup commit.

- [ ] **Step 2:** Confirm `applicationId`/`namespace` = `com.khanqah.shaykh`, `supportsRtl="true"` present, and the font file exists:
```bash
grep -n "com.khanqah.shaykh\|supportsRtl" android-shaykh/app/build.gradle.kts android-shaykh/app/src/main/AndroidManifest.xml
ls android-shaykh/app/src/main/res/font/jameel_noori_nastaleeq.ttf
```

- [ ] **Step 3:** Final `./gradlew :app:assembleDebug --no-daemon` → `BUILD SUCCESSFUL`. (On-device launch — login as `SHAYKH_PHONE`, see the Urdu home — is manual, deferred until device + deployed backend.)

---

## Self-Review

**Spec coverage (§8 Shaykh app, §3a provisioning):**
- New native Kotlin app `com.khanqah.shaykh`, separate project → Tasks 1–2. ✓
- Urdu-only, RTL, Jameel Noori Nastaleeq app-wide → Task 3 (Nastaleeq as default Typography) + Task 4 (forced RTL `LayoutDirection`). ✓
- OTP login (SHAYKH_PHONE auto-grants role server-side; app just does normal OTP) → cloned auth stack, Tasks 2,4. ✓
- Code copied (not shared module) → cloned from admin; crypto/QA copied in 3B. ✓

**Out of scope (3B/3C/3D):** keypair generation + key registration, QA queue/decrypt/answer, audio record/play, the audio-first Home (pending count + Listen) and Question/Answer screens, biometric gate, FLAG_SECURE, CI build job + downloads page. Task 4's Home is an explicit placeholder.

**Placeholder scan:** the Home screen is intentionally a placeholder (stated); the `LoginScreen`/`AuthViewModel`/theme-function adaptation notes are "match the real cloned signatures" guidance (necessary because exact admin signatures are read at implementation time), not unfilled blanks.

**Type consistency:** after rename, all refs are `com.khanqah.shaykh`; `ApiService` (not `AdminApiService`); `ShaykhApp.authRepo`/`authViewModel`; `KhanqahShaykhTheme`; `ShaykhNavGraph(authViewModel, startLoggedIn, initialName)`. Task 5 greps to prove no `admin` stragglers remain.

**Risk note (stated):** cloning + sed-renaming + stripping is mechanical but error-prone; Task 4/5's full build is the gate that catches every dangling admin reference. Build must be green before 3B.
