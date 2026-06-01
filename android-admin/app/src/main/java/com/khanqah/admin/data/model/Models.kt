package com.khanqah.admin.data.model

import com.google.gson.annotations.SerializedName

data class AuthResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    val role: String,
)

data class Content(
    val id: String,
    @SerializedName("title_en") val titleEn: String,
    @SerializedName("title_ur") val titleUr: String,
    @SerializedName("media_url") val mediaUrl: String,
    @SerializedName("thumbnail_url") val thumbnailUrl: String?,
    val type: String,
    @SerializedName("category_id") val categoryId: String,
    @SerializedName("is_video") val isVideo: Boolean,
)

data class Category(
    val id: String,
    @SerializedName("name_en") val nameEn: String,
    @SerializedName("name_ur") val nameUr: String,
    val type: String,
    @SerializedName("sort_order") val sortOrder: Int,
    val slug: String? = null,
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
    @SerializedName("title_ur") val titleUr: String = "",
    @SerializedName("stream_url") val streamUrl: String,
    val status: String,
    @SerializedName("started_at") val startedAt: String? = null,
)

data class BugReport(
    val id: String,
    @SerializedName("client_id") val clientId: String,
    val type: String,
    val note: String?,
    val route: String,
    @SerializedName("app_version") val appVersion: String,
    val platform: String,
    val status: String,
    val timestamp: String,
    @SerializedName("created_at") val createdAt: String,
)

data class UploadUrlResponse(
    @SerializedName("upload_url") val uploadUrl: String,
    @SerializedName("file_key") val fileKey: String,
    @SerializedName("cdn_url") val cdnUrl: String,
)

data class User(
    val id: String,
    val phone: String,
    @SerializedName("display_name") val displayName: String,
    val role: String,
)
