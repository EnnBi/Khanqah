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

    fun searchContent(query: String): Flow<List<ContentEntity>> =
        db.contentDao().searchByTitle(query)

    suspend fun refreshContent(categoryId: String? = null) {
        val items = api.listContent(categoryId = categoryId) ?: return
        db.contentDao().upsertAll(items.map { it.toEntity() })
    }

    suspend fun getContent(id: String): Content {
        return try {
            api.getContent(id)
        } catch (e: Exception) {
            db.contentDao().getById(id)?.toContent() ?: throw e
        }
    }

    private fun Content.toEntity() = ContentEntity(
        id = id, titleEn = titleEn, titleUr = titleUr, mediaUrl = mediaUrl,
        thumbnailUrl = thumbnailUrl, type = type, categoryId = categoryId,
        isVideo = isVideo, duration = duration, createdAt = createdAt ?: "",
    )

    private fun ContentEntity.toContent() = Content(
        id = id, titleEn = titleEn, titleUr = titleUr, descriptionEn = null,
        mediaUrl = mediaUrl, thumbnailUrl = thumbnailUrl, duration = duration,
        isVideo = isVideo, type = type, categoryId = categoryId,
        topics = null, createdAt = createdAt,
    )
}
