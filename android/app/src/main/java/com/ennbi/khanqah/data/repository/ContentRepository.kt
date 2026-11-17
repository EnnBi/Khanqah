package com.ennbi.khanqah.data.repository

import com.ennbi.khanqah.data.api.ApiService
import com.ennbi.khanqah.data.db.AppDatabase
import com.ennbi.khanqah.data.db.entities.ContentEntity
import com.ennbi.khanqah.data.model.Content
import com.ennbi.khanqah.data.model.ContentFacets
import kotlinx.coroutines.flow.Flow

class ContentRepository(private val api: ApiService, private val db: AppDatabase) {

    fun observeContent(categoryId: String? = null): Flow<List<ContentEntity>> =
        if (categoryId != null) db.contentDao().observeByCategory(categoryId)
        else db.contentDao().observeAll()

    /** One page of server-side search results. Not cached: it's a transient view of the library. */
    suspend fun searchPage(
        q: String?, categoryId: String?, speaker: String?, offset: Int, limit: Int,
    ): List<ContentEntity> =
        (api.listContent(
            categoryId = categoryId, q = q?.trim()?.ifEmpty { null }, speaker = speaker,
            limit = limit, offset = offset,
        ) ?: emptyList()).map { it.toEntity() }

    /** Filter options (speakers, categories with content), optionally within one category. */
    suspend fun facets(categoryId: String? = null): ContentFacets? =
        try { api.contentFacets(categoryId = categoryId) } catch (_: Exception) { null }

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
        creditEn = creditEn, creditUr = creditUr,
    )

    private fun ContentEntity.toContent() = Content(
        id = id, titleEn = titleEn, titleUr = titleUr, descriptionEn = null,
        mediaUrl = mediaUrl, thumbnailUrl = thumbnailUrl, duration = duration,
        isVideo = isVideo, type = type, categoryId = categoryId,
        topics = null, createdAt = createdAt,
        creditEn = creditEn, creditUr = creditUr,
    )
}
