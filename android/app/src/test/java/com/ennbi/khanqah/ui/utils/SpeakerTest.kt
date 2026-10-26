package com.ennbi.khanqah.ui.utils

import org.junit.Assert.assertEquals
import org.junit.Test

class SpeakerTest {
    @Test fun englishUsesGivenName() =
        assertEquals("Maulana Ahmad", speakerLabel("Maulana Ahmad", "مولانا احمد", isUrdu = false))

    @Test fun urduUsesGivenName() =
        assertEquals("مولانا احمد", speakerLabel("Maulana Ahmad", "مولانا احمد", isUrdu = true))

    @Test fun missingFieldsFallBackToDefault() {
        assertEquals(DEFAULT_SPEAKER_EN, speakerLabel(null, null, isUrdu = false))
        assertEquals(DEFAULT_SPEAKER_UR, speakerLabel(null, null, isUrdu = true))
    }

    @Test fun blankFieldsFallBackToDefault() {
        assertEquals(DEFAULT_SPEAKER_EN, speakerLabel("  ", "", isUrdu = false))
        assertEquals(DEFAULT_SPEAKER_UR, speakerLabel("  ", "", isUrdu = true))
    }

    @Test fun givenNamesAreTrimmed() =
        assertEquals("Maulana Ahmad", speakerLabel("  Maulana Ahmad ", null, isUrdu = false))
}
