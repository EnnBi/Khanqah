package com.ennbi.khanqah.data

import kotlinx.coroutines.CancellationException
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
}
