package app.quiltt.connector

import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class QuilttConnectorTest {

    private val connectConfig = QuilttConnectorConnectConfiguration(
        connectorId = "test-connector",
        appLauncherUrl = "https://example.com/callback",
    )

    private val reconnectConfig = QuilttConnectorReconnectConfiguration(
        connectorId = "test-connector",
        appLauncherUrl = "https://example.com/callback",
        connectionId = "conn-abc123",
    )

    @Test
    fun connect_loadsTheConnectorUrl() {
        val connector = QuilttConnector(RuntimeEnvironment.getApplication())
        connector.authenticate("test-token")

        val webView = connector.connect(connectConfig)

        val loadedUrl = shadowOf(webView).lastLoadedUrl
        assertTrue(loadedUrl.startsWith("https://test-connector.quiltt.app"))
        assertTrue(loadedUrl.contains("mode=webview"))
    }

    @Test
    fun connect_returnsTheSameWebViewOnEveryCall() {
        val connector = QuilttConnector(RuntimeEnvironment.getApplication())

        val first = connector.connect(connectConfig)
        val second = connector.reconnect(reconnectConfig)

        assertSame(first, second)
    }

    @Test
    fun reconnect_loadsTheConnectorUrl() {
        val connector = QuilttConnector(RuntimeEnvironment.getApplication())
        connector.authenticate("test-token")

        val webView = connector.reconnect(reconnectConfig)

        assertTrue(
            shadowOf(webView).lastLoadedUrl.startsWith("https://test-connector.quiltt.app")
        )
    }

    @Test
    fun connect_forwardsCallbacksToTheWebViewClient() {
        val context = RuntimeEnvironment.getApplication()
        val connector = QuilttConnector(context)
        connector.authenticate("test-token")

        var exitedWith: ConnectorSDKEventType? = null
        var profileId: String? = null

        val webView = connector.connect(
            config = connectConfig,
            onEvent = { event, _ -> exitedWith = event },
            onExitSuccess = { metadata -> profileId = metadata.profileId },
        )

        val client = shadowOf(webView).webViewClient
        client.shouldOverrideUrlLoading(
            webView,
            testWebResourceRequest("quilttconnector://ExitSuccess?profileId=profile-1"),
        )

        assertEquals(ConnectorSDKEventType.ExitSuccess, exitedWith)
        assertEquals("profile-1", profileId)
    }
}
