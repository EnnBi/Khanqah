package com.khanqah.app.data.db

import androidx.room.*
import com.khanqah.app.data.db.entities.ContentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ContentDao {
    @Query("SELECT * FROM content ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<ContentEntity>>

    @Query("SELECT * FROM content WHERE categoryId = :categoryId ORDER BY createdAt DESC")
    fun observeByCategory(categoryId: String): Flow<List<ContentEntity>>

    @Query("SELECT * FROM content WHERE titleEn LIKE '%' || :query || '%' ORDER BY createdAt DESC")
    fun searchByTitle(query: String): Flow<List<ContentEntity>>

    @Query("SELECT * FROM content WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ContentEntity?

    @Upsert
    suspend fun upsertAll(items: List<ContentEntity>)
}
