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

@OptIn(ExperimentalMaterial3Api::class)
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
            contentAlignment = Alignment.Center,
        ) {
            Text(
                if (fileUri != null) fileName else "Tap to choose file",
                color = if (fileUri != null) MaterialTheme.colorScheme.onSurface
                else MaterialTheme.colorScheme.outline,
            )
        }

        Spacer(Modifier.height(16.dp))

        OutlinedTextField(value = titleEn, onValueChange = { titleEn = it },
            label = { Text("Title (English)") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(value = titleUr, onValueChange = { titleUr = it },
            label = { Text("عنوان (اردو)") }, modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))

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
            is UploadState.Done -> Text("Uploaded!", color = MaterialTheme.colorScheme.primary)
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
            modifier = Modifier.fillMaxWidth().height(50.dp),
        ) {
            Text(if (state is UploadState.Uploading) "Uploading..." else "Upload")
        }
    }
}
