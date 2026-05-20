package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class LiveRepository(private val api: AdminApiService) {
    suspend fun getCurrent() = api.getCurrentLive()
    suspend fun start(titleEn: String, titleUr: String, streamUrl: String) =
        api.startLive(mapOf("title_en" to titleEn, "title_ur" to titleUr, "stream_url" to streamUrl))
    suspend fun end(id: String) = api.endLive(id)
}
