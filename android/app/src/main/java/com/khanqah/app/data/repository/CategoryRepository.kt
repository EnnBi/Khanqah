package com.khanqah.app.data.repository

import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.db.AppDatabase
import com.khanqah.app.data.db.entities.CategoryEntity
import com.khanqah.app.data.model.Category
import kotlinx.coroutines.flow.Flow

class CategoryRepository(private val api: ApiService, private val db: AppDatabase) {

    fun observeCategories(): Flow<List<CategoryEntity>> = db.categoryDao().observeAll()

    suspend fun refresh() {
        val cats = api.listCategories()
        db.categoryDao().upsertAll(cats.map { it.toEntity() })
    }

    private fun Category.toEntity() = CategoryEntity(
        id = id, nameEn = nameEn, nameUr = nameUr,
        type = type, parentId = parentId, sortOrder = sortOrder,
    )
}
