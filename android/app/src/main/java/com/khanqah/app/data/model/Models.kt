package com.khanqah.app.data.model

import com.google.gson.annotations.SerializedName

data class AuthResponse(
    @SerializedName("access_token")  val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    val role: String,
    @SerializedName("display_name")  val displayName: String = "",
    @SerializedName("user_id")       val userId: String = "",
)

data class Content(
    val id: String,
    @SerializedName("title_en") val titleEn: String,
    @SerializedName("title_ur") val titleUr: String,
    @SerializedName("description_en") val descriptionEn: String?,
    @SerializedName("media_url") val mediaUrl: String,
    @SerializedName("thumbnail_url") val thumbnailUrl: String?,
    val duration: Int?,
    @SerializedName("is_video") val isVideo: Boolean,
    val type: String,
    @SerializedName("category_id") val categoryId: String,
    val topics: List<Topic>?,
    @SerializedName("created_at") val createdAt: String? = null,
)

data class Topic(
    val id: String,
    @SerializedName("title_en") val titleEn: String,
    @SerializedName("title_ur") val titleUr: String,
    @SerializedName("timestamp_seconds") val timestampSeconds: Int,
)

data class Category(
    val id: String,
    @SerializedName("name_en") val nameEn: String,
    @SerializedName("name_ur") val nameUr: String,
    val type: String,
    @SerializedName("parent_id") val parentId: String?,
    @SerializedName("sort_order") val sortOrder: Int,
)

data class ScheduledSession(
    val id: String,
    @SerializedName("title_en") val titleEn: String,
    @SerializedName("title_ur") val titleUr: String,
    @SerializedName("scheduled_at") val scheduledAt: String,
    @SerializedName("is_recurring") val isRecurring: Boolean,
    @SerializedName("recurrence_rule") val recurrenceRule: String?,
)

data class LiveSession(
    val id: String,
    @SerializedName("title_en") val titleEn: String,
    @SerializedName("stream_url") val streamUrl: String,
    val status: String,
)

data class Progress(
    @SerializedName("content_id") val contentId: String,
    @SerializedName("position_seconds") val positionSeconds: Int,
    val completed: Boolean,
)

data class UpsertProgressRequest(
    @SerializedName("position_seconds") val positionSeconds: Int,
    val completed: Boolean,
)
