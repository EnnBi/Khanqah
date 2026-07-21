package com.khanqah.app.data.db.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "content")
data class ContentEntity(
    @PrimaryKey val id: String,
    val titleEn: String,
    val titleUr: String,
    val mediaUrl: String,
    val thumbnailUrl: String?,
    val type: String,
    val categoryId: String,
    val isVideo: Boolean,
    val duration: Int?,
    val createdAt: String = "",
    val cachedAt: Long = System.currentTimeMillis(),
)
