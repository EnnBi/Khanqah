# Android Admin App (Kotlin + Jetpack Compose) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate native Android app for editors, admins, and broadcasters — with file-picker uploads to R2, content/schedule management, go-live controls, team management, and bug reports. Listeners who try to log in are rejected.

**Architecture:** Same MVVM + Repository pattern as the user app. Shared API models. No offline cache (admins don't need it). Retrofit + OkHttp with auth interceptor. DataStore for tokens.

**Tech Stack:** Kotlin, Jetpack Compose, Retrofit 2, OkHttp, DataStore, Navigation Compose, Coil

**Branch:** `arch/separate-backend`

**Prerequisite:** Backend API (Plan 1) deployed and reachable.

---

## File Map

```
android-admin/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── java/com/khanqah/admin/
│           ├── MainActivity.kt
│           ├── AdminApp.kt                    ← Application class
│           ├── data/
│           │   ├── api/
│           │   │   ├── AdminApiService.kt     ← Retrofit interface (admin endpoints)
│           │   │   ├── ApiClient.kt           ← same pattern as user app
│           │   │   └── TokenManager.kt        ← DataStore tokens (same as user app)
│           │   ├── model/
│           │   │   └── Models.kt              ← shared API models
│           │   └── repository/
│           │       ├── AuthRepository.kt      ← phone OTP + role gate
│           │       ├── ContentAdminRepository.kt
│           │       ├── UploadRepository.kt    ← pre-signed URL + direct R2 upload
│           │       ├── ScheduleRepository.kt
│           │       ├── LiveRepository.kt
│           │       ├── TeamRepository.kt
│           │       └── BugRepository.kt
│           └── ui/
│               ├── theme/                     ← same theme as user app
│               ├── auth/
│               │   ├── LoginScreen.kt         ← rejects listener role
│               │   └── AuthViewModel.kt
│               ├── upload/
│               │   ├── UploadScreen.kt        ← file picker + progress + metadata form
│               │   └── UploadViewModel.kt
│               ├── content/
│               │   ├── ContentListScreen.kt
│               │   └── ContentViewModel.kt
│               ├── schedule/
│               │   ├── ScheduleScreen.kt
│               │   └── ScheduleViewModel.kt
│               ├── live/
│               │   ├── LiveScreen.kt          ← start/end live session
│               │   └── LiveViewModel.kt
│               ├── team/
│               │   ├── TeamScreen.kt
│               │   └── TeamViewModel.kt
│               ├── bugs/
│               │   ├── BugsScreen.kt
│               │   └── BugsViewModel.kt
│               └── navigation/
│                   └── AdminNavGraph.kt
```

---

## Task 1: Create Android project and configure dependencies

- [ ] **Step 1: Create project in Android Studio**

Open Android Studio → New Project → Empty Activity.

Settings:
- Name: `KhanqahAdmin`
- Package: `com.khanqah.admin`
- Save location: `/Users/nadymbaba/Documents/Workspace/Khanqah/android-admin`
- Language: Kotlin
- Minimum SDK: API 26
- Build config: Gradle (Kotlin DSL)

- [ ] **Step 2: Configure app/build.gradle.kts**

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.khanqah.admin"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.khanqah.admin"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "2.0.0"
    }
    buildFeatures { compose = true }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("io.coil-kt:coil-compose:2.7.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
```

- [ ] **Step 3: Add permissions to AndroidManifest.xml**

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
```

- [ ] **Step 4: Sync and verify BUILD SUCCESSFUL**

- [ ] **Step 5: Commit**

```bash
git add android-admin/
git commit -m "feat(android-admin): create Kotlin + Compose admin project"
```

---

## Task 2: Theme, models, TokenManager, ApiClient

These are essentially the same as the user app — copy and adapt.

- [ ] **Step 1: Copy theme**

Copy `android/app/src/main/java/com/khanqah/app/ui/theme/` to `android-admin/`, changing the package from `com.khanqah.app` to `com.khanqah.admin`.

- [ ] **Step 2: Write Models.kt (shared API models)**

`data/model/Models.kt`:
```kotlin
package com.khanqah.admin.data.model

import com.google.gson.annotations.SerializedName

data class AuthResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    val role: String,
)

data class Content(
    val id: String,
    @SerializedName("title_en") val titleEn: String,
    @SerializedName("title_ur") val titleUr: String,
    @SerializedName("media_url") val mediaUrl: String,
    @SerializedName("thumbnail_url") val thumbnailUrl: String?,
    val type: String,
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("is_video") val isVideo: Boolean,
)

data class Category(
    val id: String,
    @SerializedName("name_en") val nameEn: String,
    @SerializedName("name_ur") val nameUr: String,
    val type: String,
    @SerializedName("sort_order") val sortOrder: Int,
)

data class ScheduledSession(
    val id: String,
    @SerializedName("title_en") val titleEn: String,
    @SerializedName("title_ur") val titleUr: String,
    @SerializedName("scheduled_at") val scheduledAt: String,
    @SerializedName("is_recurring") val isRecurring: Boolean,
    @SerializedName("recurrence_rule") val recurrenceRule: String?,
)

data class LiveSession(
    val id: String,
    @SerializedName("title_en") val titleEn: String,
    @SerializedName("stream_url") val streamUrl: String,
    val status: String,
)

data class BugReport(
    val id: String,
    @SerializedName("client_id") val clientId: String,
    val type: String,
    val note: String?,
    val route: String,
    @SerializedName("app_version") val appVersion: String,
    val platform: String,
    val status: String,
    val timestamp: String,
    @SerializedName("created_at") val createdAt: String,
)

data class UploadUrlResponse(
    @SerializedName("upload_url") val uploadUrl: String,
    @SerializedName("file_key") val fileKey: String,
    @SerializedName("cdn_url") val cdnUrl: String,
)

data class User(
    val id: String,
    val phone: String,
    @SerializedName("display_name") val displayName: String,
    val role: String,
)
```

- [ ] **Step 3: Write TokenManager.kt** (identical to user app, different package)

```kotlin
package com.khanqah.admin.data.api

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("admin-auth")

class TokenManager(private val context: Context) {
    private val ACCESS = stringPreferencesKey("access_token")
    private val REFRESH = stringPreferencesKey("refresh_token")
    private val ROLE = stringPreferencesKey("role")

    suspend fun getAccessToken() = context.dataStore.data.map { it[ACCESS] }.first()
    suspend fun getRefreshToken() = context.dataStore.data.map { it[REFRESH] }.first()
    suspend fun getRole() = context.dataStore.data.map { it[ROLE] }.first()

    suspend fun saveTokens(access: String, refresh: String, role: String) {
        context.dataStore.edit { it[ACCESS] = access; it[REFRESH] = refresh; it[ROLE] = role }
    }

    suspend fun saveAccessToken(access: String) {
        context.dataStore.edit { it[ACCESS] = access }
    }

    suspend fun clear() = context.dataStore.edit { it.clear() }
}
```

- [ ] **Step 4: Write AdminApiService.kt**

```kotlin
package com.khanqah.admin.data.api

import com.khanqah.admin.data.model.*
import okhttp3.RequestBody
import retrofit2.http.*

interface AdminApiService {
    // Auth
    @POST("auth/otp/send")
    suspend fun sendOtp(@Body body: Map<String, String>): Map<String, String>

    @POST("auth/otp/verify")
    suspend fun verifyOtp(@Body body: Map<String, String>): AuthResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: Map<String, String>): Map<String, String>

    // Content
    @GET("content")
    suspend fun listContent(): List<Content>

    @POST("admin/upload")
    suspend fun getUploadUrl(@Body body: Map<String, String>): UploadUrlResponse

    @POST("admin/content")
    suspend fun createContent(@Body body: Map<String, Any?>): Content

    @PUT("admin/content/{id}")
    suspend fun updateContent(@Path("id") id: String, @Body body: Map<String, Any?>): Content

    @DELETE("admin/content/{id}")
    suspend fun deleteContent(@Path("id") id: String)

    // Categories
    @GET("categories")
    suspend fun listCategories(): List<Category>

    @POST("admin/categories")
    suspend fun createCategory(@Body body: Map<String, Any?>): Category

    @PUT("admin/categories/{id}")
    suspend fun updateCategory(@Path("id") id: String, @Body body: Map<String, Any?>): Category

    @DELETE("admin/categories/{id}")
    suspend fun deleteCategory(@Path("id") id: String)

    // Schedule
    @POST("admin/schedule")
    suspend fun createSession(@Body body: Map<String, Any?>): ScheduledSession

    @DELETE("admin/schedule/{id}")
    suspend fun deleteSession(@Path("id") id: String)

    // Live
    @POST("admin/live/start")
    suspend fun startLive(@Body body: Map<String, String>): LiveSession

    @POST("admin/live/end/{id}")
    suspend fun endLive(@Path("id") id: String): LiveSession

    @GET("live/current")
    suspend fun getCurrentLive(): LiveSession?

    // Team
    @GET("admin/team")
    suspend fun listTeam(): List<User>

    @PUT("admin/team/{id}/role")
    suspend fun updateRole(@Path("id") id: String, @Body body: Map<String, String>): User

    // Bugs
    @GET("admin/bugs")
    suspend fun listBugs(@Query("status") status: String? = null): List<BugReport>
}
```

- [ ] **Step 5: Write ApiClient.kt** (identical pattern to user app)

```kotlin
package com.khanqah.admin.data.api

import kotlinx.coroutines.runBlocking
import okhttp3.*
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

private const val BASE_URL = "https://khanqah.com/api/"

class ApiClient(private val tokenManager: TokenManager) {
    private val authInterceptor = Interceptor { chain ->
        val token = runBlocking { tokenManager.getAccessToken() }
        val req = if (token != null)
            chain.request().newBuilder().header("Authorization", "Bearer $token").build()
        else chain.request()
        chain.proceed(req)
    }

    private val refreshAuthenticator = object : Authenticator {
        override fun authenticate(route: Route?, response: Response): Request? {
            if (response.code != 401) return null
            val rt = runBlocking { tokenManager.getRefreshToken() } ?: return null
            return try {
                val newTokens = runBlocking {
                    buildBase().create(AdminApiService::class.java)
                        .refreshToken(mapOf("refresh_token" to rt))
                }
                val newAccess = newTokens["access_token"] ?: return null
                runBlocking { tokenManager.saveAccessToken(newAccess) }
                response.request.newBuilder().header("Authorization", "Bearer $newAccess").build()
            } catch (e: Exception) { null }
        }
    }

    val service: AdminApiService = buildWithAuth().create(AdminApiService::class.java)

    private fun buildBase(): Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
            .build())
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private fun buildWithAuth(): Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .authenticator(refreshAuthenticator)
            .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
            .build())
        .addConverterFactory(GsonConverterFactory.create())
        .build()
}
```

- [ ] **Step 6: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/data/
git commit -m "feat(android-admin): add API models, service, token manager, client"
```

---

## Task 3: Auth with role gate

**Files:**
- Create: `data/repository/AuthRepository.kt`
- Create: `ui/auth/AuthViewModel.kt`
- Create: `ui/auth/LoginScreen.kt`

- [ ] **Step 1: Write AuthRepository.kt**

```kotlin
package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService
import com.khanqah.admin.data.api.TokenManager

private val ADMIN_ROLES = setOf("editor", "admin", "broadcaster")

class AuthRepository(private val api: AdminApiService, private val tokenManager: TokenManager) {
    suspend fun sendOtp(phone: String) { api.sendOtp(mapOf("phone" to phone)) }

    suspend fun verifyOtp(phone: String, otp: String): Result<Unit> {
        return try {
            val result = api.verifyOtp(mapOf("phone" to phone, "otp" to otp))
            if (result.role !in ADMIN_ROLES) {
                Result.failure(Exception("This app is for admins only. Your account role is: ${result.role}"))
            } else {
                tokenManager.saveTokens(result.accessToken, result.refreshToken, result.role)
                Result.success(Unit)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getRole() = tokenManager.getRole()
    suspend fun isLoggedIn() = tokenManager.getAccessToken() != null
    suspend fun logout() = tokenManager.clear()
}
```

- [ ] **Step 2: Write AuthViewModel.kt**

```kotlin
package com.khanqah.admin.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.repository.AuthRepository
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
        try { repo.sendOtp(phone); _state.value = AuthState.OtpSent }
        catch (e: Exception) { _state.value = AuthState.Error(e.message ?: "Failed") }
    }

    fun verifyOtp(phone: String, otp: String) = viewModelScope.launch {
        _state.value = AuthState.Loading
        repo.verifyOtp(phone, otp)
            .onSuccess { _state.value = AuthState.Success }
            .onFailure { _state.value = AuthState.Error(it.message ?: "Failed") }
    }
}
```

- [ ] **Step 3: Write LoginScreen.kt**

```kotlin
package com.khanqah.admin.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(viewModel: AuthViewModel, onSuccess: () -> Unit) {
    val state by viewModel.state.collectAsState()
    var phone by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    val isOtpStep = state is AuthState.OtpSent

    LaunchedEffect(state) { if (state is AuthState.Success) onSuccess() }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Khanqah Admin", style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(bottom = 8.dp))
        Text("For editors, admins, and broadcasters only",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.outline,
            modifier = Modifier.padding(bottom = 32.dp))

        OutlinedTextField(value = phone, onValueChange = { phone = it },
            label = { Text("Phone number") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth(), enabled = !isOtpStep)

        if (isOtpStep) {
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(value = otp, onValueChange = { if (it.length <= 6) otp = it },
                label = { Text("6-digit code") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth())
        }

        Spacer(Modifier.height(24.dp))

        if (state is AuthState.Error) {
            Text((state as AuthState.Error).message, color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(bottom = 12.dp))
        }

        Button(
            onClick = { if (isOtpStep) viewModel.verifyOtp(phone, otp) else viewModel.sendOtp(phone) },
            enabled = state !is AuthState.Loading && (if (isOtpStep) otp.length == 6 else phone.isNotBlank()),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            if (state is AuthState.Loading)
                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary)
            else Text(if (isOtpStep) "Verify" else "Send OTP")
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/data/repository/AuthRepository.kt \
        android-admin/app/src/main/java/com/khanqah/admin/ui/auth/
git commit -m "feat(android-admin): add auth with admin role gate"
```

---

## Task 4: Upload screen (file picker → R2 → metadata)

**Files:**
- Create: `data/repository/UploadRepository.kt`
- Create: `ui/upload/UploadViewModel.kt`
- Create: `ui/upload/UploadScreen.kt`

- [ ] **Step 1: Write UploadRepository.kt**

```kotlin
package com.khanqah.admin.data.repository

import android.content.Context
import android.net.Uri
import com.khanqah.admin.data.api.AdminApiService
import com.khanqah.admin.data.model.Content
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import java.io.InputStream

class UploadRepository(private val api: AdminApiService, private val context: Context) {

    suspend fun uploadAndCreate(
        uri: Uri,
        filename: String,
        mimeType: String,
        titleEn: String,
        titleUr: String,
        type: String,
        categoryId: String,
        isVideo: Boolean,
        onProgress: (Int) -> Unit,
    ): Content = withContext(Dispatchers.IO) {
        // Step 1: get pre-signed URL
        val urlResp = api.getUploadUrl(mapOf("filename" to filename, "content_type" to mimeType))

        // Step 2: read file bytes
        val inputStream: InputStream = context.contentResolver.openInputStream(uri)
            ?: throw Exception("Cannot open file")
        val bytes = inputStream.readBytes()
        inputStream.close()

        // Step 3: upload directly to R2 with progress
        val client = OkHttpClient()
        val body = object : RequestBody() {
            override fun contentType() = mimeType.toMediaType()
            override fun contentLength() = bytes.size.toLong()
            override fun writeTo(sink: okio.BufferedSink) {
                val total = bytes.size.toLong()
                var written = 0L
                val chunkSize = 8192
                var offset = 0
                while (offset < bytes.size) {
                    val end = minOf(offset + chunkSize, bytes.size)
                    sink.write(bytes, offset, end - offset)
                    written += (end - offset)
                    onProgress((written * 100 / total).toInt())
                    offset = end
                }
            }
        }
        val request = Request.Builder().url(urlResp.uploadUrl)
            .put(body)
            .header("Content-Type", mimeType)
            .build()
        val response = client.newCall(request).execute()
        if (!response.isSuccessful) throw Exception("Upload failed: ${response.code}")

        // Step 4: save metadata
        api.createContent(mapOf(
            "title_en" to titleEn,
            "title_ur" to titleUr,
            "type" to type,
            "category_id" to categoryId,
            "media_url" to urlResp.cdnUrl,
            "is_video" to isVideo,
            "file_size" to bytes.size,
        ))
    }
}
```

- [ ] **Step 2: Write UploadViewModel.kt**

```kotlin
package com.khanqah.admin.ui.upload

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.repository.UploadRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface UploadState {
    object Idle : UploadState
    data class Uploading(val progress: Int) : UploadState
    object Done : UploadState
    data class Error(val message: String) : UploadState
}

class UploadViewModel(private val repo: UploadRepository) : ViewModel() {
    private val _state = MutableStateFlow<UploadState>(UploadState.Idle)
    val state = _state.asStateFlow()

    fun upload(
        uri: Uri, filename: String, mimeType: String,
        titleEn: String, titleUr: String, type: String,
        categoryId: String, isVideo: Boolean,
    ) = viewModelScope.launch {
        _state.value = UploadState.Uploading(0)
        try {
            repo.uploadAndCreate(
                uri, filename, mimeType, titleEn, titleUr, type, categoryId, isVideo,
                onProgress = { _state.value = UploadState.Uploading(it) }
            )
            _state.value = UploadState.Done
        } catch (e: Exception) {
            _state.value = UploadState.Error(e.message ?: "Upload failed")
        }
    }

    fun reset() { _state.value = UploadState.Idle }
}
```

- [ ] **Step 3: Write UploadScreen.kt**

```kotlin
package com.khanqah.admin.ui.upload

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.Category

@Composable
fun UploadScreen(viewModel: UploadViewModel, categories: List<Category>) {
    val context = LocalContext.current
    val state by viewModel.state.collectAsState()

    var fileUri by remember { mutableStateOf<Uri?>(null) }
    var fileName by remember { mutableStateOf("") }
    var mimeType by remember { mutableStateOf("") }
    var titleEn by remember { mutableStateOf("") }
    var titleUr by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("bayan") }
    var categoryId by remember { mutableStateOf("") }
    var isVideo by remember { mutableStateOf(false) }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            fileUri = it
            fileName = context.contentResolver.query(it, null, null, null, null)?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                cursor.moveToFirst(); cursor.getString(nameIndex)
            } ?: "file"
            mimeType = context.contentResolver.getType(it) ?: "application/octet-stream"
            isVideo = mimeType.startsWith("video/")
        }
    }

    LaunchedEffect(state) { if (state is UploadState.Done) viewModel.reset() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Upload Content", style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 20.dp))

        Box(
            modifier = Modifier.fillMaxWidth().height(100.dp)
                .border(1.dp, MaterialTheme.colorScheme.outline, MaterialTheme.shapes.medium)
                .clickable { launcher.launch("*/*") },
            contentAlignment = Alignment.Center
        ) {
            Text(if (fileUri != null) fileName else "Tap to choose file",
                color = if (fileUri != null) MaterialTheme.colorScheme.onSurface
                else MaterialTheme.colorScheme.outline)
        }

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(value = titleEn, onValueChange = { titleEn = it },
            label = { Text("Title (English)") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(value = titleUr, onValueChange = { titleUr = it },
            label = { Text("عنوان (اردو)") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))

        // Type dropdown
        var typeExpanded by remember { mutableStateOf(false) }
        val types = listOf("bayan", "clip", "nazam", "quran", "hamd_naat", "book", "mamulat")
        ExposedDropdownMenuBox(expanded = typeExpanded, onExpandedChange = { typeExpanded = it }) {
            OutlinedTextField(value = type, onValueChange = {}, readOnly = true,
                label = { Text("Type") }, modifier = Modifier.fillMaxWidth().menuAnchor(),
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(typeExpanded) })
            ExposedDropdownMenu(expanded = typeExpanded, onDismissRequest = { typeExpanded = false }) {
                types.forEach { t ->
                    DropdownMenuItem(text = { Text(t) }, onClick = { type = t; typeExpanded = false })
                }
            }
        }
        Spacer(Modifier.height(8.dp))

        // Category dropdown
        var catExpanded by remember { mutableStateOf(false) }
        val selectedCat = categories.find { it.id == categoryId }
        ExposedDropdownMenuBox(expanded = catExpanded, onExpandedChange = { catExpanded = it }) {
            OutlinedTextField(value = selectedCat?.nameEn ?: "", onValueChange = {}, readOnly = true,
                label = { Text("Category") }, modifier = Modifier.fillMaxWidth().menuAnchor(),
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(catExpanded) })
            ExposedDropdownMenu(expanded = catExpanded, onDismissRequest = { catExpanded = false }) {
                categories.forEach { c ->
                    DropdownMenuItem(text = { Text(c.nameEn) }, onClick = { categoryId = c.id; catExpanded = false })
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        when (val s = state) {
            is UploadState.Uploading -> {
                LinearProgressIndicator(progress = { s.progress / 100f }, modifier = Modifier.fillMaxWidth())
                Text("${s.progress}% uploaded", style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.outline, modifier = Modifier.padding(top = 4.dp))
            }
            is UploadState.Error -> Text(s.message, color = MaterialTheme.colorScheme.error)
            is UploadState.Done -> Text("Uploaded successfully!", color = MaterialTheme.colorScheme.primary)
            else -> {}
        }

        Spacer(Modifier.height(16.dp))

        Button(
            onClick = {
                fileUri?.let { uri ->
                    viewModel.upload(uri, fileName, mimeType, titleEn, titleUr, type, categoryId, isVideo)
                }
            },
            enabled = fileUri != null && titleEn.isNotBlank() && categoryId.isNotBlank()
                && state !is UploadState.Uploading,
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text(if (state is UploadState.Uploading) "Uploading..." else "Upload")
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/data/repository/UploadRepository.kt \
        android-admin/app/src/main/java/com/khanqah/admin/ui/upload/
git commit -m "feat(android-admin): add file picker upload screen with R2 direct upload"
```

---

## Task 5: Content list, Team, and Bug report screens

- [ ] **Step 1: Write ContentListScreen.kt**

```kotlin
package com.khanqah.admin.ui.content

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.Content

@Composable
fun ContentListScreen(
    items: List<Content>,
    onDelete: (String) -> Unit,
    onUploadClick: () -> Unit,
) {
    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = onUploadClick) { Text("+") }
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            item { Text("Content", style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(bottom = 16.dp)) }
            items(items) { item ->
                Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(item.titleEn, style = MaterialTheme.typography.titleLarge)
                            Text(item.type, style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.outline)
                        }
                        TextButton(onClick = { onDelete(item.id) }) {
                            Text("Delete", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 2: Write TeamScreen.kt**

```kotlin
package com.khanqah.admin.ui.team

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.User

private val ROLES = listOf("listener", "editor", "admin", "broadcaster")

@Composable
fun TeamScreen(users: List<User>, onRoleChange: (String, String) -> Unit) {
    LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
        item { Text("Team", style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 16.dp)) }
        items(users) { user ->
            var expanded by remember { mutableStateOf(false) }
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(user.displayName.ifBlank { user.phone },
                            style = MaterialTheme.typography.titleLarge)
                        Text(user.phone, style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.outline)
                    }
                    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                        TextButton(onClick = { expanded = true },
                            modifier = Modifier.menuAnchor()) {
                            Text(user.role)
                        }
                        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            ROLES.forEach { role ->
                                DropdownMenuItem(text = { Text(role) }, onClick = {
                                    onRoleChange(user.id, role); expanded = false
                                })
                            }
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 3: Write BugsScreen.kt**

```kotlin
package com.khanqah.admin.ui.bugs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.BugReport

@Composable
fun BugsScreen(reports: List<BugReport>) {
    LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
        item { Text("Bug Reports", style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 16.dp)) }
        items(reports) { r ->
            Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SuggestionChip(onClick = {}, label = { Text(r.status) })
                        SuggestionChip(onClick = {}, label = { Text(r.platform) })
                        SuggestionChip(onClick = {}, label = { Text("v${r.appVersion}") })
                    }
                    r.note?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(it, style = MaterialTheme.typography.bodyLarge)
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(r.timestamp, style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.outline)
                }
            }
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/content/ \
        android-admin/app/src/main/java/com/khanqah/admin/ui/team/ \
        android-admin/app/src/main/java/com/khanqah/admin/ui/bugs/
git commit -m "feat(android-admin): add content list, team, and bug report screens"
```

---

## Task 6: Schedule and Live screens

- [ ] **Step 1: Write ScheduleScreen.kt**

```kotlin
package com.khanqah.admin.ui.schedule

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.ScheduledSession

@Composable
fun ScheduleScreen(
    sessions: List<ScheduledSession>,
    onDelete: (String) -> Unit,
    onCreate: (titleEn: String, titleUr: String, scheduledAt: String) -> Unit,
) {
    var showDialog by remember { mutableStateOf(false) }
    var titleEn by remember { mutableStateOf("") }
    var titleUr by remember { mutableStateOf("") }
    var scheduledAt by remember { mutableStateOf("") }

    if (showDialog) {
        AlertDialog(onDismissRequest = { showDialog = false },
            title = { Text("New Session") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = titleEn, onValueChange = { titleEn = it }, label = { Text("Title EN") })
                    OutlinedTextField(value = titleUr, onValueChange = { titleUr = it }, label = { Text("Title UR") })
                    OutlinedTextField(value = scheduledAt, onValueChange = { scheduledAt = it },
                        label = { Text("Date/Time (ISO 8601)") }, placeholder = { Text("2026-06-01T18:00:00Z") })
                }
            },
            confirmButton = {
                TextButton(onClick = { onCreate(titleEn, titleUr, scheduledAt); showDialog = false }) { Text("Create") }
            },
            dismissButton = { TextButton(onClick = { showDialog = false }) { Text("Cancel") } }
        )
    }

    Scaffold(
        floatingActionButton = { FloatingActionButton(onClick = { showDialog = true }) { Text("+") } }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            item { Text("Schedule", style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(bottom = 16.dp)) }
            items(sessions) { s ->
                Card(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                    Row(Modifier.padding(16.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text(s.titleEn, style = MaterialTheme.typography.titleLarge)
                            Text(s.scheduledAt, style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.outline)
                        }
                        TextButton(onClick = { onDelete(s.id) }) {
                            Text("Delete", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 2: Write LiveScreen.kt**

```kotlin
package com.khanqah.admin.ui.live

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.khanqah.admin.data.model.LiveSession

@Composable
fun LiveScreen(
    currentSession: LiveSession?,
    onStart: (titleEn: String, titleUr: String, streamUrl: String) -> Unit,
    onEnd: (id: String) -> Unit,
) {
    var showDialog by remember { mutableStateOf(false) }
    var titleEn by remember { mutableStateOf("") }
    var titleUr by remember { mutableStateOf("") }
    var streamUrl by remember { mutableStateOf("") }

    if (showDialog) {
        AlertDialog(onDismissRequest = { showDialog = false },
            title = { Text("Start Live Session") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = titleEn, onValueChange = { titleEn = it }, label = { Text("Title EN") })
                    OutlinedTextField(value = titleUr, onValueChange = { titleUr = it }, label = { Text("Title UR") })
                    OutlinedTextField(value = streamUrl, onValueChange = { streamUrl = it },
                        label = { Text("Stream URL (HLS)") }, placeholder = { Text("https://...") })
                }
            },
            confirmButton = {
                TextButton(onClick = { onStart(titleEn, titleUr, streamUrl); showDialog = false }) { Text("Go Live") }
            },
            dismissButton = { TextButton(onClick = { showDialog = false }) { Text("Cancel") } }
        )
    }

    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally) {
        if (currentSession != null) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 8.dp)) {
                Text("●", color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.width(8.dp))
                Text("LIVE: ${currentSession.titleEn}", style = MaterialTheme.typography.headlineMedium)
            }
            Spacer(Modifier.height(16.dp))
            Button(onClick = { onEnd(currentSession.id) }, colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error)) {
                Text("End Live Session")
            }
        } else {
            Text("No live session active", style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.outline, modifier = Modifier.padding(bottom = 24.dp))
            Button(onClick = { showDialog = true }) { Text("Go Live") }
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/schedule/ \
        android-admin/app/src/main/java/com/khanqah/admin/ui/live/
git commit -m "feat(android-admin): add schedule and live management screens"
```

---

## Task 7: Navigation and Application class

- [ ] **Step 1: Write AdminNavGraph.kt**

```kotlin
package com.khanqah.admin.ui.navigation

import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.khanqah.admin.AdminApp
import com.khanqah.admin.ui.auth.LoginScreen
import com.khanqah.admin.ui.bugs.BugsScreen
import com.khanqah.admin.ui.content.ContentListScreen
import com.khanqah.admin.ui.live.LiveScreen
import com.khanqah.admin.ui.schedule.ScheduleScreen
import com.khanqah.admin.ui.team.TeamScreen
import com.khanqah.admin.ui.upload.UploadScreen
import kotlinx.coroutines.launch

@Composable
fun AdminNavGraph(app: AdminApp, startDestination: String) {
    val navController = rememberNavController()
    val scope = rememberCoroutineScope()

    NavHost(navController = navController, startDestination = startDestination) {
        composable("login") {
            LoginScreen(viewModel = app.authViewModel) {
                navController.navigate("content") { popUpTo("login") { inclusive = true } }
            }
        }
        composable("content") {
            val items by app.contentViewModel.items.collectAsState()
            ContentListScreen(items = items,
                onDelete = { id -> scope.launch { app.contentViewModel.delete(id) } },
                onUploadClick = { navController.navigate("upload") })
        }
        composable("upload") {
            val categories by app.contentViewModel.categories.collectAsState()
            UploadScreen(viewModel = app.uploadViewModel, categories = categories)
        }
        composable("schedule") {
            val sessions by app.scheduleViewModel.sessions.collectAsState()
            ScheduleScreen(sessions = sessions,
                onDelete = { id -> scope.launch { app.scheduleViewModel.delete(id) } },
                onCreate = { en, ur, at -> scope.launch { app.scheduleViewModel.create(en, ur, at) } })
        }
        composable("live") {
            val session by app.liveViewModel.currentSession.collectAsState()
            LiveScreen(currentSession = session,
                onStart = { en, ur, url -> scope.launch { app.liveViewModel.start(en, ur, url) } },
                onEnd = { id -> scope.launch { app.liveViewModel.end(id) } })
        }
        composable("team") {
            val users by app.teamViewModel.users.collectAsState()
            TeamScreen(users = users,
                onRoleChange = { id, role -> scope.launch { app.teamViewModel.updateRole(id, role) } })
        }
        composable("bugs") {
            val reports by app.bugsViewModel.reports.collectAsState()
            BugsScreen(reports = reports)
        }
    }
}
```

- [ ] **Step 2: Write AdminApp.kt**

```kotlin
package com.khanqah.admin

import android.app.Application
import com.khanqah.admin.data.api.ApiClient
import com.khanqah.admin.data.api.TokenManager
import com.khanqah.admin.data.repository.*
import com.khanqah.admin.ui.auth.AuthViewModel
import com.khanqah.admin.ui.bugs.BugsViewModel
import com.khanqah.admin.ui.content.ContentViewModel
import com.khanqah.admin.ui.live.LiveViewModel
import com.khanqah.admin.ui.schedule.ScheduleViewModel
import com.khanqah.admin.ui.team.TeamViewModel
import com.khanqah.admin.ui.upload.UploadViewModel

class AdminApp : Application() {
    lateinit var authViewModel: AuthViewModel
    lateinit var contentViewModel: ContentViewModel
    lateinit var uploadViewModel: UploadViewModel
    lateinit var scheduleViewModel: ScheduleViewModel
    lateinit var liveViewModel: LiveViewModel
    lateinit var teamViewModel: TeamViewModel
    lateinit var bugsViewModel: BugsViewModel

    override fun onCreate() {
        super.onCreate()
        val tokenManager = TokenManager(this)
        val api = ApiClient(tokenManager).service

        authViewModel = AuthViewModel(AuthRepository(api, tokenManager))
        contentViewModel = ContentViewModel(ContentAdminRepository(api))
        uploadViewModel = UploadViewModel(UploadRepository(api, this))
        scheduleViewModel = ScheduleViewModel(ScheduleRepository(api))
        liveViewModel = LiveViewModel(LiveRepository(api))
        teamViewModel = TeamViewModel(TeamRepository(api))
        bugsViewModel = BugsViewModel(BugRepository(api))
    }
}
```

Register in `AndroidManifest.xml`: `android:name=".AdminApp"`

- [ ] **Step 3: Write remaining ViewModels (ContentViewModel, ScheduleViewModel, LiveViewModel, TeamViewModel, BugsViewModel)**

Each follows the same pattern — `init { viewModelScope.launch { refresh() } }`, `StateFlow<List<T>>`, and action functions (`delete`, `create`, etc.). Create one file per ViewModel in the relevant `ui/` package.

`ContentViewModel.kt` example:
```kotlin
package com.khanqah.admin.ui.content

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.model.Content
import com.khanqah.admin.data.repository.ContentAdminRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ContentViewModel(private val repo: ContentAdminRepository) : ViewModel() {
    private val _items = MutableStateFlow<List<Content>>(emptyList())
    val items = _items.asStateFlow()
    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories = _categories.asStateFlow()

    init {
        viewModelScope.launch { _items.value = repo.listContent() }
        viewModelScope.launch { _categories.value = repo.listCategories() }
    }

    fun delete(id: String) = viewModelScope.launch {
        repo.deleteContent(id)
        _items.value = _items.value.filter { it.id != id }
    }
}
```

Apply the same pattern for `ScheduleViewModel`, `LiveViewModel`, `TeamViewModel`, `BugsViewModel`.

- [ ] **Step 4: Write remaining Repository stubs**

`ContentAdminRepository.kt`:
```kotlin
package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class ContentAdminRepository(private val api: AdminApiService) {
    suspend fun listContent() = api.listContent()
    suspend fun listCategories() = api.listCategories()
    suspend fun deleteContent(id: String) = api.deleteContent(id)
}
```

`ScheduleRepository.kt`:
```kotlin
class ScheduleRepository(private val api: AdminApiService) {
    suspend fun list() = api.listSchedule() // add this endpoint to AdminApiService
    suspend fun create(titleEn: String, titleUr: String, scheduledAt: String) =
        api.createSession(mapOf("title_en" to titleEn, "title_ur" to titleUr, "scheduled_at" to scheduledAt))
    suspend fun delete(id: String) = api.deleteSession(id)
}
```

`LiveRepository.kt`:
```kotlin
class LiveRepository(private val api: AdminApiService) {
    suspend fun getCurrent() = api.getCurrentLive()
    suspend fun start(titleEn: String, titleUr: String, streamUrl: String) =
        api.startLive(mapOf("title_en" to titleEn, "title_ur" to titleUr, "stream_url" to streamUrl))
    suspend fun end(id: String) = api.endLive(id)
}
```

`TeamRepository.kt`:
```kotlin
class TeamRepository(private val api: AdminApiService) {
    suspend fun list() = api.listTeam()
    suspend fun updateRole(id: String, role: String) = api.updateRole(id, mapOf("role" to role))
}
```

`BugRepository.kt`:
```kotlin
class BugRepository(private val api: AdminApiService) {
    suspend fun list() = api.listBugs()
}
```

- [ ] **Step 5: Build and run on emulator**

```
Run → Run 'app'
```
Expected: Login screen. Enter admin phone. Receive OTP. Verify. See content list with upload FAB.

- [ ] **Step 6: Commit**

```bash
git add android-admin/
git commit -m "feat(android-admin): wire navigation, app class, viewmodels — admin app boots end-to-end"
```
