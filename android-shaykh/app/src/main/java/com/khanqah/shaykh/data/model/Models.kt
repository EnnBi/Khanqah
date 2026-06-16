package com.khanqah.shaykh.data.model

import com.google.gson.annotations.SerializedName

data class AuthResponse(
    @SerializedName("access_token") val accessToken: String,
    @SerializedName("refresh_token") val refreshToken: String,
    val role: String,
    @SerializedName("display_name") val displayName: String? = null,
    @SerializedName("user_id") val userId: String? = null,
)
