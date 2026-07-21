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
        val entities = items.map { it.toEntity() }
        db.contentDao().upsertAll(entities)
        val freshIds = entities.map { it.id }
        if (categoryId != null) {
            if (freshIds.isEmpty()) db.contentDao().deleteStaleByCategory(categoryId, listOf(""))
            else db.contentDao().deleteStaleByCategory(categoryId, freshIds)
        } else {
            if (freshIds.isEmpty()) db.contentDao().deleteStaleAll(listOf(""))
            else db.contentDao().deleteStaleAll(freshIds)
        }
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
