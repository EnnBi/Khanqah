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
import androidx.compose.material.icons.outlined.MusicNote
import androidx.compose.material.icons.outlined.Videocam
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import com.khanqah.admin.data.model.Category
import com.khanqah.admin.data.model.Content
import com.khanqah.admin.data.model.ScheduledSession
import com.khanqah.admin.ui.live.LiveOnAirScreen
import com.khanqah.admin.ui.live.LiveViewModel
import com.khanqah.admin.ui.live.NextSessionCard
import com.khanqah.admin.ui.live.nextUpcoming
import com.khanqah.admin.ui.theme.*
import java.time.Duration
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
    onNavigateToContent: () -> Unit,
) {
    val currentSession by liveViewModel.currentSession.collectAsState()
    val isStreaming    by liveViewModel.isStreaming.collectAsState()
    val error          by liveViewModel.error.collectAsState()
    val listenerCount  by liveViewModel.listenerCount.collectAsState()
    val categories     by liveViewModel.categories.collectAsState()
    val contentCount   by homeViewModel.contentCount.collectAsState()
    val nextSession    by homeViewModel.nextSession.collectAsState()
    val openBugCount   by homeViewModel.openBugCount.collectAsState()
    val recentContent  by homeViewModel.recentContent.collectAsState()

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

    Scaffold(
        containerColor = AdminBackground,
        floatingActionButton = {
            FloatingActionButton(
                onClick        = { liveViewModel.clearError(); showSetupSheet = true },
                containerColor = AdminGold,
                contentColor   = AdminOnGold,
            ) {
                Icon(Icons.Outlined.Mic, contentDescription = "Start broadcast")
            }
        },
    ) { padding ->
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(padding)
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

        // NOT LIVE card
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
            }
        }

        Spacer(Modifier.height(16.dp))

        // Stats row — equal-height tiles
        Row(
            modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            DashboardTile(
                modifier   = Modifier.weight(1f).fillMaxHeight(),
                label      = "CONTENT",
                value      = if (contentCount == 0) "—" else contentCount.toString(),
                valueStyle = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold),
            )
            DashboardTile(
                modifier   = Modifier.weight(1f).fillMaxHeight(),
                label      = "NEXT SESSION",
                value      = nextSession?.titleEn ?: "None scheduled",
                sub        = nextSession?.let { formatNextAt(it.scheduledAt) },
                valueStyle = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
            )
        }

        // Bug alert
        if (openBugCount > 0) {
            Spacer(Modifier.height(16.dp))
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

        Spacer(Modifier.height(24.dp))

        // Recent content
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "RECENT CONTENT",
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.18.sp, fontWeight = FontWeight.Bold),
                color = AdminGold,
                modifier = Modifier.weight(1f),
            )
            if (recentContent.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .clickable { onNavigateToContent() }
                        .padding(horizontal = 4.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "See all",
                        style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 0.1.sp),
                        color = AdminCreamMuted,
                    )
                    Icon(
                        Icons.Outlined.ChevronRight, contentDescription = null,
                        tint = AdminCreamMuted, modifier = Modifier.size(16.dp),
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        if (recentContent.isEmpty()) {
            Text("No content yet", style = MaterialTheme.typography.bodyMedium, color = AdminCreamMuted)
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                recentContent.forEach { item ->
                    RecentContentRow(
                        item         = item,
                        categoryName = categories.find { it.id == item.categoryId }?.nameEn ?: item.type,
                    )
                }
            }
        }

        Spacer(Modifier.height(88.dp))
    }
    }

    // Broadcast setup bottom sheet
    if (showSetupSheet) {
        ModalBottomSheet(
            onDismissRequest = { showSetupSheet = false },
            sheetState       = sheetState,
            containerColor   = AdminSurface,
        ) {
            LiveSetupSheetContent(
                categories   = categories,
                sessions     = sessions,
                error        = error,
                onClearError = { liveViewModel.clearError() },
                onStart      = { categoryId, titleEn, titleUr, record ->
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

    val nextSession = remember(sessions) { sessions.nextUpcoming() }

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

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor     = AdminSurfaceVar, unfocusedContainerColor = AdminSurfaceVar,
        focusedBorderColor        = AdminGold, unfocusedBorderColor = AdminGold.copy(alpha = 0.35f),
        focusedLabelColor         = AdminGold, unfocusedLabelColor = AdminGold.copy(alpha = 0.55f),
        focusedTextColor          = AdminCream, unfocusedTextColor = AdminCream, cursorColor = AdminGold,
    )

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
            NextSessionCard(
                session = nextSession,
                onUse   = { titleEn = nextSession.titleEn; titleUr = nextSession.titleUr },
            )
            Spacer(Modifier.height(16.dp))
        }

        ExposedDropdownMenuBox(expanded = dropdownExpanded, onExpandedChange = { dropdownExpanded = !dropdownExpanded }) {
            OutlinedTextField(
                value         = selectedCategory?.nameEn ?: if (categories.isEmpty()) "Loading…" else "Select type",
                onValueChange = {}, readOnly = true, label = { Text("Stream Type") },
                trailingIcon  = { ExposedDropdownMenuDefaults.TrailingIcon(dropdownExpanded) },
                shape         = RoundedCornerShape(12.dp),
                modifier      = Modifier.fillMaxWidth().menuAnchor(),
                colors        = fieldColors,
            )
            ExposedDropdownMenu(
                expanded          = dropdownExpanded,
                onDismissRequest  = { dropdownExpanded = false },
                modifier          = Modifier.background(AdminSurface),
            ) {
                categories.forEach { cat ->
                    DropdownMenuItem(
                        text    = { Text(cat.nameEn, color = AdminCream) },
                        onClick = { selectedCategory = cat; dropdownExpanded = false },
                    )
                }
            }
        }

        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = titleEn, onValueChange = { titleEn = it },
            label = { Text("Session Title (English)") }, singleLine = true,
            shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(), colors = fieldColors,
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = titleUr, onValueChange = { titleUr = it },
            label = { Text("عنوان (اردو)") }, singleLine = true,
            shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(), colors = fieldColors,
        )
        Spacer(Modifier.height(12.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(AdminSurfaceVar)
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("Record Broadcast", style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold), color = AdminCream)
                Text("Save as content after broadcast ends", style = MaterialTheme.typography.bodySmall, color = AdminCream.copy(alpha = 0.48f))
            }
            Switch(
                checked         = recordBroadcast,
                onCheckedChange = { recordBroadcast = it },
                colors          = SwitchDefaults.colors(checkedTrackColor = AdminGold, checkedThumbColor = AdminBackground),
            )
        }

        error?.let {
            Spacer(Modifier.height(10.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = AdminError)
        }

        Spacer(Modifier.height(20.dp))
        Button(
            onClick  = ::goLive,
            enabled  = canStart,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape    = RoundedCornerShape(27.dp),
            colors   = ButtonDefaults.buttonColors(containerColor = AdminCoral, disabledContainerColor = AdminCoral.copy(alpha = 0.3f)),
        ) {
            Icon(Icons.Outlined.Mic, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text("START BROADCAST", fontWeight = FontWeight.Bold, letterSpacing = 0.06.sp)
        }
    }
}

@Composable
private fun DashboardTile(
    label: String,
    value: String,
    sub: String? = null,
    valueStyle: androidx.compose.ui.text.TextStyle = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
    modifier: Modifier = Modifier,
) {
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
            Text(value, style = valueStyle, color = AdminCream,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
            sub?.let {
                Spacer(Modifier.height(2.dp))
                Text(it, style = MaterialTheme.typography.bodySmall, color = AdminGold)
            }
        }
    }
}

@Composable
private fun RecentContentRow(item: Content, categoryName: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AdminSurface)
            .border(1.dp, AdminBorder, RoundedCornerShape(12.dp))
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(AdminSurfaceVar),
            contentAlignment = Alignment.Center,
        ) {
            if (!item.thumbnailUrl.isNullOrBlank()) {
                AsyncImage(
                    model              = item.thumbnailUrl,
                    contentDescription = null,
                    contentScale       = ContentScale.Crop,
                    modifier           = Modifier.fillMaxSize(),
                )
            } else {
                Icon(
                    if (item.isVideo) Icons.Outlined.Videocam else Icons.Outlined.MusicNote,
                    contentDescription = null, tint = AdminGold, modifier = Modifier.size(20.dp),
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                item.titleEn,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                color = AdminCream, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                "$categoryName · ${item.type}",
                style = MaterialTheme.typography.bodySmall,
                color = AdminCreamMuted, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        formatRelative(item.createdAt)?.let {
            Spacer(Modifier.width(8.dp))
            Text(it, style = MaterialTheme.typography.labelSmall, color = AdminCreamMuted)
        }
    }
}

private fun formatRelative(iso: String?): String? {
    if (iso.isNullOrBlank()) return null
    return try {
        val then = Instant.parse(iso)
        val days = Duration.between(then, Instant.now()).toDays()
        when {
            days <= 0L  -> "Today"
            days == 1L  -> "1d"
            days < 7L   -> "${days}d"
            days < 30L  -> "${days / 7}w"
            else        -> {
                val zdt = then.atZone(ZoneId.systemDefault())
                "${zdt.dayOfMonth} ${zdt.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)}"
            }
        }
    } catch (_: Exception) { null }
}

private fun formatNextAt(scheduledAt: String): String = try {
    val zdt = Instant.parse(scheduledAt).atZone(ZoneId.systemDefault())
    val h12 = if (zdt.hour % 12 == 0) 12 else zdt.hour % 12
    val period = if (zdt.hour < 12) "AM" else "PM"
    "${zdt.dayOfMonth} ${zdt.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} · $h12:%02d $period".format(zdt.minute)
} catch (_: Exception) { scheduledAt }
