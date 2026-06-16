package com.khanqah.app.qa

import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Tolerant smoke test: translation needs a one-time ~30 MB model download (network) and
 * an Urdu TTS voice may be absent on the test device, so this asserts only that the
 * pipeline runs and returns non-blank text. Missing audio / offline => acceptable.
 */
@RunWith(AndroidJUnit4::class)
class UrduPipelineTest {
    private val ctx = InstrumentationRegistry.getInstrumentation().targetContext

    @Test
    fun prepare_returnsUrduText_audioOptional(): Unit = runBlocking {
        val pipeline = UrduPipeline(ctx)
        val prepared = pipeline.prepare("You may shorten prayer while travelling")
        assertTrue("urduText must be non-blank", prepared.urduText.isNotBlank())
        Log.i("UrduPipelineTest", "urdu='${prepared.urduText}' audio=${prepared.audioBytes?.size ?: "none"}")
    }
}
