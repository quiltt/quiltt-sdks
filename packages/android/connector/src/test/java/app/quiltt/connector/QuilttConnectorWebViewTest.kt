package app.quiltt.connector

import android.content.Context
import android.net.Uri
import android.webkit.WebView
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class QuilttConnectorWebViewTest {

    @Test
    fun load_includesThemeModeWhenProvided() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)

        val config = QuilttConnectorConnectConfiguration(
            connectorId = "test-connector",
            appLauncherUrl = "https://example.com/callback",
            themeMode = "dark",
        )

        webView.load(
            token = "test-token",
            config = config,
        )

        val loadedUrl = shadowOf(webView).lastLoadedUrl
        assertTrue(loadedUrl.contains("theme_mode=dark"))
    }

    @Test
    fun load_doesNotIncludeThemeModeWhenNotProvided() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)

        val config = QuilttConnectorConnectConfiguration(
            connectorId = "test-connector",
            appLauncherUrl = "https://example.com/callback",
        )

        webView.load(
            token = "test-token",
            config = config,
        )

        val loadedUrl = shadowOf(webView).lastLoadedUrl
        assertTrue(loadedUrl.contains("test-connector.quiltt.app"))
        assertTrue(!loadedUrl.contains("theme_mode"))
    }

    @Test
    fun load_includesAgentAndModeHeaders() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)

        val config = QuilttConnectorConnectConfiguration(
            connectorId = "test-connector",
            appLauncherUrl = "https://example.com/callback",
        )

        webView.load(
            token = "test-token",
            config = config,
        )

        val loadedUrl = shadowOf(webView).lastLoadedUrl
        assertTrue(loadedUrl.startsWith("https://test-connector.quiltt.app"))
        assertTrue(loadedUrl.contains("mode=webview"))
        assertTrue(loadedUrl.contains("agent=android-"))
    }

    // MARK: - OAuth URL Handling

    @Test
    fun fireOAuthFailure_invokesCallbacks() {
        val context = RuntimeEnvironment.getApplication()
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "test-connector",
            appLauncherUrl = "https://example.com/callback",
        )

        var onEventCalled = false
        var onExitCalled = false
        var onExitErrorCalled = false

        val params = QuilttConnectorWebViewClientParams(
            context = context,
            webView = QuilttConnectorWebView(context),
            config = config,
            token = null,
            onEvent = { _, _ -> onEventCalled = true },
            onExit = { _, _ -> onExitCalled = true },
            onExitError = { onExitErrorCalled = true },
        )

        val client = QuilttConnectorWebViewClient(params)
        client.fireOAuthFailure()

        assertTrue("onEvent should be called on OAuth failure", onEventCalled)
        assertTrue("onExit should be called on OAuth failure", onExitCalled)
        assertTrue("onExitError should be called on OAuth failure", onExitErrorCalled)
    }

    @Test
    fun handleOAuthUrl_skipsNonHTTPS() {
        val context = RuntimeEnvironment.getApplication()
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "test-connector",
            appLauncherUrl = "https://example.com/callback",
        )

        var onExitErrorCalled = false
        val params = QuilttConnectorWebViewClientParams(
            context = context,
            webView = QuilttConnectorWebView(context),
            config = config,
            token = null,
            onExitError = { onExitErrorCalled = true },
        )

        val client = QuilttConnectorWebViewClient(params)
        client.handleOAuthUrl(Uri.parse("http://example.com/oauth"))

        // Non-HTTPS URLs are silently skipped, no callbacks fired
        assertFalse("onExitError should NOT be called for non-HTTPS URL", onExitErrorCalled)
    }

    @Test
    fun handleOAuthUrl_withHTTPS_noBrowserFiresFailure() {
        val context = RuntimeEnvironment.getApplication()
        // Robolectric is permissive about unresolved intents by default; opt in to
        // strict checking so startActivity throws like it does on a real device
        // when no browser can handle the intent.
        shadowOf(context).checkActivities(true)

        val config = QuilttConnectorConnectConfiguration(
            connectorId = "test-connector",
            appLauncherUrl = "https://example.com/callback",
        )

        var onExitErrorCalled = false
        val params = QuilttConnectorWebViewClientParams(
            context = context,
            webView = QuilttConnectorWebView(context),
            config = config,
            token = null,
            onExitError = { onExitErrorCalled = true },
        )

        val client = QuilttConnectorWebViewClient(params)
        // HTTPS URL with no browser available (Robolectric default) should fire failure
        client.handleOAuthUrl(Uri.parse("https://secure.plaid.com/hl/test"))

        assertTrue("onExitError should be called when no browser is available", onExitErrorCalled)
    }

    // MARK: - Navigation Interception

    private fun newClient(
        context: Context,
        webView: WebView = QuilttConnectorWebView(context),
        token: String? = "test-token",
        onEvent: ConnectorSDKOnEventCallback? = null,
        onExit: ConnectorSDKOnEventExitCallback? = null,
        onExitSuccess: ConnectorSDKOnExitSuccessCallback? = null,
        onExitAbort: ConnectorSDKOnExitAbortCallback? = null,
        onExitError: ConnectorSDKOnExitErrorCallback? = null,
    ): QuilttConnectorWebViewClient = QuilttConnectorWebViewClient(
        QuilttConnectorWebViewClientParams(
            context = context,
            webView = webView,
            config = QuilttConnectorConnectConfiguration(
                connectorId = "test-connector",
                appLauncherUrl = "https://example.com/callback",
            ),
            token = token,
            onEvent = onEvent,
            onExit = onExit,
            onExitSuccess = onExitSuccess,
            onExitAbort = onExitAbort,
            onExitError = onExitError,
        )
    )

    @Test
    fun shouldOverrideUrlLoading_loadEvent_injectsOptionsAndNotifies() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        var event: ConnectorSDKEventType? = null
        val client = newClient(context, webView, onEvent = { type, _ -> event = type })

        val intercepted = client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest("quilttconnector://Load"),
        )

        assertTrue("Quiltt events must be intercepted", intercepted)
        assertEquals(ConnectorSDKEventType.Load, event)

        val script = shadowOf(webView).lastEvaluatedJavascript
        assertTrue(script.contains("window.postMessage(compactedOptions)"))
        assertTrue(script.contains("token: 'test-token'"))
        assertTrue(script.contains("connectorId: 'test-connector'"))
    }

    @Test
    fun shouldOverrideUrlLoading_loadEvent_withoutTokenInjectsNullLiteral() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        val client = newClient(context, webView, token = null)

        client.shouldOverrideUrlLoading(webView, testWebResourceRequest("quilttconnector://Load"))

        assertTrue(shadowOf(webView).lastEvaluatedJavascript.contains("token: 'null'"))
    }

    @Test
    fun shouldOverrideUrlLoading_exitSuccess_clearsStorageAndFiresCallbacks() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        val fired = mutableListOf<String>()
        var metadata: ConnectorSDKCallbackMetadata? = null
        val client = newClient(
            context,
            webView,
            onEvent = { _, _ -> fired.add("onEvent") },
            onExit = { _, _ -> fired.add("onExit") },
            onExitSuccess = { fired.add("onExitSuccess"); metadata = it },
        )

        val intercepted = client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest(
                "quilttconnector://ExitSuccess?profileId=profile-1&connectionId=conn-1"
            ),
        )

        assertTrue(intercepted)
        assertEquals(listOf("onEvent", "onExit", "onExitSuccess"), fired)
        assertEquals("localStorage.clear();", shadowOf(webView).lastEvaluatedJavascript)
        assertEquals("test-connector", metadata?.connectorId)
        assertEquals("profile-1", metadata?.profileId)
        assertEquals("conn-1", metadata?.connectionId)
    }

    @Test
    fun shouldOverrideUrlLoading_exitAbort_firesAbortCallback() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        var abortMetadata: ConnectorSDKCallbackMetadata? = null
        val client = newClient(context, webView, onExitAbort = { abortMetadata = it })

        val intercepted = client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest("quilttconnector://ExitAbort"),
        )

        assertTrue(intercepted)
        assertEquals("test-connector", abortMetadata?.connectorId)
        assertEquals("localStorage.clear();", shadowOf(webView).lastEvaluatedJavascript)
    }

    @Test
    fun shouldOverrideUrlLoading_exitError_firesErrorCallback() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        var errorMetadata: ConnectorSDKCallbackMetadata? = null
        val client = newClient(context, webView, onExitError = { errorMetadata = it })

        val intercepted = client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest("quilttconnector://ExitError"),
        )

        assertTrue(intercepted)
        assertEquals("test-connector", errorMetadata?.connectorId)
    }

    @Test
    fun shouldOverrideUrlLoading_navigateEvent_opensDecodedUrlInBrowser() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        val client = newClient(context, webView)

        val intercepted = client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest(
                "quilttconnector://Navigate" +
                    "?url=https%253A%252F%252Fsecure.plaid.com%252Fhl%252Ftest"
            ),
        )

        assertTrue(intercepted)
        val started = shadowOf(context).nextStartedActivity
        assertEquals("https://secure.plaid.com/hl/test", started?.dataString)
    }

    @Test
    fun shouldOverrideUrlLoading_navigateEvent_missingUrl_doesNotOpenBrowser() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        val client = newClient(context, webView)

        client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest("quilttconnector://Navigate"),
        )

        assertNull("Nothing should be opened without a url parameter", shadowOf(context).nextStartedActivity)
    }

    @Test
    fun shouldOverrideUrlLoading_navigateEvent_unresolvableUrl_doesNotOpenBrowser() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        val client = newClient(context, webView)

        client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest("quilttconnector://Navigate?url=not-a-url"),
        )

        assertNull(shadowOf(context).nextStartedActivity)
    }

    @Test
    fun shouldOverrideUrlLoading_unknownQuilttEvent_isInterceptedAndIgnored() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        var called = false
        val client = newClient(
            context,
            webView,
            onEvent = { _, _ -> called = true },
            onExit = { _, _ -> called = true },
        )

        val intercepted = client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest("quilttconnector://SomethingElse"),
        )

        assertTrue(intercepted)
        assertFalse("Unknown events must not fire callbacks", called)
    }

    @Test
    fun shouldOverrideUrlLoading_authenticateEvent_firesNoCallbacks() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        var called = false
        val client = newClient(
            context,
            webView,
            onEvent = { _, _ -> called = true },
            onExit = { _, _ -> called = true },
        )

        val intercepted = client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest("quilttconnector://Authenticate?profileId=profile-1"),
        )

        assertTrue(intercepted)
        assertFalse("Authenticate is a no-op on mobile", called)
    }

    @Test
    fun shouldOverrideUrlLoading_regularHttpsUrl_isRenderedInTheWebView() {
        val context = RuntimeEnvironment.getApplication()
        val webView = QuilttConnectorWebView(context)
        val client = newClient(context, webView)

        val intercepted = client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest("https://test-connector.quiltt.app/index.html"),
        )

        assertFalse("Regular navigations must stay in the WebView", intercepted)
    }
}
