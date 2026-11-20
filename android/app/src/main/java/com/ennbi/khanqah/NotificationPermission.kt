package com.ennbi.khanqah

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/** Android 13+ blocks every notification, pushes included, until the user grants POST_NOTIFICATIONS. */
fun needsNotificationPermission(sdkInt: Int, granted: Boolean): Boolean =
    sdkInt >= Build.VERSION_CODES.TIRAMISU && !granted

/** On launch, ask once only, and only while notifications are switched on in the app. */
fun shouldAskOnLaunch(sdkInt: Int, granted: Boolean, enabledInApp: Boolean, alreadyAsked: Boolean): Boolean =
    needsNotificationPermission(sdkInt, granted) && enabledInApp && !alreadyAsked

fun Context.needsNotificationPermission(): Boolean = needsNotificationPermission(
    Build.VERSION.SDK_INT,
    ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED,
)
