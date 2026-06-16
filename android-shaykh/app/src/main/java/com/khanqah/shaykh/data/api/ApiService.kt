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
}
