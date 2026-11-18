package app.quiltt.connector

import android.net.Uri
import android.webkit.WebResourceRequest

/** Minimal [WebResourceRequest] double — Robolectric does not provide one. */
fun testWebResourceRequest(url: String): WebResourceRequest = object : WebResourceRequest {
    override fun getUrl(): Uri = Uri.parse(url)
    override fun isForMainFrame(): Boolean = true
    override fun isRedirect(): Boolean = false
    override fun hasGesture(): Boolean = false
    override fun getMethod(): String = "GET"
    override fun getRequestHeaders(): Map<String, String> = emptyMap()
}
