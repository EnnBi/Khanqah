package com.ennbi.khanqah.data.repository

import com.ennbi.khanqah.data.api.ApiService
import com.ennbi.khanqah.data.model.Progress
import com.ennbi.khanqah.data.model.UpsertProgressRequest

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
