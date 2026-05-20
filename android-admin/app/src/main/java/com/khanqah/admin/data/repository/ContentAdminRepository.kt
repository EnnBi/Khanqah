package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class ContentAdminRepository(private val api: AdminApiService) {
    suspend fun listContent() = api.listContent()
    suspend fun listCategories() = api.listCategories()
    suspend fun deleteContent(id: String) = api.deleteContent(id)
}
