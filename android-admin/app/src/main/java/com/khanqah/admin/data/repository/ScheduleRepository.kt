package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class ScheduleRepository(private val api: AdminApiService) {
    suspend fun list() = api.listSchedule()
    suspend fun create(titleEn: String, titleUr: String, scheduledAt: String) =
        api.createSession(mapOf("title_en" to titleEn, "title_ur" to titleUr, "scheduled_at" to scheduledAt))
    suspend fun delete(id: String) = api.deleteSession(id)
}
