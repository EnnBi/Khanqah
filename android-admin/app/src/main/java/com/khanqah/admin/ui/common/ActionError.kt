package com.khanqah.admin.ui.common

import retrofit2.HttpException

/** User-facing text for a failed admin action, e.g. `e.toActionError("delete content")`. */
fun Throwable.toActionError(action: String): String = when {
    this is HttpException && code() == 403 -> "You don't have permission to $action."
    else -> "Couldn't $action. Check your connection and try again."
}
