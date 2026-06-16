package com.khanqah.shaykh.data.api

import com.khanqah.shaykh.data.model.*
import retrofit2.http.*

interface ApiService {
    @POST("auth/otp/send")
    suspend fun sendOtp(@Body body: Map<String, String>): Map<String, String>

    @POST("auth/otp/verify")
    suspend fun verifyOtp(@Body body: Map<String, String>): AuthResponse

    @POST("auth/refresh")
    suspend fun refreshToken(@Body body: Map<String, String>): Map<String, String>

    @POST("keys")
    suspend fun registerKey(@Body body: RegisterKeyRequest): RegisterKeyResponse

    @GET("keys/{userId}")
    suspend fun getUserKey(@Path("userId") userId: String): UserKeyResponse

    @POST("qa/upload")
    suspend fun qaUploadUrl(@Body body: QaUploadRequest): QaUploadResponse

    @POST("qa/download")
    suspend fun qaDownloadUrl(@Body body: QaDownloadRequest): QaDownloadResponse

    @POST("qa/messages")
    suspend fun sendQaMessage(@Body body: SendMessageRequest): SendMessageResponse

    @GET("qa/threads")
    suspend fun listQaThreads(): List<QaThreadDto>

    @GET("qa/messages")
    suspend fun listQaMessages(@Query("thread_id") threadId: String): List<QaMessageDto>
}
