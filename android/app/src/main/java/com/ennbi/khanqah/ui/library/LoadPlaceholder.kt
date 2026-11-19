package com.ennbi.khanqah.ui.library

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.ennbi.khanqah.ui.utils.LocalIsUrdu

/**
 * Shown where a category's content would be while the category list isn't available:
 * a spinner while loading, a message with Retry when the server couldn't be reached.
 */
@Composable
fun LoadPlaceholder(state: LoadState, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    val isUrdu = LocalIsUrdu.current
    Column(
        modifier = modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        when (state) {
            LoadState.Loading -> CircularProgressIndicator(
                color = MaterialTheme.colorScheme.tertiary, modifier = Modifier.size(28.dp), strokeWidth = 2.dp,
            )
            LoadState.Failed -> {
                Text(
                    if (isUrdu) "لوڈ نہیں ہو سکا۔ انٹرنیٹ چیک کریں۔" else "Couldn't load. Check your connection.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.secondary,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(16.dp))
                Button(onClick = onRetry) { Text(if (isUrdu) "دوبارہ کوشش کریں" else "Retry") }
            }
            LoadState.Loaded -> Text(
                if (isUrdu) "کوئی مواد دستیاب نہیں" else "No content available",
                style = MaterialTheme.typography.bodyLarge.copy(fontStyle = FontStyle.Italic),
                color = MaterialTheme.colorScheme.secondary,
            )
        }
    }
}
