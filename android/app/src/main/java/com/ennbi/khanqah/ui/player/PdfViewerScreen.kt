package com.khanqah.app.ui.player

import android.graphics.Bitmap
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import java.util.concurrent.atomic.AtomicLong

private sealed interface PdfState {
    object Idle : PdfState
    data class Downloading(val progress: Int) : PdfState   // 0–100
    data class Rendering(val pages: List<Bitmap>, val total: Int) : PdfState
    data class Error(val message: String) : PdfState
}

@Composable
fun PdfViewerScreen(
    url: String,
    title: String,
    type: String,
    onBack: () -> Unit,
) {
    val gold = MaterialTheme.colorScheme.tertiary
    val context = LocalContext.current
    val density = LocalDensity.current
    var state by remember { mutableStateOf<PdfState>(PdfState.Idle) }

    LaunchedEffect(url) {
        // ── Step 1: download with progress ──
        val tmpFile = File(context.cacheDir, "preview_${url.hashCode()}.pdf")

        if (!tmpFile.exists()) {
            state = PdfState.Downloading(0)
            withContext(Dispatchers.IO) {
                try {
                    val client = OkHttpClient()

                    // Probe: check content length + range support
                    val headResp = client.newCall(Request.Builder().url(url).head().build()).execute()
                    val contentLength = headResp.header("Content-Length")?.toLongOrNull() ?: -1L
                    val rangeOk = headResp.header("Accept-Ranges") == "bytes" ||
                                  headResp.code == 200
                    headResp.close()

                    if (rangeOk && contentLength > 0) {
                        // Parallel 4-chunk download via HTTP Range requests
                        val numChunks = 4
                        val chunkSize = (contentLength + numChunks - 1) / numChunks
                        val raf = RandomAccessFile(tmpFile, "rw")
                        raf.setLength(contentLength)
                        val totalWritten = AtomicLong(0)
                        try {
                            coroutineScope {
                                (0 until numChunks).map { i ->
                                    async {
                                        val start = i * chunkSize
                                        val end = minOf(start + chunkSize - 1, contentLength - 1)
                                        val resp = client.newCall(
                                            Request.Builder().url(url)
                                                .header("Range", "bytes=$start-$end")
                                                .build()
                                        ).execute()
                                        if (!resp.isSuccessful) throw IOException("Chunk $i: ${resp.code}")
                                        val body = resp.body ?: throw IOException("Empty chunk $i")
                                        val source = body.source()
                                        val buf = ByteArray(16_384)
                                        var pos = start
                                        while (true) {
                                            val n = source.read(buf)
                                            if (n == -1) break
                                            synchronized(raf) {
                                                raf.seek(pos)
                                                raf.write(buf, 0, n)
                                            }
                                            pos += n
                                            val written = totalWritten.addAndGet(n.toLong())
                                            state = PdfState.Downloading((written * 100 / contentLength).toInt())
                                        }
                                        body.close()
                                    }
                                }.awaitAll()
                            }
                        } finally {
                            raf.close()
                        }
                    } else {
                        // Fallback: sequential download
                        val response = client.newCall(Request.Builder().url(url).build()).execute()
                        if (!response.isSuccessful) {
                            state = PdfState.Error("Failed to download (${response.code})")
                            return@withContext
                        }
                        val body = response.body ?: run {
                            state = PdfState.Error("Empty response")
                            return@withContext
                        }
                        val length = body.contentLength()
                        val source = body.source()
                        val buf = ByteArray(16_384)
                        var bytesRead = 0L
                        tmpFile.outputStream().use { out ->
                            while (true) {
                                val n = source.read(buf)
                                if (n == -1) break
                                out.write(buf, 0, n)
                                bytesRead += n
                                if (length > 0) state = PdfState.Downloading((bytesRead * 100 / length).toInt())
                            }
                        }
                    }
                } catch (e: Exception) {
                    tmpFile.delete()
                    state = PdfState.Error(e.message ?: "Download failed")
                    return@withContext
                }
            }
            if (state is PdfState.Error) return@LaunchedEffect
        }

        // ── Step 2: open renderer, emit pages one by one ──
        withContext(Dispatchers.IO) {
            try {
                val pfd = ParcelFileDescriptor.open(tmpFile, ParcelFileDescriptor.MODE_READ_ONLY)
                val renderer = PdfRenderer(pfd)
                val total = renderer.pageCount
                val screenWidthPx = with(density) { 400.dp.roundToPx() }
                val pages = mutableListOf<Bitmap>()

                state = PdfState.Rendering(emptyList(), total)

                for (i in 0 until total) {
                    val page = renderer.openPage(i)
                    val scale = screenWidthPx.toFloat() / page.width
                    val bmp = Bitmap.createBitmap(
                        screenWidthPx,
                        (page.height * scale).toInt(),
                        Bitmap.Config.ARGB_8888,
                    )
                    bmp.eraseColor(android.graphics.Color.WHITE)
                    page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                    page.close()
                    pages.add(bmp)
                    state = PdfState.Rendering(pages.toList(), total)
                }

                renderer.close()
                pfd.close()
            } catch (e: Exception) {
                state = PdfState.Error(e.message ?: "Render failed")
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF0EDE6)),
    ) {
        // ── Header ──
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.background)
                .statusBarsPadding()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surface)
                    .clickable(onClick = onBack),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = MaterialTheme.colorScheme.onBackground, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(type.uppercase(), style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp, letterSpacing = 0.08.sp), color = gold)
                Text(title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold), color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            // Page counter while rendering
            val s = state
            if (s is PdfState.Rendering && s.total > 0) {
                Text(
                    "${s.pages.size}/${s.total}",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                    color = MaterialTheme.colorScheme.secondary,
                )
            }
        }

        // Download progress bar
        val s = state
        if (s is PdfState.Downloading) {
            LinearProgressIndicator(
                progress = { s.progress / 100f },
                modifier = Modifier.fillMaxWidth(),
                color = gold,
                trackColor = gold.copy(alpha = 0.15f),
            )
        } else {
            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f), thickness = 0.5.dp)
        }

        // ── Body ──
        when (val st = state) {
            is PdfState.Idle,
            is PdfState.Downloading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    CircularProgressIndicator(color = gold, strokeWidth = 3.dp, modifier = Modifier.size(48.dp))
                    val pct = (st as? PdfState.Downloading)?.progress ?: 0
                    Text(
                        if (pct > 0) "Downloading… $pct%" else "Preparing…",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
            }

            is PdfState.Error -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.padding(24.dp)) {
                    Text(st.message, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
                }
            }

            is PdfState.Rendering -> {
                val listState = rememberLazyListState()
                Box(Modifier.fillMaxSize()) {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                        contentPadding = PaddingValues(vertical = 8.dp),
                    ) {
                        items(st.pages.size) { i ->
                            Image(
                                bitmap = st.pages[i].asImageBitmap(),
                                contentDescription = "Page ${i + 1}",
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                                contentScale = ContentScale.FillWidth,
                            )
                        }
                        // Placeholder rows for pages not yet rendered
                        if (st.pages.size < st.total) {
                            items(st.total - st.pages.size) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(500.dp)
                                        .padding(horizontal = 8.dp)
                                        .background(Color.White, RoundedCornerShape(4.dp)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    CircularProgressIndicator(color = gold.copy(alpha = 0.4f), strokeWidth = 2.dp, modifier = Modifier.size(28.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
