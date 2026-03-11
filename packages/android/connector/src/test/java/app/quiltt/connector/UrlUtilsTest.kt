package app.quiltt.connector

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class UrlUtilsTest {
    // isEncoded

    @Test
    fun isEncoded_withPercent20() {
        assertTrue(UrlUtils.isEncoded("hello%20world"))
    }

    @Test
    fun isEncoded_withPercent3A() {
        assertTrue(UrlUtils.isEncoded("https%3A%2F%2Fexample.com"))
    }

    @Test
    fun isEncoded_withLowercaseHex() {
        assertTrue(UrlUtils.isEncoded("hello%2fworld"))
    }

    @Test
    fun isEncoded_withPlainStringWithSpaces() {
        assertFalse(UrlUtils.isEncoded("hello world"))
    }

    @Test
    fun isEncoded_withPlainUrl() {
        assertFalse(UrlUtils.isEncoded("https://example.com"))
    }

    @Test
    fun isEncoded_withEmptyString() {
        assertFalse(UrlUtils.isEncoded(""))
    }

    @Test
    fun isEncoded_withDoubleEncoded_returnsFalse() {
        // Double-encoded strings are not considered properly encoded
        assertFalse(UrlUtils.isEncoded("https%253A%252F%252Fexample.com"))
    }

    // smartEncodeURIComponent

    @Test
    fun smartEncodeURIComponent_emptyString() {
        assertEquals("", UrlUtils.smartEncodeURIComponent(""))
    }

    @Test
    fun smartEncodeURIComponent_alreadyEncoded_returnsAsIs() {
        val encoded = "https%3A%2F%2Fexample.com%2Fcallback"
        assertEquals(encoded, UrlUtils.smartEncodeURIComponent(encoded))
    }

    @Test
    fun smartEncodeURIComponent_plainUrl_getsEncoded() {
        val plain = "https://example.com/callback?foo=bar"
        val result = UrlUtils.smartEncodeURIComponent(plain)
        assertNotEquals(plain, result)
    }

    @Test
    fun smartEncodeURIComponent_plainUrlWithSpaces_encodesSpaces() {
        val plain = "https://example.com/path?q=hello world"
        val result = UrlUtils.smartEncodeURIComponent(plain)
        assertFalse(result.contains(" "))
    }

    // normalizeUrlEncoding

    @Test
    fun normalizeUrlEncoding_withPlainUrl_returnsUnchanged() {
        val url = "https://example.com"
        assertEquals(url, UrlUtils.normalizeUrlEncoding(url))
    }

    @Test
    fun normalizeUrlEncoding_withSingleEncoded_returnsUnchanged() {
        val url = "https%3A%2F%2Fexample.com"
        assertEquals(url, UrlUtils.normalizeUrlEncoding(url))
    }

    @Test
    fun normalizeUrlEncoding_withDoubleEncoded_decodesOnce() {
        val doubleEncoded = "https%253A%252F%252Fexample.com"
        val result = UrlUtils.normalizeUrlEncoding(doubleEncoded)
        assertEquals("https%3A%2F%2Fexample.com", result)
    }

    @Test
    fun normalizeUrlEncoding_withEmptyString_returnsEmpty() {
        assertEquals("", UrlUtils.normalizeUrlEncoding(""))
    }
}
