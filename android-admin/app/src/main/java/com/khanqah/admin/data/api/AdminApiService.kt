package com.khanqah.admin.data.api

import com.khanqah.admin.data.model.*
import retrofit2.http.*

interface AdminApiService {
    @POST("auth/otp/send")
    suspend fun sendOtp(@Body body: Map<String, String>): Map<String, String>

    @POST("auth/otp/verify")
    suspend fun verifyOtp(@Body body: Map<String, String>): AuthResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: Map<String, String>): Map<String, String>

    @GET("content")
    suspend fun listContent(): List<Content>

    @POST("admin/upload")
    suspend fun getUploadUrl(@Body body: Map<String, String>): UploadUrlResponse

    @POST("admin/content")
    suspend fun createContent(@Body body: Map<String, Any?>): Content

    @PUT("admin/content/{id}")
    suspend fun updateContent(@Path("id") id: String, @Body body: Map<String, Any?>): Content

    @DELETE("admin/content/{id}")
    suspend fun deleteContent(@Path("id") id: String)

    @GET("categories")
    suspend fun listCategories(): List<Category>

    @POST("admin/categories")
    suspend fun createCategory(@Body body: Map<String, Any?>): Category

    @PUT("admin/categories/{id}")
    suspend fun updateCategory(@Path("id") id: String, @Body body: Map<String, Any?>): Category

    @DELETE("admin/categories/{id}")
    suspend fun deleteCategory(@Path("id") id: String)

    @GET("schedule")
    suspend fun listSchedule(): List<ScheduledSession>

    @POST("admin/schedule")
    suspend fun createSession(@Body body: Map<String, Any?>): ScheduledSession

    @DELETE("admin/schedule/{id}")
    suspend fun deleteSession(@Path("id") id: String)

    @PUT("admin/schedule/{id}")
    suspend fun updateSession(@Path("id") id: String, @Body body: Map<String, Any?>): ScheduledSession

    @POST("admin/live/start")
    suspend fun startLive(@Body body: Map<String, String>): LiveSession

    @POST("admin/live/end/{id}")
    suspend fun endLive(@Path("id") id: String): LiveSession

    @GET("live/current")
    suspend fun getCurrentLive(): LiveSession?

    @GET("live/listeners")
    suspend fun getListeners(): Map<String, Int>

    @GET("admin/team")
    suspend fun listTeam(): List<User>

    @PUT("admin/team/{id}/role")
    suspend fun updateRole(@Path("id") id: String, @Body body: Map<String, String>): User

    @PUT("admin/team/{id}/name")
    suspend fun updateUserName(@Path("id") id: String, @Body body: Map<String, String>): User

    @DELETE("admin/team/{id}")
    suspend fun deleteUser(@Path("id") id: String)

    @GET("admin/bugs")
    suspend fun listBugs(@Query("status") status: String? = null): List<BugReport>

    @GET("admin/notification-settings")
    suspend fun listNotificationSettings(): List<NotificationSetting>

    @PUT("admin/notification-settings/{key}")
    suspend fun updateNotificationSetting(@Path("key") key: String, @Body body: Map<String, Boolean>)
}
