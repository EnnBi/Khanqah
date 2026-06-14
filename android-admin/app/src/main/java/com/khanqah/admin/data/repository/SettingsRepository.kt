package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class SettingsRepository(private val api: AdminApiService) {
    suspend fun listNotificationSettings() = api.listNotificationSettings()

    suspend fun setNotificationEnabled(key: String, enabled: Boolean) =
        api.updateNotificationSetting(key, mapOf("enabled" to enabled))
}
