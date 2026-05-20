package com.khanqah.app.data.repository

import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.db.AppDatabase
import com.khanqah.app.data.db.entities.ContentEntity
import com.khanqah.app.data.model.Content
import kotlinx.coroutines.flow.Flow

class ContentRepository(private val api: ApiService, private val db: AppDatabase) {

    fun observeContent(categoryId: String? = null): Flow<List<ContentEntity>> =
        if (categoryId != null) db.contentDao().observeByCategory(categoryId)
        else db.contentDao().observeAll()

    suspend fun refreshContent(categoryId: String? = null) {
        val items = api.listContent(categoryId = categoryId)
        db.contentDao().upsertAll(items.map { it.toEntity() })
    }

    suspend fun getContent(id: String): Content = api.getContent(id)

    private fun Content.toEntity() = ContentEntity(
        id = id, titleEn = titleEn, titleUr = titleUr, mediaUrl = mediaUrl,
        thumbnailUrl = thumbnailUrl, type = type, categoryId = categoryId,
        isVideo = isVideo, duration = duration,
    )
}
