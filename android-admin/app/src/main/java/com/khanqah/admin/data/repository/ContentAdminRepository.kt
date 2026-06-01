package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class ContentAdminRepository(private val api: AdminApiService) {
    suspend fun listContent() = api.listContent()
    suspend fun listCategories() = api.listCategories()
    suspend fun updateContent(id: String, titleEn: String, titleUr: String, categoryId: String) =
        api.updateContent(id, mapOf("title_en" to titleEn, "title_ur" to titleUr, "category_id" to categoryId))
    suspend fun deleteContent(id: String) = api.deleteContent(id)
}
