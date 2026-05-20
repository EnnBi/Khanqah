package com.khanqah.app.data.api

import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

private const val BASE_URL = "https://arrashid.ennbi.com/api/"

class ApiClient(private val tokenManager: TokenManager) {

    private val authInterceptor = okhttp3.Interceptor { chain ->
        val token = runBlocking { tokenManager.getAccessToken() }
        val req = if (token != null)
            chain.request().newBuilder().header("Authorization", "Bearer $token").build()
        else chain.request()
        chain.proceed(req)
    }

    private val tokenAuthenticator = object : Authenticator {
        override fun authenticate(route: Route?, response: Response): Request? {
            if (response.code != 401) return null
            val refreshToken = runBlocking { tokenManager.getRefreshToken() } ?: return null
            return try {
                val newTokens = runBlocking {
                    buildRetrofit(null).create(ApiService::class.java)
                        .refreshToken(mapOf("refresh_token" to refreshToken))
                }
                val newAccess = newTokens["access_token"] ?: return null
                runBlocking { tokenManager.saveAccessToken(newAccess) }
                response.request.newBuilder().header("Authorization", "Bearer $newAccess").build()
            } catch (e: Exception) {
                null
            }
        }
    }

    val service: ApiService = buildRetrofit(tokenManager).create(ApiService::class.java)

    private fun buildRetrofit(tm: TokenManager?): Retrofit {
        val http = OkHttpClient.Builder()
            .apply { if (tm != null) addInterceptor(authInterceptor).authenticator(tokenAuthenticator) }
            .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
            .build()
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(http)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}
