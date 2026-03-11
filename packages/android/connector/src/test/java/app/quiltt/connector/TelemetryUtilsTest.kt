package app.quiltt.connector

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class TelemetryUtilsTest {
    @Test
    fun getSDKAgent_formatsLikeJsPackages() {
        val sdkAgent = TelemetryUtils.getSDKAgent("5.2.0", "Android")
        assertEquals("Quiltt/5.2.0 (Android)", sdkAgent)
    }

    @Test
    fun getRuntimePlatformInfo_containsExpectedParts() {
        val platformInfo = TelemetryUtils.getRuntimePlatformInfo()

        assertTrue(platformInfo.startsWith("Android; OS "))
        assertTrue(platformInfo.contains("(API "))
        assertTrue(platformInfo.contains("; Device "))
    }
}
