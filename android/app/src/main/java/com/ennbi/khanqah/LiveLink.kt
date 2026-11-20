package com.ennbi.khanqah

import java.net.URI

// Shared broadcast links: https://arrashid.ennbi.com/live/<session id>. The website plays the
// broadcast in the browser (there is no iOS app); on Android the same link opens this app.
// The host and path are also declared in AndroidManifest.xml.
private const val LIVE_LINK_HOST = "arrashid.ennbi.com"
private val LIVE_LINK_PATH = Regex("/live/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/?")

fun liveShareUrl(sessionId: String): String = "https://$LIVE_LINK_HOST/live/$sessionId"

/** What goes into the share sheet: a line people can read, then the link. */
fun liveShareText(title: String, sessionId: String): String = "Live now: $title\n${liveShareUrl(sessionId)}"

/** The broadcast id in a shared link, or null if [link] is anything else. */
fun liveIdFromLink(link: String?): String? {
    val uri = try { URI(link ?: return null) } catch (_: Exception) { return null }
    if (!uri.host.equals(LIVE_LINK_HOST, ignoreCase = true)) return null
    val path = uri.path?.lowercase() ?: return null
    return LIVE_LINK_PATH.matchEntire(path)?.groupValues?.get(1)
}
