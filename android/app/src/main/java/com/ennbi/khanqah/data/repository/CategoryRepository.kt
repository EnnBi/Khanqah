package com.ennbi.khanqah.data.repository

import com.ennbi.khanqah.data.api.ApiService
import com.ennbi.khanqah.data.db.AppDatabase
import com.ennbi.khanqah.data.db.entities.CategoryEntity
import com.ennbi.khanqah.data.model.Category
import kotlinx.coroutines.flow.Flow

class CategoryRepository(private val api: ApiService, private val db: AppDatabase) {

    fun observeCategories(): Flow<List<CategoryEntity>> = db.categoryDao().observeAll()

    suspend fun refresh() {
        val cats = api.listCategories()
        val entities = cats.map { it.toEntity() }
        db.categoryDao().upsertAll(entities)
        if (entities.isNotEmpty()) {
            db.categoryDao().deleteNotIn(entities.map { it.id })
        }
    }

    private fun Category.toEntity() = CategoryEntity(
        id = id, nameEn = nameEn, nameUr = nameUr,
        type = type, parentId = parentId, sortOrder = sortOrder,
    )
}
