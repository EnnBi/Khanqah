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

    private val refreshLock = Any()

    private val tokenAuthenticator = object : Authenticator {
        override fun authenticate(route: Route?, response: Response): Request? {
            if (response.code != 401) return null

            // The backend ROTATES refresh tokens (the old one is deleted on every refresh).
            // Serialize refreshes so concurrent 401s don't each spend the same refresh token —
            // that race makes the first refresh win and the rest 401. Threads that arrive after
            // a refresh just reuse the freshly-stored access token instead of refreshing again.
            val sentToken = response.request.header("Authorization")?.removePrefix("Bearer ")
            synchronized(refreshLock) {
                val current = runBlocking { tokenManager.getAccessToken() }
                if (current != null && current != sentToken) {
                    return response.request.newBuilder().header("Authorization", "Bearer $current").build()
                }
                val refreshToken = runBlocking { tokenManager.getRefreshToken() } ?: return null
                return try {
                    val newTokens = runBlocking {
                        buildRetrofit(null).create(ApiService::class.java)
                            .refreshToken(mapOf("refresh_token" to refreshToken))
                    }
                    val newAccess = newTokens["access_token"] ?: return null
                    val newRefresh = newTokens["refresh_token"]
                    runBlocking {
                        if (newRefresh != null) tokenManager.saveRefreshedTokens(newAccess, newRefresh)
                        else tokenManager.saveAccessToken(newAccess)
                    }
                    response.request.newBuilder().header("Authorization", "Bearer $newAccess").build()
                } catch (e: Exception) {
                    null
                }
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
