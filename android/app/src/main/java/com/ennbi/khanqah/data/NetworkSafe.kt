package com.ennbi.khanqah.data

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
