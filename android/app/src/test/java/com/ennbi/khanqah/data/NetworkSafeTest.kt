package com.ennbi.khanqah.data

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.currentTime
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.fail
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

@OptIn(ExperimentalCoroutinesApi::class)
class NetworkSafeTest {
    @Test fun successReturnsTheValue() = runTest { assertEquals(42, orNetworkError { 42 }) }

    @Test fun timeoutBecomesNull() = runTest {
        assertNull(orNetworkError { throw SocketTimeoutException("failed to connect after 10000ms") })
    }

    @Test fun noConnectionBecomesNull() = runTest {
        assertNull(orNetworkError { throw UnknownHostException("arrashid.ennbi.com") })
        assertNull(orNetworkError { throw IOException("Software caused connection abort") })
    }

    @Test fun httpErrorBecomesNull() = runTest {
        val err = HttpException(Response.error<Any>(503, "".toResponseBody()))
        assertNull(orNetworkError { throw err })
    }

    @Test fun realBugsStillCrash() = runTest {
        try { orNetworkError { error("a bug") }; fail("expected the bug to propagate") }
        catch (e: IllegalStateException) { assertEquals("a bug", e.message) }
    }

    @Test fun cancellationIsNeverSwallowed() = runTest {
        try { orNetworkError { throw CancellationException("cancelled") }; fail("expected cancellation to propagate") }
        catch (e: CancellationException) { assertEquals("cancelled", e.message) }
    }

    @Test fun retryReturnsAtOnceOnSuccess() = runTest {
        var calls = 0
        assertEquals(7, retryOnNetworkError { calls++; 7 })
        assertEquals(1, calls)
        assertEquals(0, currentTime)
    }

    @Test fun retryBacksOffUntilSuccess() = runTest {
        var calls = 0
        var failures = 0
        val result = retryOnNetworkError(initialDelayMs = 1_000, maxDelayMs = 3_000, onFailure = { failures++ }) {
            if (++calls < 5) throw SocketTimeoutException("timed out") else "ok"
        }
        assertEquals("ok", result)
        assertEquals(5, calls)
        assertEquals(4, failures)
        assertEquals("waits of 1s, 2s, then capped at 3s twice", 9_000, currentTime)
    }

    @Test fun retryDoesNotRetryRealBugs() = runTest {
        var calls = 0
        try { retryOnNetworkError<Int> { calls++; error("a bug") }; fail("expected the bug to propagate") }
        catch (e: IllegalStateException) { assertEquals(1, calls) }
    }

    @Test fun retryStopsWhenCancelled() = runTest {
        var calls = 0
        val job = launch { retryOnNetworkError<Int>(initialDelayMs = 1_000) { calls++; throw IOException("offline") } }
        advanceTimeBy(1_500)
        job.cancel()
        advanceTimeBy(60_000)
        assertEquals(2, calls)
    }
}
