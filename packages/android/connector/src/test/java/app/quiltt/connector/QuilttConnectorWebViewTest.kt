package app.quiltt.connector

import android.net.Uri
import org.junit.Assert.assertFalse
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
}
