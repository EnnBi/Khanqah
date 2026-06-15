package com.khanqah.app.crypto

import com.goterl.lazysodium.LazySodiumAndroid
import com.goterl.lazysodium.SodiumAndroid

/** Single process-wide libsodium instance. Thread-safe; libsodium is stateless per call. */
object Sodium {
    val lazy: LazySodiumAndroid by lazy { LazySodiumAndroid(SodiumAndroid()) }
}
