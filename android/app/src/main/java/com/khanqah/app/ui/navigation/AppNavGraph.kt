package com.khanqah.app.ui.navigation

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LibraryBooks
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.LibraryBooks
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.MicNone
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.PlayCircleOutline
import com.khanqah.app.ui.common.ComingSoonScreen
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.khanqah.app.KhanqahApp
import com.khanqah.app.PlaybackNotificationService
import com.khanqah.app.ui.theme.NastaleeqFontFamily
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.khanqah.app.data.model.LiveSession
import com.khanqah.app.data.model.ScheduledSession
import com.khanqah.app.ui.auth.AuthViewModel
import com.khanqah.app.ui.auth.LoginScreen
import com.khanqah.app.ui.home.HomeScreen
import com.khanqah.app.ui.home.HomeViewModel
import com.khanqah.app.ui.qa.AskComposeScreen
import com.khanqah.app.ui.qa.AskConversationScreen
import com.khanqah.app.ui.qa.AskThreadListScreen
import com.khanqah.app.ui.library.CategoryDetailScreen
import com.khanqah.app.ui.library.CategoryDetailViewModel
import com.khanqah.app.ui.library.LibraryScreen
import com.khanqah.app.ui.library.LibraryViewModel
import com.khanqah.app.ui.live.LiveScreen
import com.khanqah.app.ui.player.MiniPlayerBar
import com.khanqah.app.ui.player.PlayerScreen
import com.khanqah.app.ui.player.PlayerViewModel
import com.khanqah.app.ui.profile.ProfileScreen
import com.khanqah.app.ui.schedule.ScheduleScreen
import com.khanqah.app.ui.utils.LocalIsUrdu
import com.khanqah.app.ui.utils.Tabs

sealed class Screen(val route: String) {
    object Login        : Screen("login")
    object Home         : Screen("home")
    object Library      : Screen("library")
    object Schedule     : Screen("schedule")
    object Live         : Screen("live")
    object Profile      : Screen("profile")
    object Player       : Screen("player/{contentId}") {
        fun route(id: String) = "player/$id"
    }
    object CategoryDetail : Screen("category/{categoryId}/{nameEn}/{nameUr}/{catType}") {
        fun route(id: String, nameEn: String, nameUr: String, type: String) =
            "category/$id/${nameEn.encodeUrl()}/${nameUr.encodeUrl()}/${type.encodeUrl()}"
    }
    object ComingSoon : Screen("coming_soon/{title}") {
        fun route(title: String) = "coming_soon/${title.encodeUrl()}"
    }
    object BayanTab  : Screen("tab_bayan")
    object ClipsTab  : Screen("tab_clips")
    object BooksTab  : Screen("tab_books")
    object AskList : Screen("ask")
    object AskCompose : Screen("ask/compose?threadId={threadId}") {
        fun route(threadId: String? = null) = if (threadId == null) "ask/compose" else "ask/compose?threadId=$threadId"
    }
    object AskConversation : Screen("ask/thread/{threadId}") {
        fun route(threadId: String) = "ask/thread/$threadId"
    }
}

private fun String.encodeUrl() = java.net.URLEncoder.encode(this, "UTF-8")
private fun String.decodeUrl() = java.net.URLDecoder.decode(this, "UTF-8")

data class BottomNavItem(
    val screen: Screen,
    val label: String,
    val iconFilled: ImageVector,
    val iconOutlined: ImageVector,
    val categoryType: String? = null,
)

@Composable
fun bottomNavItems(): List<BottomNavItem> {
    val ur = LocalIsUrdu.current
    return listOf(
        BottomNavItem(Screen.Home,     if (ur) Tabs.HOME_UR     else Tabs.HOME_EN,     Icons.Filled.Home,         Icons.Outlined.Home),
        BottomNavItem(Screen.BayanTab, if (ur) Tabs.BAYAANAT_UR else Tabs.BAYAANAT_EN, Icons.Filled.Mic,          Icons.Outlined.MicNone),
        BottomNavItem(Screen.ClipsTab, if (ur) Tabs.CLIPS_UR    else Tabs.CLIPS_EN,    Icons.Filled.PlayCircle,   Icons.Outlined.PlayCircleOutline),
        BottomNavItem(Screen.BooksTab, if (ur) Tabs.BOOKS_UR    else Tabs.BOOKS_EN,    Icons.Filled.MenuBook,     Icons.Outlined.MenuBook),
        BottomNavItem(Screen.Profile,  if (ur) Tabs.PROFILE_UR  else Tabs.PROFILE_EN,  Icons.Filled.Person,       Icons.Outlined.Person),
    )
}

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
    isLoggedIn: Boolean,
    displayName: String,
    phone: String,
    userRole: String?,
    isUrdu: Boolean,
    openLive: Boolean = false,
    openPlayer: Boolean = false,
    openAsk: Boolean = false,
    openAskThread: String? = null,
    onLanguageToggle: () -> Unit,
    onLogout: () -> Unit,
    onLoginSuccess: () -> Unit = {},
) {
    val currentEntry by navController.currentBackStackEntryAsState()
    val currentRoute = currentEntry?.destination?.route
    // Tracks whether the Login screen was reached via the Ask Hazrat auth gate, so login
    // success can return there instead of dropping the user on Home.
    var cameFromAsk by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val app = context.applicationContext as KhanqahApp
    val nowPlaying by app.nowPlayingManager.info.collectAsState()

    // Navigate to live screen when notification is tapped
    LaunchedEffect(openLive) {
        if (openLive && liveSession != null) {
            navController.navigate(Screen.Live.route) { launchSingleTop = true }
        }
    }

    // Navigate back to player when playback notification is tapped
    LaunchedEffect(openPlayer) {
        if (openPlayer) {
            val info = app.nowPlayingManager.info.value
            if (info != null) {
                navController.navigate(Screen.Player.route(info.contentId)) { launchSingleTop = true }
            }
        }
    }

    // Navigate to Ask Hazrat when QA push notification is tapped
    LaunchedEffect(openAsk) {
        if (openAsk && isLoggedIn) {
            if (openAskThread != null) {
                navController.navigate(Screen.AskConversation.route(openAskThread)) { launchSingleTop = true }
            } else {
                navController.navigate(Screen.AskList.route) { launchSingleTop = true }
            }
        }
    }

    // PlaybackNotificationService: start when content is playing, stop when cleared
    LaunchedEffect(nowPlaying) {
        val svc = Intent(context, PlaybackNotificationService::class.java)
        if (nowPlaying != null) {
            svc.putExtra(PlaybackNotificationService.EXTRA_TITLE, nowPlaying!!.title)
            svc.putExtra(PlaybackNotificationService.EXTRA_TYPE, nowPlaying!!.type)
            context.startForegroundService(svc)
        } else {
            context.stopService(svc)
        }
    }

    // Live player cleanup: release when session ends
    LaunchedEffect(liveSession) {
        if (liveSession == null) {
            app.liveStreamPlayer.release()
            context.stopService(Intent(context, com.khanqah.app.ListeningForegroundService::class.java))
        }
    }
    val noBottomNavRoutes = setOf(
        Screen.Login.route,
        Screen.Player.route,
        Screen.CategoryDetail.route,
        Screen.Live.route,
    )
    val showBottomNav = currentRoute !in noBottomNavRoutes
    val pillColor    = Color(0xFFD4AF37)           // gold background
    val activeColor  = Color(0xFF0B2F27)           // deep green — selected
    val inactiveColor = Color(0xFF0B2F27).copy(alpha = 0.45f) // muted green — unselected

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            val showMiniPlayer = nowPlaying != null &&
                currentRoute != Screen.Player.route &&
                currentRoute != Screen.Live.route &&
                currentRoute != Screen.Login.route
            Column {
                if (showMiniPlayer) {
                    val info = nowPlaying!!
                    val player = app.nowPlayingManager.player
                    if (player != null) {
                        MiniPlayerBar(
                            info = info,
                            player = player,
                            onClick = {
                                navController.navigate(Screen.Player.route(info.contentId)) {
                                    launchSingleTop = true
                                }
                            },
                            onClose = { app.nowPlayingManager.stopAndClear() },
                        )
                    }
                }
            if (showBottomNav) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                        .windowInsetsPadding(WindowInsets.navigationBars),
                ) {
                    NavigationBar(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(100.dp)),
                        containerColor = pillColor,
                        contentColor = inactiveColor,
                        tonalElevation = 0.dp,
                    ) {
                        bottomNavItems().forEach { item ->
                            val selected = currentRoute == item.screen.route
                            NavigationBarItem(
                                selected = selected,
                                onClick = {
                                    val ctype = item.categoryType
                                    if (ctype != null) {
                                        val cat = libraryViewModel.categories.value.firstOrNull { c ->
                                            c.type.equals(ctype, ignoreCase = true) ||
                                            c.nameEn.contains(ctype, ignoreCase = true)
                                        }
                                        if (cat != null) {
                                            navController.navigate(
                                                Screen.CategoryDetail.route(cat.id, cat.nameEn, cat.nameUr, cat.type)
                                            )
                                        } else {
                                            navController.navigate(Screen.Library.route) {
                                                popUpTo(Screen.Home.route) { saveState = true }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    } else if (item.screen == Screen.Home) {
                                        navController.popBackStack(Screen.Home.route, inclusive = false)
                                    } else {
                                        navController.navigate(item.screen.route) {
                                            popUpTo(Screen.Home.route) { saveState = true }
                                            launchSingleTop = true
                                            restoreState = true
                                        }
                                    }
                                },
                                icon = {
                                    Icon(
                                        if (selected) item.iconFilled else item.iconOutlined,
                                        contentDescription = item.label,
                                        tint = if (selected) activeColor else inactiveColor,
                                    )
                                },
                                label = {
                                    val ur = LocalIsUrdu.current
                                    Text(
                                        item.label,
                                        fontFamily = if (ur) NastaleeqFontFamily else null,
                                        fontSize = if (ur) 13.sp else 12.sp,
                                        color = if (selected) activeColor else inactiveColor,
                                    )
                                },
                                colors = NavigationBarItemDefaults.colors(
                                    selectedIconColor   = activeColor,
                                    unselectedIconColor = inactiveColor,
                                    selectedTextColor   = activeColor,
                                    unselectedTextColor = inactiveColor,
                                    indicatorColor      = Color.Transparent,
                                ),
                            )
                        }
                    }
                }
            }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(top = padding.calculateTopPadding(), bottom = padding.calculateBottomPadding()),
        ) {
            composable(Screen.Login.route) {
                LoginScreen(viewModel = authViewModel) {
                    app.onLoggedIn()
                    onLoginSuccess()
                    // Return to where the user was headed (Ask Hazrat is the only auth gate),
                    // falling back to Home. Drop Login from the back stack either way.
                    val target = if (cameFromAsk) Screen.AskList.route else Screen.Home.route
                    navController.navigate(target) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            }
            composable(Screen.Home.route) {
                HomeScreen(
                    viewModel = homeViewModel,
                    onContentClick = { id -> navController.navigate(Screen.Player.route(id)) },
                    onLiveClick = {
                        val session = liveSession
                        if (session != null) {
                            app.liveStreamPlayer.ensure(session.streamUrl, context)
                            context.startForegroundService(
                                Intent(context, com.khanqah.app.ListeningForegroundService::class.java)
                                    .putExtra(com.khanqah.app.ListeningForegroundService.EXTRA_TITLE, session.titleEn)
                            )
                        }
                        navController.navigate(Screen.Live.route)
                    },
                    onLibraryClick = { navController.navigate(Screen.Library.route) },
                    onProfileClick = { navController.navigate(Screen.Profile.route) },
                    onScheduleClick = {
                        navController.navigate(Screen.Schedule.route) {
                            popUpTo(Screen.Home.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onComingSoonClick = { title ->
                        navController.navigate(Screen.ComingSoon.route(title))
                    },
                    onAskHazrat = { navController.navigate(Screen.AskList.route) },
                    onCategoryTypeClick = { query ->
                        val cat = libraryViewModel.categories.value.firstOrNull { c ->
                            c.type.equals(query, ignoreCase = true) ||
                            c.nameEn.contains(query, ignoreCase = true)
                        }
                        if (cat != null) {
                            navController.navigate(
                                Screen.CategoryDetail.route(cat.id, cat.nameEn, cat.nameUr, cat.type)
                            )
                        } else {
                            navController.navigate(Screen.Library.route)
                        }
                    },
                )
            }
            composable(Screen.Library.route) {
                LibraryScreen(
                    viewModel = libraryViewModel,
                    onCategoryClick = { cat ->
                        navController.navigate(Screen.CategoryDetail.route(cat.id, cat.nameEn, cat.nameUr, cat.type))
                    },
                    onContentClick = { id -> navController.navigate(Screen.Player.route(id)) },
                )
            }
            composable(Screen.CategoryDetail.route) { backStack ->
                val categoryId = backStack.arguments?.getString("categoryId") ?: return@composable
                val nameEn  = backStack.arguments?.getString("nameEn")?.decodeUrl() ?: ""
                val nameUr  = backStack.arguments?.getString("nameUr")?.decodeUrl() ?: ""
                val catType = backStack.arguments?.getString("catType")?.decodeUrl() ?: ""
                val viewModel = remember(categoryId) { categoryDetailViewModelFactory(categoryId) }
                CategoryDetailScreen(
                    viewModel = viewModel,
                    categoryNameEn = nameEn,
                    categoryNameUr = nameUr,
                    categoryType = catType,
                    onContentClick = { id -> navController.navigate(Screen.Player.route(id)) },
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Screen.Schedule.route) {
                ScheduleScreen(sessions = scheduleList)
            }
            composable(Screen.Live.route) {
                val ctx = LocalContext.current
                LiveScreen(
                    session    = liveSession,
                    player     = app.liveStreamPlayer.player,
                    context    = ctx,
                    onExitLive = {
                        app.liveStreamPlayer.release()
                        ctx.stopService(Intent(ctx, com.khanqah.app.ListeningForegroundService::class.java))
                        navController.popBackStack()
                    },
                    pingLive   = { homeViewModel.pingLive() },
                    leaveLive  = { homeViewModel.leaveLive() },
                    checkLive  = { homeViewModel.isLiveActive() },
                )
            }
            composable(Screen.Profile.route) {
                ProfileScreen(
                    isLoggedIn = isLoggedIn,
                    displayName = displayName,
                    phone = phone,
                    role = userRole,
                    isUrdu = isUrdu,
                    onLanguageToggle = onLanguageToggle,
                    onLoginClick = { navController.navigate(Screen.Login.route) },
                    onLogout = onLogout,
                )
            }
            composable(Screen.Player.route) { backStack ->
                val id = backStack.arguments?.getString("contentId") ?: return@composable
                val viewModel = remember(id) { playerViewModelFactory(id) }
                PlayerScreen(
                    viewModel = viewModel,
                    contentId = id,
                    onBack = { navController.popBackStack() },
                )
            }
            composable(Screen.ComingSoon.route) { backStack ->
                val title = backStack.arguments?.getString("title")?.decodeUrl() ?: ""
                ComingSoonScreen(title = title)
            }
            composable(Screen.BayanTab.route) {
                val cats by libraryViewModel.categories.collectAsState()
                val cat = cats.firstOrNull { it.type.equals("bayan", ignoreCase = true) }
                if (cat != null) {
                    val vm = remember(cat.id) { categoryDetailViewModelFactory(cat.id) }
                    CategoryDetailScreen(
                        viewModel = vm,
                        categoryNameEn = cat.nameEn,
                        categoryNameUr = cat.nameUr,
                        categoryType = cat.type,
                        onContentClick = { id -> navController.navigate(Screen.Player.route(id)) },
                        onBack = {},
                        showBackButton = false,
                    )
                }
            }
            composable(Screen.ClipsTab.route) {
                val cats by libraryViewModel.categories.collectAsState()
                val cat = cats.firstOrNull { it.type.equals("clip", ignoreCase = true) }
                if (cat != null) {
                    val vm = remember(cat.id) { categoryDetailViewModelFactory(cat.id) }
                    CategoryDetailScreen(
                        viewModel = vm,
                        categoryNameEn = cat.nameEn,
                        categoryNameUr = cat.nameUr,
                        categoryType = cat.type,
                        onContentClick = { id -> navController.navigate(Screen.Player.route(id)) },
                        onBack = {},
                        showBackButton = false,
                    )
                }
            }
            composable(Screen.BooksTab.route) {
                val cats by libraryViewModel.categories.collectAsState()
                val cat = cats.firstOrNull { it.type.equals("book", ignoreCase = true) }
                if (cat != null) {
                    val vm = remember(cat.id) { categoryDetailViewModelFactory(cat.id) }
                    CategoryDetailScreen(
                        viewModel = vm,
                        categoryNameEn = cat.nameEn,
                        categoryNameUr = cat.nameUr,
                        categoryType = cat.type,
                        onContentClick = { id -> navController.navigate(Screen.Player.route(id)) },
                        onBack = {},
                        showBackButton = false,
                    )
                }
            }
            composable(Screen.AskList.route) {
                if (!isLoggedIn) {
                    androidx.compose.runtime.LaunchedEffect(Unit) {
                        cameFromAsk = true
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.AskList.route) { inclusive = true }
                        }
                    }
                } else {
                    val vm = remember { (context.applicationContext as com.khanqah.app.KhanqahApp).makeQaViewModel() }
                    AskThreadListScreen(vm,
                        onAskNew = { navController.navigate(Screen.AskCompose.route()) },
                        onOpenThread = { navController.navigate(Screen.AskConversation.route(it)) },
                        onBack = { navController.popBackStack() })
                }
            }
            composable(
                Screen.AskCompose.route,
                arguments = listOf(androidx.navigation.navArgument("threadId") { nullable = true; defaultValue = null; type = androidx.navigation.NavType.StringType })
            ) { back ->
                val threadId = back.arguments?.getString("threadId")
                val vm = remember { (context.applicationContext as com.khanqah.app.KhanqahApp).makeQaViewModel() }
                AskComposeScreen(vm, threadId, onSent = { navController.popBackStack() }, onBack = { navController.popBackStack() })
            }
            composable(
                Screen.AskConversation.route,
                arguments = listOf(androidx.navigation.navArgument("threadId") { type = androidx.navigation.NavType.StringType })
            ) { back ->
                val threadId = back.arguments?.getString("threadId") ?: return@composable
                val vm = remember { (context.applicationContext as com.khanqah.app.KhanqahApp).makeQaViewModel() }
                AskConversationScreen(vm, threadId, onBack = { navController.popBackStack() })
            }
        }
    }
}
