package app.quiltt.connector

import android.os.Build

object TelemetryUtils {
    fun getSDKAgent(sdkVersion: String, platformInfo: String): String {
        return "Quiltt/$sdkVersion ($platformInfo)"
    }

    fun getRuntimePlatformInfo(): String {
        val release = Build.VERSION.RELEASE ?: "Unknown"
        val apiLevel = Build.VERSION.SDK_INT
        val manufacturer = Build.MANUFACTURER ?: "Unknown"
        val model = Build.MODEL ?: "Unknown"

        return "Android; OS $release (API $apiLevel); Device $manufacturer $model"
    }
}
