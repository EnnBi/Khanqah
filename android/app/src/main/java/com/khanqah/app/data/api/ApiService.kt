package com.khanqah.app.data.api

import com.khanqah.app.data.model.*
import retrofit2.http.*

interface ApiService {
    @POST("auth/otp/send")
    suspend fun sendOtp(@Body body: Map<String, String>): Map<String, String>

    @POST("auth/otp/verify")
    suspend fun verifyOtp(@Body body: Map<String, String>): AuthResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: Map<String, String>): Map<String, String>

    @GET("content")
    suspend fun listContent(
        @Query("type") type: String? = null,
        @Query("category_id") categoryId: String? = null,
    ): List<Content>

    @GET("content/{id}")
    suspend fun getContent(@Path("id") id: String): Content

    @GET("categories")
    suspend fun listCategories(): List<Category>

    @GET("schedule")
    suspend fun listSchedule(): List<ScheduledSession>

    @GET("live/current")
    suspend fun getCurrentLive(): LiveSession?

    @GET("me/progress")
    suspend fun getProgress(): List<Progress>

    @PUT("me/progress/{contentId}")
    suspend fun upsertProgress(
        @Path("contentId") contentId: String,
        @Body body: UpsertProgressRequest,
    ): Progress
}
