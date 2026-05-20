package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class BugRepository(private val api: AdminApiService) {
    suspend fun list() = api.listBugs()
}
