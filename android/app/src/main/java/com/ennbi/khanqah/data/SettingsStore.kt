package com.ennbi.khanqah.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.settingsStore by preferencesDataStore("settings")

/** User preferences surfaced on the Profile screen: theme, playback speed, skip interval,
 *  notifications. Persisted with DataStore. */
class SettingsStore(private val context: Context) {

    enum class ThemeMode { SYSTEM, LIGHT, DARK }

    private val THEME  = stringPreferencesKey("theme_mode")
    private val SPEED  = floatPreferencesKey("playback_speed")
    private val SKIP   = intPreferencesKey("skip_interval_sec")
    private val NOTIF  = booleanPreferencesKey("notifications_enabled")

    val themeMode: Flow<ThemeMode> = context.settingsStore.data.map {
        runCatching { ThemeMode.valueOf(it[THEME] ?: "SYSTEM") }.getOrDefault(ThemeMode.SYSTEM)
    }
    val playbackSpeed: Flow<Float> = context.settingsStore.data.map { it[SPEED] ?: 1.0f }
    val skipIntervalSec: Flow<Int> = context.settingsStore.data.map { it[SKIP] ?: 15 }
    val notificationsEnabled: Flow<Boolean> = context.settingsStore.data.map { it[NOTIF] ?: true }

    suspend fun themeModeNow(): ThemeMode = themeMode.first()
    suspend fun playbackSpeedNow(): Float = playbackSpeed.first()
    suspend fun skipIntervalNow(): Int = skipIntervalSec.first()

    suspend fun setThemeMode(mode: ThemeMode) = context.settingsStore.edit { it[THEME] = mode.name }
    suspend fun setPlaybackSpeed(speed: Float) = context.settingsStore.edit { it[SPEED] = speed }
    suspend fun setSkipInterval(sec: Int) = context.settingsStore.edit { it[SKIP] = sec }
    suspend fun setNotificationsEnabled(on: Boolean) = context.settingsStore.edit { it[NOTIF] = on }
}
