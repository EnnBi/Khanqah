package com.ennbi.khanqah.ui.common

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ennbi.khanqah.ui.theme.NastaleeqFontFamily
import com.ennbi.khanqah.ui.utils.LocalIsUrdu

/** Simple content page for the About section. Body text is filled in per [title]. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen(title: String, onBack: () -> Unit) {
    val ur = LocalIsUrdu.current
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        title,
                        fontFamily = if (ur) NastaleeqFontFamily else null,
                        fontSize = if (ur) 20.sp else 18.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back",
                            tint = MaterialTheme.colorScheme.onBackground)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                ),
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Spacer(Modifier.height(8.dp))
            Text(
                bodyFor(title, ur),
                fontFamily = if (ur) NastaleeqFontFamily else null,
                fontSize = if (ur) 17.sp else 15.sp,
                lineHeight = if (ur) 32.sp else 24.sp,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.85f),
            )
            Spacer(Modifier.height(32.dp))
        }
    }
}

// TODO: replace with the real About / Bio copy once provided (English + Urdu).
private fun bodyFor(title: String, ur: Boolean): String =
    if (ur) "یہ مواد جلد شامل کیا جائے گا۔" else "Content will be added here shortly."
