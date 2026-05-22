# Android User App — Full Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Android user app with web-matching branding, login/register flow, Library + CategoryDetail screens, progress tracking, and an improved Profile screen.

**Architecture:** Jetpack Compose + Material3, Room DB for offline caching, DataStore for tokens, Retrofit for API calls, ExoPlayer for playback. All changes stay within existing clean architecture layers (data → repository → viewmodel → screen).

**Tech Stack:** Kotlin, Jetpack Compose, Material3, Room, DataStore, Retrofit/OkHttp, ExoPlayer/Media3, Coil

---

## File Map

**Create:**
- `android/app/src/main/res/drawable/khanqah_logo.png` — copy from assets
- `android/app/src/main/res/font/jameel_noori_nastaleeq.ttf` — copy from assets
- `android/app/src/main/java/com/khanqah/app/data/repository/CategoryRepository.kt`
- `android/app/src/main/java/com/khanqah/app/data/repository/ProgressRepository.kt`
- `android/app/src/main/java/com/khanqah/app/ui/components/ContentRow.kt`
- `android/app/src/main/java/com/khanqah/app/ui/library/LibraryViewModel.kt`
- `android/app/src/main/java/com/khanqah/app/ui/library/LibraryScreen.kt`
- `android/app/src/main/java/com/khanqah/app/ui/library/CategoryDetailViewModel.kt`
- `android/app/src/main/java/com/khanqah/app/ui/library/CategoryDetailScreen.kt`
- `android/app/src/test/java/com/khanqah/app/data/repository/ProgressRepositoryTest.kt`

**Modify:**
- `android/app/src/main/java/com/khanqah/app/ui/theme/Color.kt`
- `android/app/src/main/java/com/khanqah/app/ui/theme/Theme.kt`
- `android/app/src/main/java/com/khanqah/app/ui/theme/Type.kt`
- `android/app/src/main/java/com/khanqah/app/data/model/Models.kt`
- `android/app/src/main/java/com/khanqah/app/data/api/TokenManager.kt`
- `android/app/src/main/java/com/khanqah/app/data/api/ApiService.kt`
- `android/app/src/main/java/com/khanqah/app/data/repository/AuthRepository.kt`
- `android/app/src/main/java/com/khanqah/app/ui/auth/AuthViewModel.kt`
- `android/app/src/main/java/com/khanqah/app/ui/auth/LoginScreen.kt`
- `android/app/src/main/java/com/khanqah/app/ui/player/PlayerViewModel.kt`
- `android/app/src/main/java/com/khanqah/app/ui/player/PlayerScreen.kt`
- `android/app/src/main/java/com/khanqah/app/ui/profile/ProfileScreen.kt`
- `android/app/src/main/java/com/khanqah/app/ui/navigation/AppNavGraph.kt`
- `android/app/src/main/java/com/khanqah/app/KhanqahApp.kt`
- `android/app/src/main/java/com/khanqah/app/MainActivity.kt`
- `android/app/build.gradle.kts`

---

## Task 1: Theme Colors + Branding Assets

**Files:**
- Modify: `android/app/src/main/java/com/khanqah/app/ui/theme/Color.kt`
- Modify: `android/app/src/main/java/com/khanqah/app/ui/theme/Theme.kt`
- Modify: `android/app/src/main/java/com/khanqah/app/ui/theme/Type.kt`
- Create: `android/app/src/main/res/drawable/khanqah_logo.png`
- Create: `android/app/src/main/res/font/jameel_noori_nastaleeq.ttf`

- [ ] **Step 1: Copy logo and font assets**

```bash
cp assets/images/khanqah-logo.png android/app/src/main/res/drawable/khanqah_logo.png
mkdir -p android/app/src/main/res/font
cp assets/fonts/JameelNooriNastaleeq.ttf android/app/src/main/res/font/jameel_noori_nastaleeq.ttf
```

- [ ] **Step 2: Replace Color.kt with web-matching palette**

```kotlin
package com.khanqah.app.ui.theme

import androidx.compose.ui.graphics.Color

// Light — matches web CSS variables
val BackgroundLight   = Color(0xFFF7F5F0)  // parchment
val SurfaceLight      = Color(0xFFFFFFFF)
val PrimaryLight      = Color(0xFF0F2E24)  // forest green
val OnPrimaryLight    = Color(0xFFFFFFFF)
val SecondaryLight    = Color(0xFF4A5F58)  // muted fg
val OnSecondaryLight  = Color(0xFFFFFFFF)
val TextPrimaryLight  = Color(0xFF0F2E24)
val TextMutedLight    = Color(0xFF4A5F58)
val GoldLight         = Color(0xFFD4A853)
val GoldSurfaceLight  = Color(0xFFF5E9C8)
val BorderLight       = Color(0x1A0F2E24)  // rgba(15,46,36,0.1)

// Dark — deep forest
val BackgroundDark    = Color(0xFF0A1F18)
val SurfaceDark       = Color(0xFF112820)
val PrimaryDark       = Color(0xFFE8DFC8)  // warm white
val OnPrimaryDark     = Color(0xFF0A1F18)
val SecondaryDark     = Color(0xFF8FA89E)
val OnSecondaryDark   = Color(0xFF0A1F18)
val TextPrimaryDark   = Color(0xFFE8DFC8)
val TextMutedDark     = Color(0xFF8FA89E)
val GoldDark          = Color(0xFFD4A853)
val GoldSurfaceDark   = Color(0xFF2A2010)
val BorderDark        = Color(0x14FFFFFF)  // rgba(255,255,255,0.08)
```

- [ ] **Step 3: Update Theme.kt to use new colors**

```kotlin
package com.khanqah.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = PrimaryLight,
    onPrimary = OnPrimaryLight,
    secondary = SecondaryLight,
    onSecondary = OnSecondaryLight,
    background = BackgroundLight,
    surface = SurfaceLight,
    onBackground = TextPrimaryLight,
    onSurface = TextPrimaryLight,
    outline = BorderLight,
    tertiary = GoldLight,
    onTertiary = BackgroundLight,
    tertiaryContainer = GoldSurfaceLight,
)

private val DarkColors = darkColorScheme(
    primary = PrimaryDark,
    onPrimary = OnPrimaryDark,
    secondary = SecondaryDark,
    onSecondary = OnSecondaryDark,
    background = BackgroundDark,
    surface = SurfaceDark,
    onBackground = TextPrimaryDark,
    onSurface = TextPrimaryDark,
    outline = BorderDark,
    tertiary = GoldDark,
    onTertiary = BackgroundDark,
    tertiaryContainer = GoldSurfaceDark,
)

@Composable
fun KhanqahTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (darkTheme) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colors.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }
    MaterialTheme(colorScheme = colors, typography = Typography, content = content)
}
```

- [ ] **Step 4: Update Type.kt to add Nastaleeq font family**

```kotlin
package com.khanqah.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.khanqah.app.R

val NastaleeqFontFamily = FontFamily(
    Font(R.font.jameel_noori_nastaleeq)
)

val Typography = Typography(
    headlineLarge  = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.SemiBold, lineHeight = 36.sp),
    headlineMedium = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.SemiBold, lineHeight = 30.sp),
    titleLarge     = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.Medium,   lineHeight = 26.sp),
    bodyLarge      = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Normal,   lineHeight = 24.sp),
    bodyMedium     = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal,   lineHeight = 20.sp),
    labelSmall     = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium,   lineHeight = 16.sp, letterSpacing = 0.8.sp),
)
```

- [ ] **Step 5: Verify build compiles**

```bash
cd android && ./gradlew assembleDebug 2>&1 | tail -20
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/res/drawable/khanqah_logo.png \
        android/app/src/main/res/font/jameel_noori_nastaleeq.ttf \
        android/app/src/main/java/com/khanqah/app/ui/theme/
git commit -m "feat(android): web-matching theme colors + Nastaleeq font + logo asset"
```

---

## Task 2: Auth Data Layer — display_name, user_id, phone

**Files:**
- Modify: `android/app/src/main/java/com/khanqah/app/data/model/Models.kt`
- Modify: `android/app/src/main/java/com/khanqah/app/data/api/TokenManager.kt`
- Modify: `android/app/src/main/java/com/khanqah/app/data/api/ApiService.kt`
- Modify: `android/app/src/main/java/com/khanqah/app/data/repository/AuthRepository.kt`

- [ ] **Step 1: Add displayName and userId to AuthResponse in Models.kt**

Replace the `AuthResponse` data class:

```kotlin
data class AuthResponse(
    @SerializedName("access_token")  val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    val role: String,
    @SerializedName("display_name")  val displayName: String = "",
    @SerializedName("user_id")       val userId: String = "",
)
```

Add a `UpsertProgressRequest` data class (used in Task 5) at the bottom of Models.kt:

```kotlin
data class UpsertProgressRequest(
    @SerializedName("position_seconds") val positionSeconds: Int,
    val completed: Boolean,
)
```

- [ ] **Step 2: Update ApiService to use UpsertProgressRequest**

Replace the `upsertProgress` signature:

```kotlin
@PUT("me/progress/{contentId}")
suspend fun upsertProgress(
    @Path("contentId") contentId: String,
    @Body body: UpsertProgressRequest,
): Progress
```

- [ ] **Step 3: Update TokenManager to store displayName, userId, phone**

Replace the entire file:

```kotlin
package com.khanqah.app.data.api

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("auth")

class TokenManager(private val context: Context) {
    private val ACCESS       = stringPreferencesKey("access_token")
    private val REFRESH      = stringPreferencesKey("refresh_token")
    private val ROLE         = stringPreferencesKey("role")
    private val DISPLAY_NAME = stringPreferencesKey("display_name")
    private val USER_ID      = stringPreferencesKey("user_id")
    private val PHONE        = stringPreferencesKey("phone")

    suspend fun getAccessToken()  = context.dataStore.data.map { it[ACCESS] }.first()
    suspend fun getRefreshToken() = context.dataStore.data.map { it[REFRESH] }.first()
    suspend fun getRole()         = context.dataStore.data.map { it[ROLE] }.first()
    suspend fun getDisplayName()  = context.dataStore.data.map { it[DISPLAY_NAME] ?: "" }.first()
    suspend fun getUserId()       = context.dataStore.data.map { it[USER_ID] ?: "" }.first()
    suspend fun getPhone()        = context.dataStore.data.map { it[PHONE] ?: "" }.first()

    suspend fun saveTokens(access: String, refresh: String, role: String, displayName: String, userId: String, phone: String) {
        context.dataStore.edit {
            it[ACCESS]       = access
            it[REFRESH]      = refresh
            it[ROLE]         = role
            it[DISPLAY_NAME] = displayName
            it[USER_ID]      = userId
            it[PHONE]        = phone
        }
    }

    suspend fun saveAccessToken(access: String) {
        context.dataStore.edit { it[ACCESS] = access }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
```

- [ ] **Step 4: Update AuthRepository to pass name + phone, save all fields**

Replace the entire file:

```kotlin
package com.khanqah.app.data.repository

import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.api.TokenManager
import com.khanqah.app.data.model.AuthResponse

class AuthRepository(private val api: ApiService, private val tokenManager: TokenManager) {

    suspend fun sendOtp(phone: String) {
        api.sendOtp(mapOf("phone" to phone))
    }

    suspend fun verifyOtp(phone: String, otp: String, name: String = ""): AuthResponse {
        val body = buildMap<String, String> {
            put("phone", phone)
            put("otp", otp)
            if (name.isNotBlank()) put("name", name)
        }
        val result = api.verifyOtp(body)
        tokenManager.saveTokens(
            access = result.accessToken,
            refresh = result.refreshToken,
            role = result.role,
            displayName = result.displayName,
            userId = result.userId,
            phone = phone,
        )
        return result
    }

    suspend fun logout() = tokenManager.clear()

    suspend fun getRole()        = tokenManager.getRole()
    suspend fun getDisplayName() = tokenManager.getDisplayName()
    suspend fun getPhone()       = tokenManager.getPhone()
    suspend fun isLoggedIn()     = tokenManager.getAccessToken() != null
}
```

- [ ] **Step 5: Verify build**

```bash
cd android && ./gradlew assembleDebug 2>&1 | tail -20
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/data/
git commit -m "feat(android): store display_name, user_id, phone in DataStore; add UpsertProgressRequest"
```

---

## Task 3: LoginScreen — Sign In / Register Tabs

**Files:**
- Modify: `android/app/src/main/java/com/khanqah/app/ui/auth/AuthViewModel.kt`
- Modify: `android/app/src/main/java/com/khanqah/app/ui/auth/LoginScreen.kt`

- [ ] **Step 1: Update AuthViewModel to accept name parameter**

Replace the entire file:

```kotlin
package com.khanqah.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface AuthState {
    object Idle : AuthState
    object Loading : AuthState
    object OtpSent : AuthState
    object Success : AuthState
    data class Error(val message: String) : AuthState
}

class AuthViewModel(private val repo: AuthRepository) : ViewModel() {
    private val _state = MutableStateFlow<AuthState>(AuthState.Idle)
    val state = _state.asStateFlow()

    fun sendOtp(phone: String) = viewModelScope.launch {
        _state.value = AuthState.Loading
        try {
            repo.sendOtp(phone)
            _state.value = AuthState.OtpSent
        } catch (e: Exception) {
            _state.value = AuthState.Error(e.message ?: "Failed to send OTP")
        }
    }

    fun verifyOtp(phone: String, otp: String, name: String = "") = viewModelScope.launch {
        _state.value = AuthState.Loading
        try {
            repo.verifyOtp(phone, otp, name)
            _state.value = AuthState.Success
        } catch (e: Exception) {
            _state.value = AuthState.Error(e.message ?: "Invalid OTP")
        }
    }

    fun reset() { _state.value = AuthState.Idle }
}
```

- [ ] **Step 2: Replace LoginScreen with Sign In / Register tab design**

Replace the entire file:

```kotlin
package com.khanqah.app.ui.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.R
import com.khanqah.app.ui.theme.NastaleeqFontFamily

@Composable
fun LoginScreen(viewModel: AuthViewModel, onSuccess: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var mode by remember { mutableStateOf(0) } // 0 = Sign In, 1 = Register
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    val isOtpStep = state is AuthState.OtpSent

    LaunchedEffect(state) {
        if (state is AuthState.Success) onSuccess()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Logo
        Image(
            painter = painterResource(R.drawable.khanqah_logo),
            contentDescription = "Khanqah logo",
            modifier = Modifier.size(80.dp),
        )
        Spacer(Modifier.height(12.dp))

        // App name
        Text(
            text = "Khanqah Maseeh-ul-Ummah",
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )
        Text(
            text = "خانقاہ مسیح الامۃ",
            fontFamily = NastaleeqFontFamily,
            fontSize = 20.sp,
            color = MaterialTheme.colorScheme.tertiary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(32.dp))

        // Card
        Surface(
            shape = RoundedCornerShape(16.dp),
            tonalElevation = 2.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp)) {

                if (!isOtpStep) {
                    // Mode toggle — only shown on phone step
                    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                        SegmentedButton(
                            selected = mode == 0,
                            onClick = { mode = 0; name = ""; viewModel.reset() },
                            shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                            label = { Text("Sign In") },
                        )
                        SegmentedButton(
                            selected = mode == 1,
                            onClick = { mode = 1; viewModel.reset() },
                            shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                            label = { Text("Register") },
                        )
                    }
                    Spacer(Modifier.height(20.dp))

                    // Name field — Register only
                    if (mode == 1) {
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = { Text("Your Name") },
                            placeholder = { Text("Your name") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                        )
                        Spacer(Modifier.height(12.dp))
                    }

                    // Phone field
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Phone Number") },
                        placeholder = { Text("+91 98765 43210") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                } else {
                    // OTP step — clean, no name/mode shown
                    Text(
                        text = "Enter the 6-digit code sent to $phone",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        modifier = Modifier.padding(bottom = 16.dp),
                    )
                    OutlinedTextField(
                        value = otp,
                        onValueChange = { if (it.length <= 6) otp = it.filter(Char::isDigit) },
                        label = { Text("6-digit code") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }

                Spacer(Modifier.height(16.dp))

                // Error
                if (state is AuthState.Error) {
                    Text(
                        text = (state as AuthState.Error).message,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                }

                // Primary button
                val canSend = phone.isNotBlank() && (mode == 0 || name.isNotBlank())
                Button(
                    onClick = {
                        if (isOtpStep) viewModel.verifyOtp(phone, otp, if (mode == 1) name else "")
                        else viewModel.sendOtp(phone)
                    },
                    enabled = state !is AuthState.Loading &&
                        if (isOtpStep) otp.length == 6 else canSend,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                ) {
                    if (state is AuthState.Loading)
                        CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                    else
                        Text(if (isOtpStep) "Verify" else "Send OTP")
                }

                // Back link on OTP step
                if (isOtpStep) {
                    TextButton(
                        onClick = { viewModel.reset(); otp = "" },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("← Use a different number", style = MaterialTheme.typography.bodySmall) }
                }
            }
        }
    }
}
```

- [ ] **Step 3: Verify build**

```bash
cd android && ./gradlew assembleDebug 2>&1 | tail -20
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/ui/auth/
git commit -m "feat(android): Sign In / Register tabs on login screen with name field"
```

---

## Task 4: ProgressRepository

**Files:**
- Create: `android/app/src/main/java/com/khanqah/app/data/repository/ProgressRepository.kt`
- Create: `android/app/src/test/java/com/khanqah/app/data/repository/ProgressRepositoryTest.kt`

- [ ] **Step 1: Add test dependency to build.gradle.kts**

Add inside `dependencies { ... }`:

```kotlin
testImplementation("junit:junit:4.13.2")
testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
testImplementation("io.mockk:mockk:1.13.10")
```

- [ ] **Step 2: Write the failing test**

Create `android/app/src/test/java/com/khanqah/app/data/repository/ProgressRepositoryTest.kt`:

```kotlin
package com.khanqah.app.data.repository

import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.model.Progress
import com.khanqah.app.data.model.UpsertProgressRequest
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProgressRepositoryTest {

    private val api = mockk<ApiService>()
    private val repo = ProgressRepository(api)

    @Test
    fun `getLocal returns null before loadAll`() {
        assertNull(repo.getLocal("abc"))
    }

    @Test
    fun `loadAll populates local cache`() = runTest {
        val progress = Progress(contentId = "abc", positionSeconds = 120, completed = false)
        coEvery { api.getProgress() } returns listOf(progress)

        repo.loadAll()

        assertEquals(120, repo.getLocal("abc")?.positionSeconds)
    }

    @Test
    fun `save calls api and updates cache`() = runTest {
        val updated = Progress(contentId = "xyz", positionSeconds = 60, completed = false)
        coEvery {
            api.upsertProgress("xyz", UpsertProgressRequest(60, false))
        } returns updated

        repo.save("xyz", 60, false)

        coVerify { api.upsertProgress("xyz", UpsertProgressRequest(60, false)) }
        assertEquals(60, repo.getLocal("xyz")?.positionSeconds)
    }

    @Test
    fun `save is silent on api failure`() = runTest {
        coEvery {
            api.upsertProgress(any(), any())
        } throws RuntimeException("Network error")

        // Should not throw
        repo.save("xyz", 60, false)
    }
}
```

- [ ] **Step 3: Run test — expect failure**

```bash
cd android && ./gradlew test --tests "com.khanqah.app.data.repository.ProgressRepositoryTest" 2>&1 | tail -20
```
Expected: FAILED — `ProgressRepository` does not exist yet.

- [ ] **Step 4: Create ProgressRepository**

```kotlin
package com.khanqah.app.data.repository

import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.model.Progress
import com.khanqah.app.data.model.UpsertProgressRequest

class ProgressRepository(private val api: ApiService) {
    private val cache = mutableMapOf<String, Progress>()

    fun getLocal(contentId: String): Progress? = cache[contentId]

    suspend fun loadAll(): Map<String, Progress> {
        return try {
            val list = api.getProgress()
            list.forEach { cache[it.contentId] = it }
            cache.toMap()
        } catch (e: Exception) {
            cache.toMap()
        }
    }

    suspend fun save(contentId: String, positionSeconds: Int, completed: Boolean) {
        try {
            val result = api.upsertProgress(contentId, UpsertProgressRequest(positionSeconds, completed))
            cache[contentId] = result
        } catch (e: Exception) {
            // silent — never interrupt playback
        }
    }
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd android && ./gradlew test --tests "com.khanqah.app.data.repository.ProgressRepositoryTest" 2>&1 | tail -20
```
Expected: `BUILD SUCCESSFUL`, 4 tests PASSED.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/data/repository/ProgressRepository.kt \
        android/app/src/test/java/com/khanqah/app/data/repository/ProgressRepositoryTest.kt \
        android/app/build.gradle.kts
git commit -m "feat(android): add ProgressRepository with in-memory cache and silent save"
```

---

## Task 5: PlayerViewModel — Progress Tracking

**Files:**
- Modify: `android/app/src/main/java/com/khanqah/app/ui/player/PlayerViewModel.kt`
- Modify: `android/app/src/main/java/com/khanqah/app/ui/player/PlayerScreen.kt`

- [ ] **Step 1: Replace PlayerViewModel with progress-aware version**

```kotlin
package com.khanqah.app.ui.player

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.khanqah.app.data.model.Content
import com.khanqah.app.data.repository.ContentRepository
import com.khanqah.app.data.repository.ProgressRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PlayerViewModel(
    private val contentRepo: ContentRepository,
    private val progressRepo: ProgressRepository,
    private val context: Context,
) : ViewModel() {

    private val _content = MutableStateFlow<Content?>(null)
    val content = _content.asStateFlow()

    val player: ExoPlayer = ExoPlayer.Builder(context).build()
    private var currentContentId: String? = null
    private var progressJob: Job? = null

    fun load(id: String) = viewModelScope.launch {
        currentContentId = id
        val c = contentRepo.getContent(id)
        _content.value = c

        // Fetch saved position
        val saved = progressRepo.getLocal(id) ?: run {
            progressRepo.loadAll()
            progressRepo.getLocal(id)
        }

        player.setMediaItem(MediaItem.fromUri(c.mediaUrl))
        player.prepare()

        if (saved != null && !saved.completed && saved.positionSeconds > 0) {
            player.seekTo(saved.positionSeconds * 1000L)
        }
        player.play()

        // Add end-of-media listener to mark complete
        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                if (state == Player.STATE_ENDED) {
                    viewModelScope.launch {
                        progressRepo.save(id, (player.duration / 1000).toInt(), completed = true)
                    }
                }
            }
        })

        // Periodic progress save every 10 seconds
        progressJob?.cancel()
        progressJob = viewModelScope.launch {
            while (true) {
                delay(10_000)
                val pos = (player.currentPosition / 1000).toInt()
                val dur = (player.duration / 1000).toInt()
                val completed = dur > 0 && pos >= (dur * 0.9).toInt()
                progressRepo.save(id, pos, completed)
            }
        }
    }

    override fun onCleared() {
        progressJob?.cancel()
        player.release()
        super.onCleared()
    }
}
```

- [ ] **Step 2: Verify build**

```bash
cd android && ./gradlew assembleDebug 2>&1 | tail -20
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/ui/player/PlayerViewModel.kt
git commit -m "feat(android): progress tracking in PlayerViewModel — resume + periodic save"
```

---

## Task 6: ContentRow Component + Library Screen

**Files:**
- Create: `android/app/src/main/java/com/khanqah/app/ui/components/ContentRow.kt`
- Create: `android/app/src/main/java/com/khanqah/app/data/repository/CategoryRepository.kt`
- Create: `android/app/src/main/java/com/khanqah/app/ui/library/LibraryViewModel.kt`
- Create: `android/app/src/main/java/com/khanqah/app/ui/library/LibraryScreen.kt`

- [ ] **Step 1: Create CategoryRepository**

```kotlin
package com.khanqah.app.data.repository

import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.db.AppDatabase
import com.khanqah.app.data.db.entities.CategoryEntity
import com.khanqah.app.data.model.Category
import kotlinx.coroutines.flow.Flow

class CategoryRepository(private val api: ApiService, private val db: AppDatabase) {

    fun observeCategories(): Flow<List<CategoryEntity>> = db.categoryDao().observeAll()

    suspend fun refresh() {
        val cats = api.listCategories()
        db.categoryDao().upsertAll(cats.map { it.toEntity() })
    }

    private fun Category.toEntity() = CategoryEntity(
        id = id, nameEn = nameEn, nameUr = nameUr,
        type = type, parentId = parentId, sortOrder = sortOrder,
    )
}
```

- [ ] **Step 2: Create reusable ContentRow composable**

```kotlin
package com.khanqah.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.khanqah.app.data.db.entities.ContentEntity
import com.khanqah.app.data.model.Progress

@Composable
fun ContentRow(
    item: ContentEntity,
    progress: Progress?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
            .clickable(onClick = onClick),
    ) {
        Column {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                item.thumbnailUrl?.let { url ->
                    AsyncImage(
                        model = url,
                        contentDescription = null,
                        modifier = Modifier.size(52.dp),
                    )
                    Spacer(Modifier.width(12.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(item.titleEn, style = MaterialTheme.typography.titleLarge, maxLines = 2)
                    item.duration?.let { dur ->
                        val mins = dur / 60
                        val secs = dur % 60
                        Text(
                            "%d:%02d".format(mins, secs),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        )
                    }
                }
            }
            // Gold progress bar
            if (progress != null && progress.positionSeconds > 0) {
                val fraction = if (item.duration != null && item.duration > 0)
                    (progress.positionSeconds.toFloat() / item.duration).coerceIn(0f, 1f)
                else 0f
                LinearProgressIndicator(
                    progress = { fraction },
                    modifier = Modifier.fillMaxWidth().height(3.dp),
                    color = MaterialTheme.colorScheme.tertiary,
                    trackColor = MaterialTheme.colorScheme.tertiaryContainer,
                )
            }
        }
    }
}
```

- [ ] **Step 3: Create LibraryViewModel**

```kotlin
package com.khanqah.app.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.app.data.db.entities.CategoryEntity
import com.khanqah.app.data.repository.CategoryRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class LibraryViewModel(private val categoryRepo: CategoryRepository) : ViewModel() {

    val categories = categoryRepo.observeCategories()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        viewModelScope.launch { categoryRepo.refresh() }
    }
}
```

- [ ] **Step 4: Create LibraryScreen**

```kotlin
package com.khanqah.app.ui.library

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.data.db.entities.CategoryEntity
import com.khanqah.app.ui.theme.NastaleeqFontFamily

@Composable
fun LibraryScreen(viewModel: LibraryViewModel, onCategoryClick: (CategoryEntity) -> Unit) {
    val categories by viewModel.categories.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text(
                "Library",
                style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.padding(bottom = 8.dp),
            )
        }

        if (categories.isEmpty()) {
            item {
                Box(Modifier.fillParentMaxWidth().padding(top = 48.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }

        items(categories) { cat ->
            CategoryCard(cat = cat, onClick = { onCategoryClick(cat) })
        }
    }
}

@Composable
private fun CategoryCard(cat: CategoryEntity, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(cat.nameEn, style = MaterialTheme.typography.titleLarge)
                Text(
                    cat.nameUr,
                    fontFamily = NastaleeqFontFamily,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.tertiary,
                    textAlign = TextAlign.Start,
                )
            }
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
            )
        }
    }
}
```

- [ ] **Step 5: Verify build**

```bash
cd android && ./gradlew assembleDebug 2>&1 | tail -20
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/data/repository/CategoryRepository.kt \
        android/app/src/main/java/com/khanqah/app/ui/components/ \
        android/app/src/main/java/com/khanqah/app/ui/library/LibraryViewModel.kt \
        android/app/src/main/java/com/khanqah/app/ui/library/LibraryScreen.kt
git commit -m "feat(android): CategoryRepository, ContentRow component, LibraryScreen with categories"
```

---

## Task 7: CategoryDetailScreen

**Files:**
- Create: `android/app/src/main/java/com/khanqah/app/ui/library/CategoryDetailViewModel.kt`
- Create: `android/app/src/main/java/com/khanqah/app/ui/library/CategoryDetailScreen.kt`

- [ ] **Step 1: Create CategoryDetailViewModel**

```kotlin
package com.khanqah.app.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.app.data.db.entities.ContentEntity
import com.khanqah.app.data.model.Progress
import com.khanqah.app.data.repository.ContentRepository
import com.khanqah.app.data.repository.ProgressRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class CategoryDetailViewModel(
    private val contentRepo: ContentRepository,
    private val progressRepo: ProgressRepository,
    private val categoryId: String,
) : ViewModel() {

    val content = contentRepo.observeContent(categoryId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _progressMap = MutableStateFlow<Map<String, Progress>>(emptyMap())
    val progressMap = _progressMap.asStateFlow()

    init {
        viewModelScope.launch { contentRepo.refreshContent(categoryId) }
        viewModelScope.launch { _progressMap.value = progressRepo.loadAll() }
    }
}
```

- [ ] **Step 2: Create CategoryDetailScreen**

```kotlin
package com.khanqah.app.ui.library

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.ui.components.ContentRow
import com.khanqah.app.ui.theme.NastaleeqFontFamily

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryDetailScreen(
    viewModel: CategoryDetailViewModel,
    categoryNameEn: String,
    categoryNameUr: String,
    onContentClick: (String) -> Unit,
    onBack: () -> Unit,
) {
    val content by viewModel.content.collectAsState()
    val progressMap by viewModel.progressMap.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(categoryNameEn, style = MaterialTheme.typography.titleLarge)
                        Text(
                            categoryNameUr,
                            fontFamily = NastaleeqFontFamily,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.tertiary,
                            textAlign = TextAlign.Start,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        }
    ) { padding ->
        if (content.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator() }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(0.dp),
            ) {
                items(content) { item ->
                    ContentRow(
                        item = item,
                        progress = progressMap[item.id],
                        onClick = { onContentClick(item.id) },
                    )
                }
            }
        }
    }
}
```

- [ ] **Step 3: Verify build**

```bash
cd android && ./gradlew assembleDebug 2>&1 | tail -20
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/ui/library/
git commit -m "feat(android): CategoryDetailViewModel and CategoryDetailScreen"
```

---

## Task 8: ProfileScreen Update

**Files:**
- Modify: `android/app/src/main/java/com/khanqah/app/ui/profile/ProfileScreen.kt`

- [ ] **Step 1: Replace ProfileScreen**

```kotlin
package com.khanqah.app.ui.profile

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.R
import com.khanqah.app.ui.theme.NastaleeqFontFamily

@Composable
fun ProfileScreen(
    displayName: String,
    phone: String,
    role: String?,
    onLogout: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            painter = painterResource(R.drawable.khanqah_logo),
            contentDescription = "Khanqah logo",
            modifier = Modifier.size(72.dp),
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = "خانقاہ مسیح الامۃ",
            fontFamily = NastaleeqFontFamily,
            fontSize = 22.sp,
            color = MaterialTheme.colorScheme.tertiary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(24.dp))

        if (displayName.isNotBlank()) {
            Text(
                text = displayName,
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.SemiBold),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(4.dp))
        }
        Text(
            text = phone,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
        )

        role?.let {
            Spacer(Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.tertiaryContainer,
            ) {
                Text(
                    text = it.uppercase(),
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.tertiary,
                )
            }
        }

        Spacer(Modifier.height(40.dp))
        OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
            Text("Sign Out")
        }
    }
}
```

- [ ] **Step 2: Verify build**

```bash
cd android && ./gradlew assembleDebug 2>&1 | tail -20
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/ui/profile/ProfileScreen.kt
git commit -m "feat(android): ProfileScreen with logo, Nastaleeq subtitle, name, phone, gold role badge"
```

---

## Task 9: NavGraph + KhanqahApp + MainActivity Wiring

**Files:**
- Modify: `android/app/src/main/java/com/khanqah/app/ui/navigation/AppNavGraph.kt`
- Modify: `android/app/src/main/java/com/khanqah/app/KhanqahApp.kt`
- Modify: `android/app/src/main/java/com/khanqah/app/MainActivity.kt`

- [ ] **Step 1: Update AppNavGraph — add CategoryDetail route, wire Library and Profile**

Replace the entire file:

```kotlin
package com.khanqah.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LibraryMusic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.khanqah.app.data.db.entities.CategoryEntity
import com.khanqah.app.data.model.LiveSession
import com.khanqah.app.data.model.ScheduledSession
import com.khanqah.app.ui.auth.AuthViewModel
import com.khanqah.app.ui.auth.LoginScreen
import com.khanqah.app.ui.home.HomeScreen
import com.khanqah.app.ui.home.HomeViewModel
import com.khanqah.app.ui.library.CategoryDetailScreen
import com.khanqah.app.ui.library.CategoryDetailViewModel
import com.khanqah.app.ui.library.LibraryScreen
import com.khanqah.app.ui.library.LibraryViewModel
import com.khanqah.app.ui.live.LiveScreen
import com.khanqah.app.ui.player.PlayerScreen
import com.khanqah.app.ui.player.PlayerViewModel
import com.khanqah.app.ui.profile.ProfileScreen
import com.khanqah.app.ui.schedule.ScheduleScreen

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Home : Screen("home")
    object Library : Screen("library")
    object Schedule : Screen("schedule")
    object Live : Screen("live")
    object Profile : Screen("profile")
    object Player : Screen("player/{contentId}") {
        fun route(id: String) = "player/$id"
    }
    object CategoryDetail : Screen("category/{categoryId}/{nameEn}/{nameUr}") {
        fun route(id: String, nameEn: String, nameUr: String) =
            "category/${id}/${nameEn.encodeUrl()}/${nameUr.encodeUrl()}"
    }
}

private fun String.encodeUrl() = java.net.URLEncoder.encode(this, "UTF-8")
private fun String.decodeUrl() = java.net.URLDecoder.decode(this, "UTF-8")

data class BottomNavItem(
    val screen: Screen,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
)

val bottomNavItems = listOf(
    BottomNavItem(Screen.Home,     "Home",     Icons.Default.Home),
    BottomNavItem(Screen.Library,  "Library",  Icons.Default.LibraryMusic),
    BottomNavItem(Screen.Schedule, "Schedule", Icons.Default.DateRange),
    BottomNavItem(Screen.Live,     "Live",     Icons.Default.PlayCircle),
    BottomNavItem(Screen.Profile,  "Profile",  Icons.Default.Person),
)

@Composable
fun AppNavGraph(
    navController: NavHostController = rememberNavController(),
    authViewModel: AuthViewModel,
    homeViewModel: HomeViewModel,
    libraryViewModel: LibraryViewModel,
    playerViewModelFactory: (String) -> PlayerViewModel,
    categoryDetailViewModelFactory: (String) -> CategoryDetailViewModel,
    liveSession: LiveSession?,
    scheduleList: List<ScheduledSession>,
    displayName: String,
    phone: String,
    userRole: String?,
    startDestination: String,
    onLogout: () -> Unit,
) {
    val currentEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentEntry?.destination?.route
    val noBottomNavRoutes = setOf(Screen.Login.route, Screen.Player.route, Screen.CategoryDetail.route)
    val showBottomNav = currentRoute !in noBottomNavRoutes

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                NavigationBar {
                    bottomNavItems.forEach { item ->
                        NavigationBarItem(
                            selected = currentRoute == item.screen.route,
                            onClick = {
                                navController.navigate(item.screen.route) {
                                    popUpTo(Screen.Home.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(item.icon, contentDescription = item.label) },
                            label = { Text(item.label) },
                        )
                    }
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(padding),
        ) {
            composable(Screen.Login.route) {
                LoginScreen(viewModel = authViewModel) {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            }
            composable(Screen.Home.route) {
                HomeScreen(viewModel = homeViewModel) { id ->
                    navController.navigate(Screen.Player.route(id))
                }
            }
            composable(Screen.Library.route) {
                LibraryScreen(viewModel = libraryViewModel) { cat ->
                    navController.navigate(
                        Screen.CategoryDetail.route(cat.id, cat.nameEn, cat.nameUr)
                    )
                }
            }
            composable(Screen.CategoryDetail.route) { backStack ->
                val categoryId = backStack.arguments?.getString("categoryId") ?: return@composable
                val nameEn = backStack.arguments?.getString("nameEn")?.decodeUrl() ?: ""
                val nameUr = backStack.arguments?.getString("nameUr")?.decodeUrl() ?: ""
                CategoryDetailScreen(
                    viewModel = categoryDetailViewModelFactory(categoryId),
                    categoryNameEn = nameEn,
                    categoryNameUr = nameUr,
                    onContentClick = { id -> navController.navigate(Screen.Player.route(id)) },
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Screen.Schedule.route) {
                ScheduleScreen(sessions = scheduleList)
            }
            composable(Screen.Live.route) {
                val context = LocalContext.current
                LiveScreen(session = liveSession, context = context)
            }
            composable(Screen.Profile.route) {
                ProfileScreen(
                    displayName = displayName,
                    phone = phone,
                    role = userRole,
                    onLogout = onLogout,
                )
            }
            composable(Screen.Player.route) { backStack ->
                val id = backStack.arguments?.getString("contentId") ?: return@composable
                PlayerScreen(viewModel = playerViewModelFactory(id), contentId = id)
            }
        }
    }
}
```

- [ ] **Step 2: Update KhanqahApp to instantiate new repositories and ViewModels**

Replace the entire file:

```kotlin
package com.khanqah.app

import android.app.Application
import com.khanqah.app.data.api.ApiClient
import com.khanqah.app.data.api.TokenManager
import com.khanqah.app.data.db.AppDatabase
import com.khanqah.app.data.repository.AuthRepository
import com.khanqah.app.data.repository.CategoryRepository
import com.khanqah.app.data.repository.ContentRepository
import com.khanqah.app.data.repository.ProgressRepository
import com.khanqah.app.ui.auth.AuthViewModel
import com.khanqah.app.ui.home.HomeViewModel
import com.khanqah.app.ui.library.CategoryDetailViewModel
import com.khanqah.app.ui.library.LibraryViewModel
import com.khanqah.app.ui.player.PlayerViewModel

class KhanqahApp : Application() {
    lateinit var tokenManager: TokenManager
    lateinit var authRepo: AuthRepository
    lateinit var contentRepo: ContentRepository
    lateinit var categoryRepo: CategoryRepository
    lateinit var progressRepo: ProgressRepository
    lateinit var authViewModel: AuthViewModel
    lateinit var homeViewModel: HomeViewModel
    lateinit var libraryViewModel: LibraryViewModel

    override fun onCreate() {
        super.onCreate()
        val db = AppDatabase.getInstance(this)
        tokenManager = TokenManager(this)
        val apiClient = ApiClient(tokenManager)
        authRepo = AuthRepository(apiClient.service, tokenManager)
        contentRepo = ContentRepository(apiClient.service, db)
        categoryRepo = CategoryRepository(apiClient.service, db)
        progressRepo = ProgressRepository(apiClient.service)
        authViewModel = AuthViewModel(authRepo)
        homeViewModel = HomeViewModel(contentRepo, apiClient.service)
        libraryViewModel = LibraryViewModel(categoryRepo)
    }

    fun makePlayerViewModel(contentId: String) =
        PlayerViewModel(contentRepo, progressRepo, this)

    fun makeCategoryDetailViewModel(categoryId: String) =
        CategoryDetailViewModel(contentRepo, progressRepo, categoryId)
}
```

- [ ] **Step 3: Update MainActivity to pass new fields**

Replace the entire file:

```kotlin
package com.khanqah.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.*
import com.khanqah.app.ui.navigation.AppNavGraph
import com.khanqah.app.ui.navigation.Screen
import com.khanqah.app.ui.theme.KhanqahTheme
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as KhanqahApp
        val isLoggedIn    = runBlocking { app.authRepo.isLoggedIn() }
        val initialRole   = runBlocking { app.authRepo.getRole() }
        val initialName   = runBlocking { app.authRepo.getDisplayName() }
        val initialPhone  = runBlocking { app.authRepo.getPhone() }

        setContent {
            KhanqahTheme {
                val live     by app.homeViewModel.live.collectAsState()
                val schedule by app.homeViewModel.schedule.collectAsState()
                var userRole      by remember { mutableStateOf(initialRole) }
                var displayName   by remember { mutableStateOf(initialName) }
                var phone         by remember { mutableStateOf(initialPhone) }
                val scope = rememberCoroutineScope()

                AppNavGraph(
                    authViewModel               = app.authViewModel,
                    homeViewModel               = app.homeViewModel,
                    libraryViewModel            = app.libraryViewModel,
                    playerViewModelFactory      = { app.makePlayerViewModel(it) },
                    categoryDetailViewModelFactory = { app.makeCategoryDetailViewModel(it) },
                    liveSession                 = live,
                    scheduleList                = schedule,
                    displayName                 = displayName,
                    phone                       = phone,
                    userRole                    = userRole,
                    startDestination            = if (isLoggedIn) Screen.Home.route else Screen.Login.route,
                    onLogout                    = {
                        scope.launch {
                            app.authRepo.logout()
                            userRole = null
                            displayName = ""
                            phone = ""
                        }
                    },
                )
            }
        }
    }
}
```

- [ ] **Step 4: Final build verification**

```bash
cd android && ./gradlew assembleDebug 2>&1 | tail -20
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/java/com/khanqah/app/ui/navigation/AppNavGraph.kt \
        android/app/src/main/java/com/khanqah/app/KhanqahApp.kt \
        android/app/src/main/java/com/khanqah/app/MainActivity.kt
git commit -m "feat(android): wire Library, CategoryDetail, Profile, progress into nav and DI"
```

---

## Task 10: Trigger APK Build via CI

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

- [ ] **Step 2: Trigger GitHub Actions APK build**

Go to: https://github.com/EnnBi/Khanqah/actions  
Select **"Build APKs"** workflow → **Run workflow** → branch: `main` → **Run workflow**

- [ ] **Step 3: Wait for workflow and download APK**

Expected: workflow completes in ~10 minutes. Download `app-debug.apk` from the workflow artifacts.

---

## Self-Review Notes

- **Spec coverage:** Theme ✓, Branding ✓, Login/Register ✓, Library ✓, CategoryDetail ✓, Progress ✓, Profile ✓, Nav ✓
- **No placeholders:** All code blocks are complete
- **Type consistency:** `NastaleeqFontFamily` defined in Task 1, used in Tasks 3/6/7/8. `UpsertProgressRequest` defined in Task 2, used in Task 4. `ProgressRepository` defined in Task 4, injected in Tasks 5/7/9. `CategoryDetailViewModel` factory signature consistent across Tasks 7 and 9.
- **`Image` import:** In LoginScreen and ProfileScreen, `androidx.compose.foundation.Image` is the correct import for `painterResource`. Verify at compile time — if the wrong `Image` is imported, switch to `androidx.compose.foundation.layout.Box` + `AsyncImage` with a local resource URI, or use `androidx.compose.ui.res.painterResource` directly with `androidx.compose.foundation.Image`.
