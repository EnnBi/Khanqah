package com.khanqah.app.data.repository

import com.khanqah.app.data.api.ApiService
import com.khanqah.app.data.model.Progress
import com.khanqah.app.data.model.UpsertProgressRequest
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProgressRepositoryTest {

    private val api = mockk<ApiService>()
    private val repo = ProgressRepository(api)

    @Test
    fun `getLocal returns null before loadAll`() {
        assertNull(repo.getLocal("abc"))
    }

    @Test
    fun `loadAll populates local cache`() = runTest {
        val progress = Progress(contentId = "abc", positionSeconds = 120, completed = false)
        coEvery { api.getProgress() } returns listOf(progress)

        repo.loadAll()

        assertEquals(120, repo.getLocal("abc")?.positionSeconds)
    }

    @Test
    fun `save calls api and updates cache`() = runTest {
        val updated = Progress(contentId = "xyz", positionSeconds = 60, completed = false)
        coEvery {
            api.upsertProgress("xyz", UpsertProgressRequest(60, false))
        } returns updated

        repo.save("xyz", 60, false)

        coVerify { api.upsertProgress("xyz", UpsertProgressRequest(60, false)) }
        assertEquals(60, repo.getLocal("xyz")?.positionSeconds)
    }

    @Test
    fun `save is silent on api failure`() = runTest {
        coEvery {
            api.upsertProgress(any(), any())
        } throws RuntimeException("Network error")

        // Should not throw
        repo.save("xyz", 60, false)
    }
}
