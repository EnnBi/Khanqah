package com.ennbi.khanqah.data

import kotlinx.coroutines.delay
import retrofit2.HttpException
import java.io.IOException

/**
 * Runs [block] and returns null on an expected network failure: no connection, a timeout
 * (SocketTimeoutException is an IOException) or an HTTP error status. Anything else, including
 * coroutine cancellation and real bugs, still propagates, so those keep showing up in Crashlytics.
 *
 * Use it around network calls launched in viewModelScope / app scopes: an exception that escapes
 * a launch there kills the whole app.
 */
suspend inline fun <T> orNetworkError(block: () -> T): T? =
    try { block() } catch (_: IOException) { null } catch (_: HttpException) { null }

/**
 * Repeats [block] until it succeeds, so a load that fails on a weak connection heals itself
 * instead of staying empty until the app is restarted. Waits between expected network failures
 * (see [orNetworkError]) with a doubling delay capped at [maxDelayMs]; [onFailure] runs after
 * each failed attempt. Real bugs and cancellation propagate.
 */
suspend fun <T : Any> retryOnNetworkError(
    initialDelayMs: Long = 2_000,
    maxDelayMs: Long = 30_000,
    onFailure: () -> Unit = {},
    block: suspend () -> T,
): T {
    var wait = initialDelayMs
    while (true) {
        orNetworkError { block() }?.let { return it }
        onFailure()
        delay(wait)
        wait = (wait * 2).coerceAtMost(maxDelayMs)
    }
}
