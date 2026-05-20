package com.khanqah.app.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val nameEn: String,
    val nameUr: String,
    val type: String,
    val parentId: String?,
    val sortOrder: Int,
)
