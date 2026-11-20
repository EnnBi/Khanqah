package com.ennbi.khanqah

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class LiveLinkTest {

    private val id = "3f2b8c1e-9a4d-4e6f-b1a2-0c9d8e7f6a5b"

    @Test fun `share link points at the broadcast on the website`() {
        assertEquals("https://arrashid.ennbi.com/live/$id", liveShareUrl(id))
    }

    @Test fun `share text names the broadcast and ends with its link`() {
        val text = liveShareText("Majlis-e-Zikr", id)
        assertTrue(text.contains("Majlis-e-Zikr"))
        assertTrue(text.endsWith(liveShareUrl(id)))
    }

    @Test fun `a shared link gives back the broadcast id`() {
        assertEquals(id, liveIdFromLink(liveShareUrl(id)))
    }

    @Test fun `link variations still resolve`() {
        assertEquals(id, liveIdFromLink("https://arrashid.ennbi.com/live/$id/"))
        assertEquals(id, liveIdFromLink("https://arrashid.ennbi.com/live/$id?utm_source=whatsapp"))
        assertEquals(id, liveIdFromLink("https://ARRASHID.ennbi.com/live/${id.uppercase()}"))
    }

    @Test fun `other pages and other sites are not broadcast links`() {
        assertNull(liveIdFromLink("https://arrashid.ennbi.com/live"))
        assertNull(liveIdFromLink("https://arrashid.ennbi.com/library/$id"))
        assertNull(liveIdFromLink("https://arrashid.ennbi.com/live/not-an-id"))
        assertNull(liveIdFromLink("https://example.com/live/$id"))
    }

    @Test fun `missing or malformed links are ignored`() {
        assertNull(liveIdFromLink(null))
        assertNull(liveIdFromLink(""))
        assertNull(liveIdFromLink("not a link at all"))
    }
}
