# Admin App Full Modules — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all admin modules into bottom-tab navigation and upgrade each screen to full CRUD parity with the web admin panel.

**Architecture:** Flat routes in a single `AdminNavGraph` with a `Scaffold`/`BottomNavBar` visible only on the 4 tab-level routes (`home`, `content`, `schedule`, `more`). `AdminApp` holds all ViewModels. `HomeScreen` replaces `LiveScreen` as the Live tab, adding dashboard stats tiles. All other screens (Team, Categories, Bugs) are sub-routes under the More tab.

**Tech Stack:** Kotlin, Jetpack Compose + Material3, Retrofit2 + Gson, kotlinx.coroutines StateFlow, `androidx.navigation:navigation-compose`, `compose.material.icons.extended` (already in deps).

---

## File Map

| File | Action |
|------|--------|
| `data/api/AdminApiService.kt` | Add `updateSession`, `updateUserName`, `deleteUser` |
| `data/repository/ScheduleRepository.kt` | Add `update()`, extend `create()` with recurrence params |
| `data/repository/TeamRepository.kt` | Add `deleteUser()`, `updateName()` |
| `data/repository/CategoryRepository.kt` | **New** |
| `ui/categories/CategoryViewModel.kt` | **New** |
| `ui/home/HomeViewModel.kt` | **New** |
| `AdminApp.kt` | Add `categoryViewModel`, `homeViewModel` |
| `ui/live/LiveScreen.kt` | Remove `private` from `LiveOnAirScreen`, `NextSessionCard`, `nextUpcoming`, `parseDateParts` |
| `ui/navigation/BottomNavBar.kt` | **New** |
| `ui/navigation/AdminNavGraph.kt` | Full rewrite — all routes + Scaffold/BottomNavBar |
| `ui/home/HomeScreen.kt` | **New** |
| `ui/more/MoreScreen.kt` | **New** |
| `ui/content/ContentListScreen.kt` | Add inline edit expand + onUpdate param |
| `ui/content/ContentViewModel.kt` | Add `update()` |
| `data/repository/ContentAdminRepository.kt` | Add `updateContent()` |
| `ui/schedule/ScheduleScreen.kt` | Rewrite — add edit, DatePickerDialog, TimePickerDialog, frequency |
| `ui/schedule/ScheduleViewModel.kt` | Add `update()`, extend `create()` with recurrence params |
| `ui/team/TeamScreen.kt` | Add delete + name edit |
| `ui/team/TeamViewModel.kt` | Add `deleteUser()`, `updateName()` |
| `ui/categories/CategoryScreen.kt` | **New** |

All paths are relative to `android-admin/app/src/main/java/com/khanqah/admin/`.

---

## Task 1: Create branch

**Files:** none

- [ ] **Step 1: Create and checkout branch**

```bash
git checkout -b feature/admin-app-modules
```

- [ ] **Step 2: Verify**

```bash
git branch
# * feature/admin-app-modules
```

---

## Task 2: AdminApiService — add missing endpoints; fix Category model

**Files:**
- Modify: `data/model/Models.kt`
- Modify: `data/api/AdminApiService.kt`

- [ ] **Step 1: Add `slug` field to Category model**

In `android-admin/app/src/main/java/com/khanqah/admin/data/model/Models.kt`, update the `Category` data class to add the optional `slug` field (used to identify system/non-deletable categories):

```kotlin
data class Category(
    val id: String,
    @SerializedName("name_en") val nameEn: String,
    @SerializedName("name_ur") val nameUr: String,
    val type: String,
    @SerializedName("sort_order") val sortOrder: Int,
    val slug: String? = null,
)
```

- [ ] **Step 2: Add three new endpoint declarations**

Open `android-admin/app/src/main/java/com/khanqah/admin/data/api/AdminApiService.kt`. After `deleteSession`, add:

```kotlin
    @PUT("admin/schedule/{id}")
    suspend fun updateSession(@Path("id") id: String, @Body body: Map<String, Any?>): ScheduledSession
```

After `updateRole`, add:

```kotlin
    @PUT("admin/team/{id}/name")
    suspend fun updateUserName(@Path("id") id: String, @Body body: Map<String, String>): User

    @DELETE("admin/team/{id}")
    suspend fun deleteUser(@Path("id") id: String)
```

- [ ] **Step 3: Verify compile**

```bash
cd android-admin && ./gradlew :app:compileDebugKotlin 2>&1 | tail -5
# Expected: BUILD SUCCESSFUL
```

- [ ] **Step 4: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
# Expected: BUILD SUCCESSFUL
```

- [ ] **Step 5: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/data/model/Models.kt
git add android-admin/app/src/main/java/com/khanqah/admin/data/api/AdminApiService.kt
git commit -m "feat(admin): add slug to Category model; add updateSession, updateUserName, deleteUser endpoints"
```

---

## Task 3: Repository layer — extend ScheduleRepository, TeamRepository; create CategoryRepository

**Files:**
- Modify: `data/repository/ScheduleRepository.kt`
- Modify: `data/repository/TeamRepository.kt`
- Create: `data/repository/CategoryRepository.kt`

- [ ] **Step 1: Rewrite ScheduleRepository with recurrence + update**

Replace the entire content of `android-admin/app/src/main/java/com/khanqah/admin/data/repository/ScheduleRepository.kt`:

```kotlin
package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class ScheduleRepository(private val api: AdminApiService) {
    suspend fun list() = api.listSchedule()

    suspend fun create(
        titleEn: String, titleUr: String, scheduledAt: String,
        isRecurring: Boolean, recurrenceRule: String?,
    ) = api.createSession(
        mapOf(
            "title_en" to titleEn,
            "title_ur" to titleUr,
            "scheduled_at" to scheduledAt,
            "is_recurring" to isRecurring,
            "recurrence_rule" to recurrenceRule,
        )
    )

    suspend fun update(
        id: String,
        titleEn: String, titleUr: String, scheduledAt: String,
        isRecurring: Boolean, recurrenceRule: String?,
    ) = api.updateSession(
        id,
        mapOf(
            "title_en" to titleEn,
            "title_ur" to titleUr,
            "scheduled_at" to scheduledAt,
            "is_recurring" to isRecurring,
            "recurrence_rule" to recurrenceRule,
        )
    )

    suspend fun delete(id: String) = api.deleteSession(id)
}
```

- [ ] **Step 2: Rewrite TeamRepository with delete + name update**

Replace the entire content of `android-admin/app/src/main/java/com/khanqah/admin/data/repository/TeamRepository.kt`:

```kotlin
package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class TeamRepository(private val api: AdminApiService) {
    suspend fun list() = api.listTeam()
    suspend fun updateRole(id: String, role: String) = api.updateRole(id, mapOf("role" to role))
    suspend fun updateName(id: String, name: String) = api.updateUserName(id, mapOf("display_name" to name))
    suspend fun deleteUser(id: String) = api.deleteUser(id)
}
```

- [ ] **Step 3: Create CategoryRepository**

Create `android-admin/app/src/main/java/com/khanqah/admin/data/repository/CategoryRepository.kt`:

```kotlin
package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class CategoryRepository(private val api: AdminApiService) {
    suspend fun list() = api.listCategories()
    suspend fun create(nameEn: String, nameUr: String) =
        api.createCategory(mapOf("name_en" to nameEn, "name_ur" to nameUr))
    suspend fun update(id: String, nameEn: String, nameUr: String) =
        api.updateCategory(id, mapOf("name_en" to nameEn, "name_ur" to nameUr))
    suspend fun delete(id: String) = api.deleteCategory(id)
}
```

- [ ] **Step 4: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
# Expected: BUILD SUCCESSFUL
```

- [ ] **Step 5: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/data/repository/
git commit -m "feat(admin): extend Schedule/Team repos + add CategoryRepository"
```

---

## Task 4: CategoryViewModel

**Files:**
- Create: `ui/categories/CategoryViewModel.kt`

- [ ] **Step 1: Create the directory and ViewModel**

```bash
mkdir -p android-admin/app/src/main/java/com/khanqah/admin/ui/categories
```

Create `android-admin/app/src/main/java/com/khanqah/admin/ui/categories/CategoryViewModel.kt`:

```kotlin
package com.khanqah.admin.ui.categories

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.repository.CategoryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class CategoryViewModel(private val repo: CategoryRepository) : ViewModel() {
    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories = _categories.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        try { _categories.value = repo.list() } catch (_: Exception) {}
    }

    fun create(nameEn: String, nameUr: String) = viewModelScope.launch {
        try {
            val new = repo.create(nameEn, nameUr)
            _categories.value = _categories.value + new
        } catch (_: Exception) {}
    }

    fun update(id: String, nameEn: String, nameUr: String) = viewModelScope.launch {
        try {
            val updated = repo.update(id, nameEn, nameUr)
            _categories.value = _categories.value.map { if (it.id == id) updated else it }
        } catch (_: Exception) {}
    }

    fun delete(id: String) = viewModelScope.launch {
        try {
            repo.delete(id)
            _categories.value = _categories.value.filter { it.id != id }
        } catch (_: Exception) {}
    }
}
```

- [ ] **Step 2: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/categories/CategoryViewModel.kt
git commit -m "feat(admin): add CategoryViewModel"
```

---

## Task 5: HomeViewModel

**Files:**
- Create: `ui/home/HomeViewModel.kt`

- [ ] **Step 1: Create directory and ViewModel**

```bash
mkdir -p android-admin/app/src/main/java/com/khanqah/admin/ui/home
```

Create `android-admin/app/src/main/java/com/khanqah/admin/ui/home/HomeViewModel.kt`:

```kotlin
package com.khanqah.admin.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.ScheduledSession
import com.khanqah.admin.data.repository.BugRepository
import com.khanqah.admin.data.repository.ContentAdminRepository
import com.khanqah.admin.data.repository.ScheduleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.Instant

class HomeViewModel(
    private val contentRepo: ContentAdminRepository,
    private val scheduleRepo: ScheduleRepository,
    private val bugRepo: BugRepository,
) : ViewModel() {
    private val _contentCount = MutableStateFlow(0)
    val contentCount = _contentCount.asStateFlow()

    private val _nextSession = MutableStateFlow<ScheduledSession?>(null)
    val nextSession = _nextSession.asStateFlow()

    private val _openBugCount = MutableStateFlow(0)
    val openBugCount = _openBugCount.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            try { _contentCount.value = contentRepo.listContent().size } catch (_: Exception) {}
        }
        viewModelScope.launch {
            try {
                val now = Instant.now()
                _nextSession.value = scheduleRepo.list()
                    .filter { s ->
                        runCatching { Instant.parse(s.scheduledAt).isAfter(now) }.getOrDefault(false)
                            || s.isRecurring
                    }
                    .minByOrNull { s ->
                        runCatching { Instant.parse(s.scheduledAt).toEpochMilli() }.getOrDefault(Long.MAX_VALUE)
                    }
            } catch (_: Exception) {}
        }
        viewModelScope.launch {
            try {
                _openBugCount.value = bugRepo.list().count { it.status == "open" }
            } catch (_: Exception) {}
        }
    }
}
```

- [ ] **Step 2: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/home/HomeViewModel.kt
git commit -m "feat(admin): add HomeViewModel for dashboard stats"
```

---

## Task 6: Update AdminApp

**Files:**
- Modify: `AdminApp.kt`

- [ ] **Step 1: Add CategoryViewModel and HomeViewModel to AdminApp**

Replace entire `AdminApp.kt`:

```kotlin
package com.khanqah.admin

import android.app.Application
import com.khanqah.admin.data.api.ApiClient
import com.khanqah.admin.data.api.TokenManager
import com.khanqah.admin.data.repository.*
import com.khanqah.admin.ui.auth.AuthViewModel
import com.khanqah.admin.ui.bugs.BugsViewModel
import com.khanqah.admin.ui.categories.CategoryViewModel
import com.khanqah.admin.ui.content.ContentViewModel
import com.khanqah.admin.ui.home.HomeViewModel
import com.khanqah.admin.ui.live.LiveViewModel
import com.khanqah.admin.ui.schedule.ScheduleViewModel
import com.khanqah.admin.ui.team.TeamViewModel
import com.khanqah.admin.ui.upload.UploadViewModel

class AdminApp : Application() {
    lateinit var authRepo: AuthRepository
    lateinit var authViewModel: AuthViewModel
    lateinit var contentViewModel: ContentViewModel
    lateinit var uploadViewModel: UploadViewModel
    lateinit var scheduleViewModel: ScheduleViewModel
    lateinit var liveViewModel: LiveViewModel
    lateinit var teamViewModel: TeamViewModel
    lateinit var bugsViewModel: BugsViewModel
    lateinit var categoryViewModel: CategoryViewModel
    lateinit var homeViewModel: HomeViewModel

    override fun onCreate() {
        super.onCreate()
        BroadcastForegroundService.createChannel(this)
        val tokenManager = TokenManager(this)
        val api = ApiClient(tokenManager).service
        val contentRepo = ContentAdminRepository(api)
        val scheduleRepo = ScheduleRepository(api)
        val bugRepo = BugRepository(api)

        authRepo = AuthRepository(api, tokenManager)
        authViewModel = AuthViewModel(authRepo)
        contentViewModel = ContentViewModel(contentRepo)
        uploadViewModel = UploadViewModel(UploadRepository(api, this))
        scheduleViewModel = ScheduleViewModel(scheduleRepo)
        liveViewModel = LiveViewModel(LiveRepository(api))
        teamViewModel = TeamViewModel(TeamRepository(api))
        bugsViewModel = BugsViewModel(bugRepo)
        categoryViewModel = CategoryViewModel(CategoryRepository(api))
        homeViewModel = HomeViewModel(contentRepo, scheduleRepo, bugRepo)
    }
}
```

- [ ] **Step 2: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/AdminApp.kt
git commit -m "feat(admin): add CategoryViewModel + HomeViewModel to AdminApp"
```

---

## Task 7: Refactor LiveScreen — expose composables for HomeScreen

**Files:**
- Modify: `ui/live/LiveScreen.kt`

The on-air screen and related helpers are currently `private`. HomeScreen needs to call them. Remove the `private` modifier from four functions.

- [ ] **Step 1: Make LiveOnAirScreen, NextSessionCard, nextUpcoming, parseDateParts non-private**

In `android-admin/app/src/main/java/com/khanqah/admin/ui/live/LiveScreen.kt`, make these four changes:

```
// Line ~317: change
private fun LiveOnAirScreen(
// to:
internal fun LiveOnAirScreen(

// Line ~465: change
private fun NextSessionCard(
// to:
internal fun NextSessionCard(

// Line ~598: change
private fun List<ScheduledSession>.nextUpcoming():
// to:
internal fun List<ScheduledSession>.nextUpcoming():

// Line ~621: change
private fun parseDateParts(
// to:
internal fun parseDateParts(
```

- [ ] **Step 2: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/live/LiveScreen.kt
git commit -m "refactor(admin): expose LiveOnAirScreen + helpers for HomeScreen"
```

---

## Task 8: BottomNavBar + AdminNavGraph rewrite

**Files:**
- Create: `ui/navigation/BottomNavBar.kt`
- Modify: `ui/navigation/AdminNavGraph.kt`

- [ ] **Step 1: Create BottomNavBar**

Create `android-admin/app/src/main/java/com/khanqah/admin/ui/navigation/BottomNavBar.kt`:

```kotlin
package com.khanqah.admin.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.List
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import com.khanqah.admin.ui.theme.*

@Composable
fun AdminBottomNavBar(currentRoute: String, onNavigate: (String) -> Unit) {
    NavigationBar(containerColor = AdminSurface) {
        listOf(
            Triple("home",     "Live",     Icons.Outlined.Mic),
            Triple("content",  "Content",  Icons.Outlined.List),
            Triple("schedule", "Schedule", Icons.Outlined.CalendarMonth),
            Triple("more",     "More",     Icons.Outlined.MoreHoriz),
        ).forEach { (route, label, icon) ->
            NavigationBarItem(
                selected = currentRoute == route,
                onClick  = { onNavigate(route) },
                icon     = { Icon(icon, contentDescription = label) },
                label    = { Text(label) },
                colors   = NavigationBarItemDefaults.colors(
                    selectedIconColor   = AdminGold,
                    selectedTextColor   = AdminGold,
                    unselectedIconColor = AdminCream.copy(alpha = 0.45f),
                    unselectedTextColor = AdminCream.copy(alpha = 0.45f),
                    indicatorColor      = AdminGold.copy(alpha = 0.15f),
                ),
            )
        }
    }
}
```

- [ ] **Step 2: Rewrite AdminNavGraph**

Replace the entire content of `android-admin/app/src/main/java/com/khanqah/admin/ui/navigation/AdminNavGraph.kt`:

```kotlin
package com.khanqah.admin.ui.navigation

import android.content.Intent
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.khanqah.admin.AdminApp
import com.khanqah.admin.BroadcastForegroundService
import com.khanqah.admin.ui.auth.LoginScreen
import com.khanqah.admin.ui.bugs.BugsScreen
import com.khanqah.admin.ui.categories.CategoryScreen
import com.khanqah.admin.ui.content.ContentListScreen
import com.khanqah.admin.ui.home.HomeScreen
import com.khanqah.admin.ui.more.MoreScreen
import com.khanqah.admin.ui.schedule.ScheduleScreen
import com.khanqah.admin.ui.team.TeamScreen
import com.khanqah.admin.ui.upload.UploadScreen

private val TAB_ROUTES = setOf("home", "content", "schedule", "more")

@Composable
fun AdminNavGraph(app: AdminApp, startDestination: String) {
    val navController = rememberNavController()
    val backstackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backstackEntry?.destination?.route

    val authExpired by app.liveViewModel.authExpired.collectAsState()
    if (authExpired) {
        LaunchedEffect(Unit) {
            app.liveViewModel.clearAuthExpired()
            app.authViewModel.reset()
            navController.navigate("login") { popUpTo(0) { inclusive = true } }
        }
    }

    Scaffold(
        bottomBar = {
            if (currentRoute in TAB_ROUTES) {
                AdminBottomNavBar(currentRoute = currentRoute ?: "home") { route ->
                    navController.navigate(route) {
                        popUpTo("home") { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController    = navController,
            startDestination = startDestination,
            modifier         = Modifier.padding(innerPadding),
        ) {
            composable("login") {
                LoginScreen(viewModel = app.authViewModel) {
                    app.liveViewModel.clearAuthExpired()
                    app.liveViewModel.refresh()
                    app.scheduleViewModel.refresh()
                    navController.navigate("home") { popUpTo("login") { inclusive = true } }
                }
            }
            composable("home") {
                val ctx = LocalContext.current
                val session by app.liveViewModel.currentSession.collectAsState()
                val sessions by app.scheduleViewModel.sessions.collectAsState()
                LaunchedEffect(session) {
                    val intent = Intent(ctx, BroadcastForegroundService::class.java)
                    if (session != null) ctx.startForegroundService(intent)
                    else ctx.stopService(intent)
                }
                HomeScreen(
                    liveViewModel    = app.liveViewModel,
                    homeViewModel    = app.homeViewModel,
                    sessions         = sessions,
                    onNavigateToBugs = { navController.navigate("bugs") },
                )
            }
            composable("content") {
                val items      by app.contentViewModel.items.collectAsState()
                val categories by app.contentViewModel.categories.collectAsState()
                ContentListScreen(
                    items        = items,
                    categories   = categories,
                    onDelete     = { app.contentViewModel.delete(it) },
                    onUpdate     = { id, en, ur, catId -> app.contentViewModel.update(id, en, ur, catId) },
                    onUploadClick = { navController.navigate("upload") },
                )
            }
            composable("upload") {
                val categories by app.contentViewModel.categories.collectAsState()
                UploadScreen(viewModel = app.uploadViewModel, categories = categories)
            }
            composable("schedule") {
                val sessions by app.scheduleViewModel.sessions.collectAsState()
                ScheduleScreen(
                    sessions  = sessions,
                    onCreate  = { en, ur, at, recurring, rule -> app.scheduleViewModel.create(en, ur, at, recurring, rule) },
                    onUpdate  = { id, en, ur, at, recurring, rule -> app.scheduleViewModel.update(id, en, ur, at, recurring, rule) },
                    onDelete  = { app.scheduleViewModel.delete(it) },
                )
            }
            composable("more") {
                MoreScreen(
                    onNavigateTeam       = { navController.navigate("team") },
                    onNavigateCategories = { navController.navigate("categories") },
                    onNavigateBugs       = { navController.navigate("bugs") },
                )
            }
            composable("team") {
                val users by app.teamViewModel.users.collectAsState()
                TeamScreen(
                    users        = users,
                    onRoleChange = { id, role -> app.teamViewModel.updateRole(id, role) },
                    onDelete     = { app.teamViewModel.deleteUser(it) },
                    onNameChange = { id, name -> app.teamViewModel.updateName(id, name) },
                )
            }
            composable("categories") {
                val categories by app.categoryViewModel.categories.collectAsState()
                CategoryScreen(
                    categories = categories,
                    onCreate   = { en, ur -> app.categoryViewModel.create(en, ur) },
                    onUpdate   = { id, en, ur -> app.categoryViewModel.update(id, en, ur) },
                    onDelete   = { app.categoryViewModel.delete(it) },
                )
            }
            composable("bugs") {
                val reports by app.bugsViewModel.reports.collectAsState()
                BugsScreen(reports = reports)
            }
        }
    }
}
```

Note: This will not compile yet — `HomeScreen`, `MoreScreen`, `CategoryScreen`, updated `ContentListScreen`, `ScheduleScreen`, `TeamScreen` do not exist with the new signatures yet. Tasks 9–14 fix each one.

- [ ] **Step 3: Commit the nav skeleton**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/navigation/
git commit -m "feat(admin): rewrite AdminNavGraph with bottom tabs + all routes"
```

---

## Task 9: HomeScreen

**Files:**
- Create: `ui/home/HomeScreen.kt`

HomeScreen is the Live tab. It shows a dashboard when not broadcasting, and the full on-air view when a session is active. The broadcast setup opens as a `ModalBottomSheet`.

- [ ] **Step 1: Create HomeScreen.kt**

Create `android-admin/app/src/main/java/com/khanqah/admin/ui/home/HomeScreen.kt`:

```kotlin
package com.khanqah.admin.ui.home

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.model.ScheduledSession
import com.khanqah.admin.ui.live.LiveOnAirScreen
import com.khanqah.admin.ui.live.LiveViewModel
import com.khanqah.admin.ui.live.NextSessionCard
import com.khanqah.admin.ui.theme.*
import java.time.Instant
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    liveViewModel: LiveViewModel,
    homeViewModel: HomeViewModel,
    sessions: List<ScheduledSession>,
    onNavigateToBugs: () -> Unit,
) {
    val currentSession by liveViewModel.currentSession.collectAsState()
    val isStreaming    by liveViewModel.isStreaming.collectAsState()
    val error          by liveViewModel.error.collectAsState()
    val listenerCount  by liveViewModel.listenerCount.collectAsState()
    val categories     by liveViewModel.categories.collectAsState()
    val contentCount   by homeViewModel.contentCount.collectAsState()
    val nextSession    by homeViewModel.nextSession.collectAsState()
    val openBugCount   by homeViewModel.openBugCount.collectAsState()

    var showSetupSheet by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    if (currentSession != null) {
        LiveOnAirScreen(
            session       = currentSession!!,
            isStreaming   = isStreaming,
            listenerCount = listenerCount,
            onEnd         = { liveViewModel.end(it) },
        )
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AdminBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(24.dp))

        Text(
            "KHANQAH ADMIN",
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold,
            ),
            color = AdminGold,
        )

        Spacer(Modifier.height(20.dp))

        // ── NOT LIVE card ──
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(AdminSurface)
                .border(1.dp, AdminBorder, RoundedCornerShape(16.dp))
                .padding(20.dp),
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(8.dp).background(AdminCreamMuted, CircleShape))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "NOT LIVE",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp, letterSpacing = 0.15.sp),
                        color = AdminCreamMuted,
                    )
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    "No active broadcast",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = AdminCream,
                )
                error?.let { err ->
                    Spacer(Modifier.height(8.dp))
                    Text(err, style = MaterialTheme.typography.bodySmall, color = AdminError)
                }
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = { liveViewModel.clearError(); showSetupSheet = true },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AdminCoral),
                ) {
                    Icon(Icons.Outlined.Mic, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("START BROADCAST", fontWeight = FontWeight.Bold, letterSpacing = 0.06.sp)
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        // ── Stats row ──
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            DashboardTile(
                modifier = Modifier.weight(1f),
                label    = "CONTENT",
                value    = if (contentCount == 0) "—" else contentCount.toString(),
            )
            DashboardTile(
                modifier = Modifier.weight(1f),
                label    = "NEXT SESSION",
                value    = nextSession?.titleEn ?: "None scheduled",
                sub      = nextSession?.let { formatNextAt(it.scheduledAt) },
            )
        }

        // ── Bug alert ──
        if (openBugCount > 0) {
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(AdminErrorContainer)
                    .border(1.dp, AdminError.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
                    .clickable { onNavigateToBugs() }
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.BugReport, contentDescription = null, tint = AdminError, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(10.dp))
                Text(
                    "$openBugCount open bug ${if (openBugCount == 1) "report" else "reports"}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AdminError,
                    modifier = Modifier.weight(1f),
                )
                Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = AdminError.copy(alpha = 0.6f))
            }
        }

        Spacer(Modifier.height(32.dp))
    }

    // ── Broadcast setup bottom sheet ──
    if (showSetupSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSetupSheet = false },
            sheetState       = sheetState,
            containerColor   = AdminSurface,
        ) {
            LiveSetupSheetContent(
                categories = categories,
                sessions   = sessions,
                error      = error,
                onClearError = { liveViewModel.clearError() },
                onStart = { categoryId, titleEn, titleUr, record ->
                    liveViewModel.start(categoryId, titleEn, titleUr, record)
                    showSetupSheet = false
                },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LiveSetupSheetContent(
    categories: List<Category>,
    sessions: List<ScheduledSession>,
    error: String?,
    onClearError: () -> Unit,
    onStart: (categoryId: String, titleEn: String, titleUr: String, record: Boolean) -> Unit,
) {
    val ctx = LocalContext.current
    var selectedCategory by remember(categories) { mutableStateOf(categories.firstOrNull()) }
    var dropdownExpanded by remember { mutableStateOf(false) }
    var titleEn by remember { mutableStateOf("") }
    var titleUr by remember { mutableStateOf("") }
    var recordBroadcast by remember { mutableStateOf(false) }

    val nextSession = remember(sessions) {
        val now = Instant.now()
        sessions.filter { s ->
            runCatching { Instant.parse(s.scheduledAt).isAfter(now) }.getOrDefault(false) || s.isRecurring
        }.minByOrNull { s -> runCatching { Instant.parse(s.scheduledAt).toEpochMilli() }.getOrDefault(Long.MAX_VALUE) }
    }

    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) selectedCategory?.let { onStart(it.id, titleEn, titleUr, recordBroadcast) }
    }

    fun goLive() {
        val cat = selectedCategory ?: return
        if (titleEn.isBlank()) return
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            onStart(cat.id, titleEn, titleUr, recordBroadcast)
        } else {
            permLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    val canStart = selectedCategory != null && titleEn.isNotBlank()

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .padding(bottom = 32.dp),
    ) {
        Text(
            "BROADCAST SETUP",
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.16.sp, fontWeight = FontWeight.Bold),
            color = AdminGold,
        )
        Spacer(Modifier.height(16.dp))

        if (nextSession != null) {
            NextSessionCard(session = nextSession, onUse = { titleEn = nextSession.titleEn; titleUr = nextSession.titleUr })
            Spacer(Modifier.height(16.dp))
        }

        val fieldColors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
            focusedBorderColor = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
            focusedLabelColor = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
            focusedTextColor = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
        )

        ExposedDropdownMenuBox(expanded = dropdownExpanded, onExpandedChange = { dropdownExpanded = !dropdownExpanded }) {
            OutlinedTextField(
                value = selectedCategory?.nameEn ?: if (categories.isEmpty()) "Loading…" else "Select type",
                onValueChange = {}, readOnly = true, label = { Text("Stream Type") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(dropdownExpanded) },
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().menuAnchor(), colors = fieldColors,
            )
            ExposedDropdownMenu(expanded = dropdownExpanded, onDismissRequest = { dropdownExpanded = false },
                modifier = Modifier.background(AdminSurface)) {
                categories.forEach { cat ->
                    DropdownMenuItem(text = { Text(cat.nameEn, color = AdminCream) },
                        onClick = { selectedCategory = cat; dropdownExpanded = false })
                }
            }
        }

        Spacer(Modifier.height(10.dp))
        OutlinedTextField(value = titleEn, onValueChange = { titleEn = it },
            label = { Text("Session Title (English)") }, singleLine = true,
            shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(), colors = fieldColors)
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(value = titleUr, onValueChange = { titleUr = it },
            label = { Text("عنوان (اردو)") }, singleLine = true,
            shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(), colors = fieldColors)
        Spacer(Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth()
                .clip(RoundedCornerShape(12.dp)).background(AdminSurfaceVar)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Record Broadcast", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = AdminCream)
                Text("Save as content after broadcast ends", style = MaterialTheme.typography.bodySmall, color = AdminCream.copy(alpha = 0.48f))
            }
            Switch(checked = recordBroadcast, onCheckedChange = { recordBroadcast = it },
                colors = SwitchDefaults.colors(checkedTrackColor = AdminGold, checkedThumbColor = AdminBackground))
        }

        error?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = AdminError)
        }

        Spacer(Modifier.height(20.dp))
        Button(
            onClick = ::goLive, enabled = canStart,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(27.dp),
            colors = ButtonDefaults.buttonColors(containerColor = AdminCoral, disabledContainerColor = AdminCoral.copy(alpha = 0.3f)),
        ) {
            Icon(Icons.Outlined.Mic, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text("START BROADCAST", fontWeight = FontWeight.Bold, letterSpacing = 0.06.sp)
        }
    }
}

@Composable
private fun DashboardTile(label: String, value: String, sub: String? = null, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(AdminSurface)
            .border(1.dp, AdminBorder, RoundedCornerShape(12.dp))
            .padding(14.dp),
    ) {
        Column {
            Text(label, style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.1.sp), color = AdminGold)
            Spacer(Modifier.height(6.dp))
            Text(value, style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold), color = AdminCream,
                maxLines = 2, overflow = TextOverflow.Ellipsis)
            sub?.let {
                Spacer(Modifier.height(2.dp))
                Text(it, style = MaterialTheme.typography.bodySmall, color = AdminGold)
            }
        }
    }
}

private fun formatNextAt(scheduledAt: String): String = try {
    val zdt = Instant.parse(scheduledAt).atZone(ZoneId.systemDefault())
    val h = zdt.hour; val m = zdt.minute
    val h12 = if (h % 12 == 0) 12 else h % 12
    val period = if (h < 12) "AM" else "PM"
    "${zdt.dayOfMonth} ${zdt.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} · $h12:%02d $period".format(m)
} catch (_: Exception) { scheduledAt }
```

- [ ] **Step 2: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -10
# Expected: BUILD SUCCESSFUL
```

- [ ] **Step 3: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/home/HomeScreen.kt
git commit -m "feat(admin): add HomeScreen dashboard with live card + stats tiles"
```

---

## Task 10: MoreScreen

**Files:**
- Create: `ui/more/MoreScreen.kt`

- [ ] **Step 1: Create directory and screen**

```bash
mkdir -p android-admin/app/src/main/java/com/khanqah/admin/ui/more
```

Create `android-admin/app/src/main/java/com/khanqah/admin/ui/more/MoreScreen.kt`:

```kotlin
package com.khanqah.admin.ui.more

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.ui.theme.*

@Composable
fun MoreScreen(
    onNavigateTeam: () -> Unit,
    onNavigateCategories: () -> Unit,
    onNavigateBugs: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AdminBackground)
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(24.dp))
        Text(
            "MORE",
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold),
            color = AdminGold,
        )
        Spacer(Modifier.height(20.dp))

        MoreNavCard(icon = Icons.Outlined.Group,    title = "Team",          sub = "Manage roles and members",   onClick = onNavigateTeam)
        Spacer(Modifier.height(8.dp))
        MoreNavCard(icon = Icons.Outlined.Category, title = "Categories",    sub = "Create and rename categories", onClick = onNavigateCategories)
        Spacer(Modifier.height(8.dp))
        MoreNavCard(icon = Icons.Outlined.BugReport, title = "Bug Reports",  sub = "View reports from users",    onClick = onNavigateBugs)
    }
}

@Composable
private fun MoreNavCard(icon: ImageVector, title: String, sub: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(AdminSurface)
            .border(1.dp, AdminBorder, RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = AdminGold, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold), color = AdminCream)
            Text(sub, style = MaterialTheme.typography.bodySmall, color = AdminCreamMuted)
        }
        Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = AdminCreamMuted)
    }
}
```

- [ ] **Step 2: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/more/MoreScreen.kt
git commit -m "feat(admin): add MoreScreen navigation hub"
```

---

## Task 11: ContentListScreen — add inline edit; ContentViewModel + ContentAdminRepository — add update

**Files:**
- Modify: `data/repository/ContentAdminRepository.kt`
- Modify: `ui/content/ContentViewModel.kt`
- Modify: `ui/content/ContentListScreen.kt`

- [ ] **Step 1: Add updateContent to ContentAdminRepository**

Replace `android-admin/app/src/main/java/com/khanqah/admin/data/repository/ContentAdminRepository.kt`:

```kotlin
package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class ContentAdminRepository(private val api: AdminApiService) {
    suspend fun listContent() = api.listContent()
    suspend fun listCategories() = api.listCategories()
    suspend fun updateContent(id: String, titleEn: String, titleUr: String, categoryId: String) =
        api.updateContent(id, mapOf("title_en" to titleEn, "title_ur" to titleUr, "category_id" to categoryId))
    suspend fun deleteContent(id: String) = api.deleteContent(id)
}
```

- [ ] **Step 2: Add update() to ContentViewModel**

Replace `android-admin/app/src/main/java/com/khanqah/admin/ui/content/ContentViewModel.kt`:

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

    init { refresh() }

    fun refresh() {
        viewModelScope.launch { try { _items.value = repo.listContent() } catch (_: Exception) {} }
        viewModelScope.launch { try { _categories.value = repo.listCategories() } catch (_: Exception) {} }
    }

    fun update(id: String, titleEn: String, titleUr: String, categoryId: String) = viewModelScope.launch {
        try {
            val updated = repo.updateContent(id, titleEn, titleUr, categoryId)
            _items.value = _items.value.map { if (it.id == id) updated else it }
        } catch (_: Exception) {}
    }

    fun delete(id: String) = viewModelScope.launch {
        try {
            repo.deleteContent(id)
            _items.value = _items.value.filter { it.id != id }
        } catch (_: Exception) {}
    }
}
```

- [ ] **Step 3: Rewrite ContentListScreen with inline edit**

Replace `android-admin/app/src/main/java/com/khanqah/admin/ui/content/ContentListScreen.kt`:

```kotlin
package com.khanqah.admin.ui.content

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ExpandLess
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.model.Content
import com.khanqah.admin.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContentListScreen(
    items: List<Content>,
    categories: List<Category>,
    onDelete: (String) -> Unit,
    onUpdate: (id: String, titleEn: String, titleUr: String, categoryId: String) -> Unit,
    onUploadClick: () -> Unit,
) {
    var expandedId    by remember { mutableStateOf<String?>(null) }
    var editTitleEn   by remember { mutableStateOf("") }
    var editTitleUr   by remember { mutableStateOf("") }
    var editCategoryId by remember { mutableStateOf("") }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
        focusedBorderColor = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
        focusedLabelColor = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
        focusedTextColor = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
    )

    Scaffold(
        containerColor = AdminBackground,
        floatingActionButton = {
            FloatingActionButton(onClick = onUploadClick, containerColor = AdminGold, contentColor = AdminOnGold) {
                Icon(Icons.Outlined.Add, contentDescription = "Upload")
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                Text(
                    "CONTENT",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold),
                    color = AdminGold,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }
            if (items.isEmpty()) {
                item { Text("No content yet.", color = AdminCreamMuted) }
            }
            items(items, key = { it.id }) { item ->
                val isExpanded = expandedId == item.id
                val categoryName = categories.find { it.id == item.categoryId }?.nameEn ?: item.categoryId

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(AdminSurface)
                        .border(1.dp, if (isExpanded) AdminGold.copy(alpha = 0.6f) else AdminBorder, RoundedCornerShape(12.dp)),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                if (isExpanded) {
                                    expandedId = null
                                } else {
                                    expandedId = item.id
                                    editTitleEn    = item.titleEn
                                    editTitleUr    = item.titleUr
                                    editCategoryId = item.categoryId
                                }
                            }
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(item.titleEn, style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium), color = AdminCream)
                            Text("$categoryName · ${item.type}", style = MaterialTheme.typography.bodySmall, color = AdminCreamMuted)
                        }
                        Icon(
                            if (isExpanded) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore,
                            contentDescription = null, tint = AdminCreamMuted,
                        )
                    }

                    if (isExpanded) {
                        HorizontalDivider(color = AdminBorder, thickness = 0.5.dp)
                        Column(Modifier.padding(14.dp)) {
                            OutlinedTextField(
                                value = editTitleEn, onValueChange = { editTitleEn = it },
                                label = { Text("Title (English)") }, singleLine = true,
                                modifier = Modifier.fillMaxWidth(), colors = fieldColors,
                            )
                            Spacer(Modifier.height(8.dp))
                            OutlinedTextField(
                                value = editTitleUr, onValueChange = { editTitleUr = it },
                                label = { Text("عنوان (اردو)") }, singleLine = true,
                                modifier = Modifier.fillMaxWidth(), colors = fieldColors,
                            )
                            Spacer(Modifier.height(8.dp))
                            var catExpanded by remember { mutableStateOf(false) }
                            ExposedDropdownMenuBox(expanded = catExpanded, onExpandedChange = { catExpanded = it }) {
                                OutlinedTextField(
                                    value = categories.find { it.id == editCategoryId }?.nameEn ?: "",
                                    onValueChange = {}, readOnly = true, label = { Text("Category") },
                                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(catExpanded) },
                                    colors = fieldColors,
                                )
                                ExposedDropdownMenu(expanded = catExpanded, onDismissRequest = { catExpanded = false },
                                    modifier = Modifier.background(AdminSurface)) {
                                    categories.forEach { c ->
                                        DropdownMenuItem(text = { Text(c.nameEn, color = AdminCream) },
                                            onClick = { editCategoryId = c.id; catExpanded = false })
                                    }
                                }
                            }
                            Spacer(Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { onDelete(item.id); expandedId = null },
                                    modifier = Modifier.weight(1f),
                                    border = androidx.compose.foundation.BorderStroke(1.dp, AdminCoral),
                                ) { Text("Delete", color = AdminCoral) }
                                Button(
                                    onClick = {
                                        onUpdate(item.id, editTitleEn, editTitleUr, editCategoryId)
                                        expandedId = null
                                    },
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.buttonColors(containerColor = AdminGold, contentColor = AdminOnGold),
                                ) { Text("Save", fontWeight = FontWeight.SemiBold) }
                            }
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 4: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/data/repository/ContentAdminRepository.kt
git add android-admin/app/src/main/java/com/khanqah/admin/ui/content/
git commit -m "feat(admin): content screen — add inline edit + update method"
```

---

## Task 12: ScheduleScreen + ScheduleViewModel — full CRUD with date/time pickers

**Files:**
- Modify: `ui/schedule/ScheduleViewModel.kt`
- Modify: `ui/schedule/ScheduleScreen.kt`

- [ ] **Step 1: Extend ScheduleViewModel with update + recurrence params**

Replace `android-admin/app/src/main/java/com/khanqah/admin/ui/schedule/ScheduleViewModel.kt`:

```kotlin
package com.khanqah.admin.ui.schedule

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.ScheduledSession
import com.khanqah.admin.data.repository.ScheduleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ScheduleViewModel(private val repo: ScheduleRepository) : ViewModel() {
    private val _sessions = MutableStateFlow<List<ScheduledSession>>(emptyList())
    val sessions = _sessions.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        try { _sessions.value = repo.list() } catch (_: Exception) {}
    }

    fun create(
        titleEn: String, titleUr: String, scheduledAt: String,
        isRecurring: Boolean, recurrenceRule: String?,
    ) = viewModelScope.launch {
        try {
            val new = repo.create(titleEn, titleUr, scheduledAt, isRecurring, recurrenceRule)
            _sessions.value = _sessions.value + new
        } catch (_: Exception) {}
    }

    fun update(
        id: String,
        titleEn: String, titleUr: String, scheduledAt: String,
        isRecurring: Boolean, recurrenceRule: String?,
    ) = viewModelScope.launch {
        try {
            val updated = repo.update(id, titleEn, titleUr, scheduledAt, isRecurring, recurrenceRule)
            _sessions.value = _sessions.value.map { if (it.id == id) updated else it }
        } catch (_: Exception) {}
    }

    fun delete(id: String) = viewModelScope.launch {
        try {
            repo.delete(id)
            _sessions.value = _sessions.value.filter { it.id != id }
        } catch (_: Exception) {}
    }
}
```

- [ ] **Step 2: Rewrite ScheduleScreen with date/time pickers, inline edit, frequency**

Replace `android-admin/app/src/main/java/com/khanqah/admin/ui/schedule/ScheduleScreen.kt`:

```kotlin
package com.khanqah.admin.ui.schedule

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.data.model.ScheduledSession
import com.khanqah.admin.ui.theme.*
import java.time.Instant
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale

private val FREQUENCIES = listOf("once", "daily", "weekly", "monthly")

private fun freqToRule(freq: String): String? = when (freq) {
    "daily"   -> "FREQ=DAILY"
    "weekly"  -> "FREQ=WEEKLY"
    "monthly" -> "FREQ=MONTHLY"
    else      -> null
}

private fun ruleToFreq(rule: String?): String = when {
    rule == null               -> "once"
    rule.contains("DAILY")    -> "daily"
    rule.contains("WEEKLY")   -> "weekly"
    rule.contains("MONTHLY")  -> "monthly"
    else                      -> "once"
}

private fun buildScheduledAt(dateMs: Long, hour: Int, minute: Int): String {
    val date = Instant.ofEpochMilli(dateMs).atZone(ZoneId.systemDefault()).toLocalDate()
    return date.atTime(hour, minute).atZone(ZoneId.systemDefault()).toInstant().toString()
}

private fun formatSessionDate(scheduledAt: String): String = try {
    val zdt = Instant.parse(scheduledAt).atZone(ZoneId.systemDefault())
    val h12 = if (zdt.hour % 12 == 0) 12 else zdt.hour % 12
    val period = if (zdt.hour < 12) "AM" else "PM"
    "${zdt.dayOfMonth} ${zdt.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${zdt.year}  ·  $h12:%02d $period".format(zdt.minute)
} catch (_: Exception) { scheduledAt }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(
    sessions: List<ScheduledSession>,
    onCreate: (titleEn: String, titleUr: String, scheduledAt: String, isRecurring: Boolean, recurrenceRule: String?) -> Unit,
    onUpdate: (id: String, titleEn: String, titleUr: String, scheduledAt: String, isRecurring: Boolean, recurrenceRule: String?) -> Unit,
    onDelete: (String) -> Unit,
) {
    var showCreateForm by remember { mutableStateOf(false) }
    var expandedId     by remember { mutableStateOf<String?>(null) }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
        focusedBorderColor = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
        focusedLabelColor = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
        focusedTextColor = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
    )

    Scaffold(
        containerColor = AdminBackground,
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreateForm = !showCreateForm }, containerColor = AdminGold, contentColor = AdminOnGold) {
                Icon(if (showCreateForm) Icons.Outlined.Close else Icons.Outlined.Add, contentDescription = null)
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            contentPadding = PaddingValues(vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                Text("SCHEDULE", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold), color = AdminGold, modifier = Modifier.padding(bottom = 8.dp))
            }

            if (showCreateForm) {
                item {
                    SessionForm(
                        title    = "New Session",
                        fieldColors = fieldColors,
                        onSubmit = { en, ur, at, recurring, rule ->
                            onCreate(en, ur, at, recurring, rule)
                            showCreateForm = false
                        },
                        onCancel = { showCreateForm = false },
                    )
                }
            }

            if (sessions.isEmpty()) {
                item { Text("No sessions scheduled.", color = AdminCreamMuted) }
            }

            items(sessions, key = { it.id }) { s ->
                val isExpanded = expandedId == s.id
                val freqLabel = when {
                    !s.isRecurring                             -> "Once"
                    s.recurrenceRule?.contains("DAILY") == true  -> "Daily"
                    s.recurrenceRule?.contains("WEEKLY") == true -> "Weekly"
                    s.recurrenceRule?.contains("MONTHLY") == true -> "Monthly"
                    else                                         -> "Recurring"
                }

                Column(
                    modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(AdminSurface)
                        .border(1.dp, if (isExpanded) AdminGold.copy(alpha = 0.6f) else AdminBorder, RoundedCornerShape(12.dp)),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth()
                            .clickable {
                                expandedId = if (isExpanded) null else s.id
                            }
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(s.titleEn, style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium), color = AdminCream)
                            Text("${formatSessionDate(s.scheduledAt)}  ·  $freqLabel", style = MaterialTheme.typography.bodySmall, color = AdminCreamMuted)
                        }
                        Icon(if (isExpanded) Icons.Outlined.ExpandLess else Icons.Outlined.ExpandMore, contentDescription = null, tint = AdminCreamMuted)
                    }

                    if (isExpanded) {
                        HorizontalDivider(color = AdminBorder, thickness = 0.5.dp)
                        SessionForm(
                            title       = "Edit Session",
                            fieldColors = fieldColors,
                            initialEn   = s.titleEn,
                            initialUr   = s.titleUr,
                            initialScheduledAt = s.scheduledAt,
                            initialFreq = ruleToFreq(s.recurrenceRule),
                            onSubmit    = { en, ur, at, recurring, rule ->
                                onUpdate(s.id, en, ur, at, recurring, rule)
                                expandedId = null
                            },
                            onDelete = { onDelete(s.id); expandedId = null },
                            onCancel = { expandedId = null },
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SessionForm(
    title: String,
    fieldColors: TextFieldColors,
    initialEn: String = "",
    initialUr: String = "",
    initialScheduledAt: String = "",
    initialFreq: String = "once",
    onSubmit: (titleEn: String, titleUr: String, scheduledAt: String, isRecurring: Boolean, recurrenceRule: String?) -> Unit,
    onDelete: (() -> Unit)? = null,
    onCancel: () -> Unit,
) {
    var titleEn  by remember { mutableStateOf(initialEn) }
    var titleUr  by remember { mutableStateOf(initialUr) }
    var freq     by remember { mutableStateOf(initialFreq) }

    val initMs = remember(initialScheduledAt) {
        runCatching { Instant.parse(initialScheduledAt).toEpochMilli() }.getOrNull()
    }
    val initZdt = remember(initMs) {
        initMs?.let { Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault()) }
    }

    var selectedDateMs by remember { mutableStateOf(initMs) }
    var selectedHour   by remember { mutableIntStateOf(initZdt?.hour ?: 20) }
    var selectedMinute by remember { mutableIntStateOf(initZdt?.minute ?: 0) }

    Column(Modifier.padding(14.dp)) {
        Text(title, style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.1.sp), color = AdminGold, modifier = Modifier.padding(bottom = 10.dp))

        OutlinedTextField(value = titleEn, onValueChange = { titleEn = it }, label = { Text("Title (English)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(value = titleUr, onValueChange = { titleUr = it }, label = { Text("عنوان (اردو)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
        Spacer(Modifier.height(8.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DatePickerField(
                modifier     = Modifier.weight(1f),
                label        = "Date",
                selectedMs   = selectedDateMs,
                fieldColors  = fieldColors,
                onDateSelected = { selectedDateMs = it },
            )
            TimePickerField(
                modifier    = Modifier.weight(1f),
                label       = "Time",
                hour        = selectedHour,
                minute      = selectedMinute,
                fieldColors = fieldColors,
                onTimeSelected = { h, m -> selectedHour = h; selectedMinute = m },
            )
        }

        Spacer(Modifier.height(8.dp))

        var freqExpanded by remember { mutableStateOf(false) }
        ExposedDropdownMenuBox(expanded = freqExpanded, onExpandedChange = { freqExpanded = it }) {
            OutlinedTextField(
                value = freq.replaceFirstChar { it.uppercase() },
                onValueChange = {}, readOnly = true, label = { Text("Frequency") },
                modifier = Modifier.fillMaxWidth().menuAnchor(),
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(freqExpanded) },
                colors = fieldColors,
            )
            ExposedDropdownMenu(expanded = freqExpanded, onDismissRequest = { freqExpanded = false },
                modifier = Modifier.background(AdminSurface)) {
                FREQUENCIES.forEach { f ->
                    DropdownMenuItem(text = { Text(f.replaceFirstChar { it.uppercase() }, color = AdminCream) },
                        onClick = { freq = f; freqExpanded = false })
                }
            }
        }

        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (onDelete != null) {
                OutlinedButton(onClick = onDelete, modifier = Modifier.weight(1f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, AdminCoral)) {
                    Text("Delete", color = AdminCoral)
                }
            } else {
                OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, AdminBorder)) {
                    Text("Cancel", color = AdminCreamMuted)
                }
            }
            Button(
                onClick = {
                    val dateMs = selectedDateMs ?: return@Button
                    if (titleEn.isBlank()) return@Button
                    val at = buildScheduledAt(dateMs, selectedHour, selectedMinute)
                    onSubmit(titleEn, titleUr, at, freq != "once", freqToRule(freq))
                },
                enabled = titleEn.isNotBlank() && selectedDateMs != null,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = AdminGold, contentColor = AdminOnGold),
            ) { Text("Save", fontWeight = FontWeight.SemiBold) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DatePickerField(
    modifier: Modifier,
    label: String,
    selectedMs: Long?,
    fieldColors: TextFieldColors,
    onDateSelected: (Long) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }
    val pickerState = rememberDatePickerState(initialSelectedDateMillis = selectedMs)

    val displayText = selectedMs?.let {
        val zdt = Instant.ofEpochMilli(it).atZone(ZoneId.systemDefault())
        "${zdt.dayOfMonth} ${zdt.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)}"
    } ?: "Pick date"

    OutlinedTextField(
        value = displayText, onValueChange = {}, readOnly = true, label = { Text(label) },
        modifier = modifier.clickable { showPicker = true },
        trailingIcon = { Icon(Icons.Outlined.DateRange, contentDescription = null, tint = AdminGold) },
        colors = fieldColors,
    )

    if (showPicker) {
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { onDateSelected(it) }
                    showPicker = false
                }) { Text("OK", color = AdminGold) }
            },
            dismissButton = { TextButton(onClick = { showPicker = false }) { Text("Cancel", color = AdminCreamMuted) } },
            colors = DatePickerDefaults.colors(containerColor = AdminSurface),
        ) { DatePicker(state = pickerState) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimePickerField(
    modifier: Modifier,
    label: String,
    hour: Int,
    minute: Int,
    fieldColors: TextFieldColors,
    onTimeSelected: (hour: Int, minute: Int) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }
    val pickerState = rememberTimePickerState(initialHour = hour, initialMinute = minute, is24Hour = false)

    val h12 = if (hour % 12 == 0) 12 else hour % 12
    val period = if (hour < 12) "AM" else "PM"
    val displayText = "$h12:%02d $period".format(minute)

    OutlinedTextField(
        value = displayText, onValueChange = {}, readOnly = true, label = { Text(label) },
        modifier = modifier.clickable { showPicker = true },
        trailingIcon = { Icon(Icons.Outlined.Schedule, contentDescription = null, tint = AdminGold) },
        colors = fieldColors,
    )

    if (showPicker) {
        AlertDialog(
            onDismissRequest = { showPicker = false },
            title = { Text("Pick time", color = AdminCream) },
            text  = { TimePicker(state = pickerState) },
            confirmButton = {
                TextButton(onClick = {
                    onTimeSelected(pickerState.hour, pickerState.minute)
                    showPicker = false
                }) { Text("OK", color = AdminGold) }
            },
            dismissButton = { TextButton(onClick = { showPicker = false }) { Text("Cancel", color = AdminCreamMuted) } },
            containerColor = AdminSurface,
        )
    }
}
```

- [ ] **Step 3: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/schedule/
git commit -m "feat(admin): schedule screen — full CRUD with date/time pickers + frequency"
```

---

## Task 13: TeamScreen — add delete + name edit

**Files:**
- Modify: `ui/team/TeamViewModel.kt`
- Modify: `ui/team/TeamScreen.kt`

- [ ] **Step 1: Extend TeamViewModel**

Replace `android-admin/app/src/main/java/com/khanqah/admin/ui/team/TeamViewModel.kt`:

```kotlin
package com.khanqah.admin.ui.team

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.khanqah.admin.data.model.User
import com.khanqah.admin.data.repository.TeamRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class TeamViewModel(private val repo: TeamRepository) : ViewModel() {
    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users = _users.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch {
        try { _users.value = repo.list() } catch (_: Exception) {}
    }

    fun updateRole(id: String, role: String) = viewModelScope.launch {
        try {
            val updated = repo.updateRole(id, role)
            _users.value = _users.value.map { if (it.id == id) updated else it }
        } catch (_: Exception) {}
    }

    fun updateName(id: String, name: String) = viewModelScope.launch {
        try {
            val updated = repo.updateName(id, name)
            _users.value = _users.value.map { if (it.id == id) updated else it }
        } catch (_: Exception) {}
    }

    fun deleteUser(id: String) = viewModelScope.launch {
        try {
            repo.deleteUser(id)
            _users.value = _users.value.filter { it.id != id }
        } catch (_: Exception) {}
    }
}
```

- [ ] **Step 2: Rewrite TeamScreen with delete + name edit**

Replace `android-admin/app/src/main/java/com/khanqah/admin/ui/team/TeamScreen.kt`:

```kotlin
package com.khanqah.admin.ui.team

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.data.model.User
import com.khanqah.admin.ui.theme.*

private val ROLES = listOf("listener", "editor", "admin", "broadcaster")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamScreen(
    users: List<User>,
    onRoleChange: (String, String) -> Unit,
    onDelete: (String) -> Unit,
    onNameChange: (String, String) -> Unit,
) {
    var confirmDeleteId by remember { mutableStateOf<String?>(null) }
    var editNameUser    by remember { mutableStateOf<User?>(null) }
    var editNameValue   by remember { mutableStateOf("") }

    // Confirm delete dialog
    confirmDeleteId?.let { id ->
        val user = users.find { it.id == id }
        AlertDialog(
            onDismissRequest = { confirmDeleteId = null },
            title = { Text("Remove member?", color = AdminCream) },
            text  = { Text("Remove ${user?.displayName?.ifBlank { user.phone } ?: id} from the team?", color = AdminCreamMuted) },
            confirmButton = {
                TextButton(onClick = { onDelete(id); confirmDeleteId = null }) {
                    Text("Remove", color = AdminError)
                }
            },
            dismissButton = { TextButton(onClick = { confirmDeleteId = null }) { Text("Cancel", color = AdminCreamMuted) } },
            containerColor = AdminSurface,
        )
    }

    // Edit name dialog
    editNameUser?.let { user ->
        AlertDialog(
            onDismissRequest = { editNameUser = null },
            title = { Text("Edit name", color = AdminCream) },
            text  = {
                OutlinedTextField(
                    value = editNameValue, onValueChange = { editNameValue = it },
                    label = { Text("Display name") }, singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
                        focusedBorderColor = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
                        focusedTextColor = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
                        focusedLabelColor = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
                    ),
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    if (editNameValue.isNotBlank()) onNameChange(user.id, editNameValue)
                    editNameUser = null
                }) { Text("Save", color = AdminGold) }
            },
            dismissButton = { TextButton(onClick = { editNameUser = null }) { Text("Cancel", color = AdminCreamMuted) } },
            containerColor = AdminSurface,
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(AdminBackground).padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text("TEAM", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold), color = AdminGold, modifier = Modifier.padding(bottom = 8.dp))
        }
        if (users.isEmpty()) {
            item { Text("No users.", color = AdminCreamMuted) }
        }
        items(users, key = { it.id }) { user ->
            var roleExpanded by remember { mutableStateOf(false) }

            Column(
                modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(AdminSurface)
                    .border(1.dp, AdminBorder, RoundedCornerShape(12.dp))
                    .padding(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            user.displayName.ifBlank { user.phone },
                            style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
                            color = AdminCream,
                        )
                        Text(user.phone, style = MaterialTheme.typography.bodySmall, color = AdminCreamMuted)
                    }
                    IconButton(onClick = { editNameUser = user; editNameValue = user.displayName }) {
                        Icon(Icons.Outlined.Edit, contentDescription = "Edit name", tint = AdminGoldMuted, modifier = Modifier.size(18.dp))
                    }
                    IconButton(onClick = { confirmDeleteId = user.id }) {
                        Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = AdminError, modifier = Modifier.size(18.dp))
                    }
                }
                Spacer(Modifier.height(8.dp))
                ExposedDropdownMenuBox(expanded = roleExpanded, onExpandedChange = { roleExpanded = it }) {
                    OutlinedTextField(
                        value = user.role, onValueChange = {}, readOnly = true,
                        label = { Text("Role") },
                        modifier = Modifier.fillMaxWidth().menuAnchor(),
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(roleExpanded) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
                            focusedBorderColor = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
                            focusedTextColor = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
                            focusedLabelColor = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
                        ),
                    )
                    ExposedDropdownMenu(expanded = roleExpanded, onDismissRequest = { roleExpanded = false },
                        modifier = Modifier.background(AdminSurface)) {
                        ROLES.forEach { role ->
                            DropdownMenuItem(text = { Text(role, color = AdminCream) },
                                onClick = { onRoleChange(user.id, role); roleExpanded = false })
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 3: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/team/
git commit -m "feat(admin): team screen — add delete + name edit"
```

---

## Task 14: CategoryScreen

**Files:**
- Create: `ui/categories/CategoryScreen.kt`

- [ ] **Step 1: Create CategoryScreen**

Create `android-admin/app/src/main/java/com/khanqah/admin/ui/categories/CategoryScreen.kt`:

```kotlin
package com.khanqah.admin.ui.categories

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.ui.theme.*

@Composable
fun CategoryScreen(
    categories: List<Category>,
    onCreate: (nameEn: String, nameUr: String) -> Unit,
    onUpdate: (id: String, nameEn: String, nameUr: String) -> Unit,
    onDelete: (id: String) -> Unit,
) {
    var newEn         by remember { mutableStateOf("") }
    var newUr         by remember { mutableStateOf("") }
    var editingId     by remember { mutableStateOf<String?>(null) }
    var editEn        by remember { mutableStateOf("") }
    var editUr        by remember { mutableStateOf("") }
    var confirmDelete by remember { mutableStateOf<Category?>(null) }

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
        focusedBorderColor = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
        focusedLabelColor = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
        focusedTextColor = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
    )

    confirmDelete?.let { cat ->
        AlertDialog(
            onDismissRequest = { confirmDelete = null },
            title = { Text("Delete category?", color = AdminCream) },
            text  = { Text("Delete \"${cat.nameEn}\"? This cannot be undone.", color = AdminCreamMuted) },
            confirmButton = {
                TextButton(onClick = { onDelete(cat.id); confirmDelete = null }) {
                    Text("Delete", color = AdminError)
                }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = null }) { Text("Cancel", color = AdminCreamMuted) } },
            containerColor = AdminSurface,
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(AdminBackground).padding(horizontal = 16.dp),
        contentPadding = PaddingValues(vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Text("CATEGORIES", style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold), color = AdminGold, modifier = Modifier.padding(bottom = 8.dp))
        }

        // Create form
        item {
            Column(
                modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(AdminSurface)
                    .border(1.dp, AdminBorder, RoundedCornerShape(12.dp))
                    .padding(14.dp),
            ) {
                Text("NEW CATEGORY", style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.1.sp), color = AdminGold, modifier = Modifier.padding(bottom = 10.dp))
                OutlinedTextField(value = newEn, onValueChange = { newEn = it }, label = { Text("Name (English)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(value = newUr, onValueChange = { newUr = it }, label = { Text("نام (اردو)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = {
                        if (newEn.isNotBlank() && newUr.isNotBlank()) {
                            onCreate(newEn, newUr); newEn = ""; newUr = ""
                        }
                    },
                    enabled = newEn.isNotBlank() && newUr.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = AdminGold, contentColor = AdminOnGold),
                ) { Text("Create Category", fontWeight = FontWeight.SemiBold) }
            }
        }

        if (categories.isEmpty()) {
            item { Text("No categories yet.", color = AdminCreamMuted) }
        }

        items(categories, key = { it.id }) { cat ->
            val isSystem = cat.slug != null
            val isEditing = editingId == cat.id

            Column(
                modifier = Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(AdminSurface)
                    .border(1.dp, AdminBorder, RoundedCornerShape(12.dp))
                    .padding(14.dp),
            ) {
                if (isEditing) {
                    OutlinedTextField(value = editEn, onValueChange = { editEn = it }, label = { Text("Name (English)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = editUr, onValueChange = { editUr = it }, label = { Text("نام (اردو)") }, singleLine = true, modifier = Modifier.fillMaxWidth(), colors = fieldColors)
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { editingId = null }, modifier = Modifier.weight(1f),
                            border = androidx.compose.foundation.BorderStroke(1.dp, AdminBorder)) {
                            Icon(Icons.Outlined.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Cancel", color = AdminCreamMuted)
                        }
                        Button(
                            onClick = {
                                if (editEn.isNotBlank() && editUr.isNotBlank()) {
                                    onUpdate(cat.id, editEn, editUr); editingId = null
                                }
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = AdminGold, contentColor = AdminOnGold),
                        ) {
                            Icon(Icons.Outlined.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Save", fontWeight = FontWeight.SemiBold)
                        }
                    }
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(cat.nameEn, style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium), color = AdminCream)
                                if (isSystem) {
                                    Surface(shape = RoundedCornerShape(4.dp), color = AdminGold.copy(alpha = 0.12f),
                                        border = androidx.compose.foundation.BorderStroke(0.5.dp, AdminGold.copy(alpha = 0.45f))) {
                                        Text("system", modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.dp),
                                            style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp), color = AdminGold)
                                    }
                                }
                            }
                            Text(cat.nameUr, style = MaterialTheme.typography.bodySmall, color = AdminCreamMuted)
                        }
                        IconButton(onClick = { editingId = cat.id; editEn = cat.nameEn; editUr = cat.nameUr }) {
                            Icon(Icons.Outlined.Edit, contentDescription = "Rename", tint = AdminGoldMuted, modifier = Modifier.size(18.dp))
                        }
                        if (!isSystem) {
                            IconButton(onClick = { confirmDelete = cat }) {
                                Icon(Icons.Outlined.Delete, contentDescription = "Delete", tint = AdminError, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
```

- [ ] **Step 2: Verify compile**

```bash
./gradlew :app:compileDebugKotlin 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add android-admin/app/src/main/java/com/khanqah/admin/ui/categories/CategoryScreen.kt
git commit -m "feat(admin): add CategoryScreen — create, rename, delete"
```

---

## Task 15: Full build, install, and cleanup

**Files:**
- Delete: `ui/live/LiveScreen.kt` (replaced by `HomeScreen`)

- [ ] **Step 1: Remove the now-unused LiveScreen composable**

Open `android-admin/app/src/main/java/com/khanqah/admin/ui/live/LiveScreen.kt`. Delete the public `fun LiveScreen(...)` composable function (lines 43–313). Leave `LiveOnAirScreen`, `NextSessionCard`, `nextUpcoming`, `parseDateParts` in place — they are used by `HomeScreen`.

- [ ] **Step 2: Full release build**

```bash
./gradlew :app:assembleDebug 2>&1 | tail -20
# Expected: BUILD SUCCESSFUL
# APK at: app/build/outputs/apk/debug/app-debug.apk
```

- [ ] **Step 3: Install on device**

```bash
/usr/local/share/android-commandlinetools/platform-tools/adb connect 192.168.1.3:5555
./gradlew :app:installDebug
```

- [ ] **Step 4: Smoke-test each tab**

Open the app and verify:
1. **Live tab** → dashboard loads; "NOT LIVE" card shows; tap "START BROADCAST" → bottom sheet opens with category/title/record fields
2. **Content tab** → content list loads; tap a card → edit form expands; FAB → navigates to upload screen
3. **Schedule tab** → sessions list; FAB toggles create form; date/time pickers open on tap
4. **More tab** → three navigation cards; tap Team → users list with role dropdown + delete icon; tap Categories → create form + list with rename/delete; tap Bug Reports → bug list

- [ ] **Step 5: Copy APK and final commit**

```bash
cp app/build/outputs/apk/debug/app-debug.apk ../app-admin-debug.apk
cd ..
git add android-admin/ app-admin-debug.apk
git commit -m "feat(admin): full module navigation — content, schedule, team, categories, bugs"
```

---

## Post-implementation

Once the branch is working:
1. Invoke `superpowers:finishing-a-development-branch` to handle the merge/PR decision
2. File an AWS SNS production access support ticket to replace the master OTP workaround
