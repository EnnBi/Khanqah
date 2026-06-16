package com.khanqah.shaykh.ui.util

fun Int.toUrduDigits(): String {
    val map = charArrayOf('۰','۱','۲','۳','۴','۵','۶','۷','۸','۹')
    return this.toString().map { if (it in '0'..'9') map[it - '0'] else it }.joinToString("")
}
