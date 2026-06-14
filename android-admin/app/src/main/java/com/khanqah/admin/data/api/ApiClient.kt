package com.khanqah.admin.data.api

import kotlinx.coroutines.runBlocking
import okhttp3.*
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

private const val BASE_URL = "https://arrashid.ennbi.com/api/"

class ApiClient(private val tokenManager: TokenManager) {
    private val authInterceptor = Interceptor { chain ->
        val token = runBlocking { tokenManager.getAccessToken() }
        val req = if (token != null)
            chain.request().newBuilder().header("Authorization", "Bearer $token").build()
        else chain.request()
        chain.proceed(req)
    }

    private val refreshAuthenticator = object : Authenticator {
        override fun authenticate(route: Route?, response: Response): Request? {
            if (response.code != 401) return null

            // Already retried once with a refreshed token and still 401 → give up.
            if (response.priorResponse != null) return expire()

            val rt = runBlocking { tokenManager.getRefreshToken() } ?: return expire()
            return try {
                val newTokens = runBlocking {
                    buildBase().create(AdminApiService::class.java)
                        .refreshToken(mapOf("refresh_token" to rt))
                }
                val newAccess = newTokens["access_token"] ?: return expire()
                runBlocking { tokenManager.saveAccessToken(newAccess) }
                response.request.newBuilder().header("Authorization", "Bearer $newAccess").build()
            } catch (e: Exception) {
                expire()
            }
        }

        // Session is unrecoverable: clear tokens and signal the UI to route to login.
        private fun expire(): Request? {
            runBlocking { tokenManager.clear() }
            tokenManager.notifyAuthExpired()
            return null
        }
    }

    val service: AdminApiService = buildWithAuth().create(AdminApiService::class.java)

    private fun buildBase(): Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
            .build())
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private fun buildWithAuth(): Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .authenticator(refreshAuthenticator)
            .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
            .build())
        .addConverterFactory(GsonConverterFactory.create())
        .build()
}
