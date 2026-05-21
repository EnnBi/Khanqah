package com.khanqah.app.data.repository

import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.model.Progress
import com.khanqah.app.data.model.UpsertProgressRequest

class ProgressRepository(private val api: ApiService) {
    private val cache = mutableMapOf<String, Progress>()

    fun getLocal(contentId: String): Progress? = cache[contentId]

    suspend fun loadAll(): Map<String, Progress> {
        return try {
            val list = api.getProgress()
            list.forEach { cache[it.contentId] = it }
            cache.toMap()
        } catch (e: Exception) {
            cache.toMap()
        }
    }

    suspend fun save(contentId: String, positionSeconds: Int, completed: Boolean) {
        try {
            val result = api.upsertProgress(contentId, UpsertProgressRequest(positionSeconds, completed))
            cache[contentId] = result
        } catch (e: Exception) {
            // silent — never interrupt playback
        }
    }
}
