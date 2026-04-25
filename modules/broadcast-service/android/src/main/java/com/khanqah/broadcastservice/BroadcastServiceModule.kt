package com.khanqah.broadcastservice

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BroadcastServiceModule : Module() {
  private var audioManager: AudioManager? = null
  private var focusRequest: AudioFocusRequest? = null

  private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
    when (change) {
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK ->
        sendEvent("interruption", mapOf("state" to "began"))
      AudioManager.AUDIOFOCUS_GAIN ->
        sendEvent("interruption", mapOf("state" to "ended"))
      // AUDIOFOCUS_LOSS (permanent) is intentionally not emitted.
      // Admin manually taps Stop in this rare case; auto-stopping
      // would race with the WebSocket close path in broadcast.ts.
      else -> { /* ignore */ }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("BroadcastService")
    Events("interruption")

    AsyncFunction("startSession") {
      val ctx: Context = appContext.reactContext ?: return@AsyncFunction null
      audioManager = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val attrs = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()
        val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
          .setAudioAttributes(attrs)
          .setAcceptsDelayedFocusGain(false)
          .setOnAudioFocusChangeListener(focusListener)
          .build()
        focusRequest = req
        audioManager?.requestAudioFocus(req)
      } else {
        @Suppress("DEPRECATION")
        audioManager?.requestAudioFocus(
          focusListener,
          AudioManager.STREAM_VOICE_CALL,
          AudioManager.AUDIOFOCUS_GAIN,
        )
      }

      val intent = Intent(ctx, BroadcastForegroundService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
    }

    AsyncFunction("stopSession") {
      val ctx: Context = appContext.reactContext ?: return@AsyncFunction null
      ctx.stopService(Intent(ctx, BroadcastForegroundService::class.java))
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        focusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
      } else {
        @Suppress("DEPRECATION")
        audioManager?.abandonAudioFocus(focusListener)
      }
      focusRequest = null
      audioManager = null
    }
  }
}
