package com.ennbi.khanqah

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationPermissionTest {

    @Test fun `android 13 and up needs the permission until it is granted`() {
        assertTrue(needsNotificationPermission(sdkInt = 33, granted = false))
        assertTrue(needsNotificationPermission(sdkInt = 36, granted = false))
        assertFalse(needsNotificationPermission(sdkInt = 33, granted = true))
    }

    @Test fun `android 12 and below never needs it`() {
        assertFalse(needsNotificationPermission(sdkInt = 32, granted = false))
        assertFalse(needsNotificationPermission(sdkInt = 26, granted = false))
    }

    @Test fun `asks on first launch when notifications are on in the app`() {
        assertTrue(shouldAskOnLaunch(sdkInt = 34, granted = false, enabledInApp = true, alreadyAsked = false))
    }

    @Test fun `does not ask a second time on launch`() {
        assertFalse(shouldAskOnLaunch(sdkInt = 34, granted = false, enabledInApp = true, alreadyAsked = true))
    }

    @Test fun `does not ask when the user turned notifications off in the app`() {
        assertFalse(shouldAskOnLaunch(sdkInt = 34, granted = false, enabledInApp = false, alreadyAsked = false))
    }

    @Test fun `does not ask when already granted or not needed`() {
        assertFalse(shouldAskOnLaunch(sdkInt = 34, granted = true, enabledInApp = true, alreadyAsked = false))
        assertFalse(shouldAskOnLaunch(sdkInt = 31, granted = false, enabledInApp = true, alreadyAsked = false))
    }
}
