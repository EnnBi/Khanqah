package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService
import com.khanqah.admin.data.model.Category

class LiveRepository(private val api: AdminApiService) {
    suspend fun getCurrent(): com.khanqah.admin.data.model.LiveSession? = try {
        api.getCurrentLive()
    } catch (_: Exception) { null }
    suspend fun listCategories(): List<Category> = api.listCategories()
    suspend fun start(categoryId: String) = api.startLive(mapOf("category_id" to categoryId))
    suspend fun end(id: String) = api.endLive(id)
}
