package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class CategoryRepository(private val api: AdminApiService) {
    suspend fun list() = api.listCategories()
    suspend fun create(nameEn: String, nameUr: String) =
        api.createCategory(mapOf("name_en" to nameEn, "name_ur" to nameUr))
    suspend fun update(id: String, nameEn: String, nameUr: String) =
        api.updateCategory(id, mapOf("name_en" to nameEn, "name_ur" to nameUr))
    suspend fun delete(id: String) = api.deleteCategory(id)
}
