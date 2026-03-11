package app.quiltt.connector

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QuilttSdkVersionTest {
    @Test
    fun sdkVersion_isNotEmpty() {
        assertTrue(quilttSdkVersion.isNotEmpty())
    }

    @Test
    fun sdkVersion_matchesSemanticVersioning() {
        val semverPattern = Regex("""^\d+\.\d+\.\d+$""")
        assertTrue(
            "SDK version '$quilttSdkVersion' should follow semver X.Y.Z format",
            semverPattern.matches(quilttSdkVersion),
        )
    }

    @Test
    fun sdkVersion_doesNotContainSpaces() {
        assertFalse(quilttSdkVersion.contains(" "))
    }
}
