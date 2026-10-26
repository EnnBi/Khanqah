package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class ScheduleRepository(private val api: AdminApiService) {
    suspend fun list() = api.listSchedule()

    suspend fun create(
        titleEn: String, titleUr: String, scheduledAt: String,
        isRecurring: Boolean, recurrenceRule: String?,
        speakerEn: String, speakerUr: String,
    ) = api.createSession(
        mapOf(
            "title_en" to titleEn,
            "title_ur" to titleUr,
            "scheduled_at" to scheduledAt,
            "is_recurring" to isRecurring,
            "recurrence_rule" to recurrenceRule,
            "speaker_en" to speakerEn,
            "speaker_ur" to speakerUr,
        )
    )

    suspend fun update(
        id: String,
        titleEn: String, titleUr: String, scheduledAt: String,
        isRecurring: Boolean, recurrenceRule: String?,
        speakerEn: String, speakerUr: String,
    ) = api.updateSession(
        id,
        mapOf(
            "title_en" to titleEn,
            "title_ur" to titleUr,
            "scheduled_at" to scheduledAt,
            "is_recurring" to isRecurring,
            "recurrence_rule" to recurrenceRule,
            "speaker_en" to speakerEn,
            "speaker_ur" to speakerUr,
        )
    )

    suspend fun delete(id: String) = api.deleteSession(id)
}
