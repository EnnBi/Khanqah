package com.khanqah.admin.data.repository

import com.khanqah.admin.data.api.AdminApiService

class TeamRepository(private val api: AdminApiService) {
    suspend fun list() = api.listTeam()
    suspend fun updateRole(id: String, role: String) = api.updateRole(id, mapOf("role" to role))
    suspend fun updateName(id: String, name: String) = api.updateUserName(id, mapOf("display_name" to name))
    suspend fun deleteUser(id: String) = api.deleteUser(id)
}
