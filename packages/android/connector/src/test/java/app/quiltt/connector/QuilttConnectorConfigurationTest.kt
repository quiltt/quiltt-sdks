package app.quiltt.connector

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class QuilttConnectorConfigurationTest {
    @Test
    fun connectConfiguration_hasExpectedConnectorIdAndAppLauncherUrl() {
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "my-connector",
            appLauncherUrl = "https://example.com/callback",
        )
        assertEquals("my-connector", config.connectorId)
        assertEquals("https://example.com/callback", config.appLauncherUrl)
    }

    @Test
    fun connectConfiguration_connectionIdIsAlwaysNull() {
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "my-connector",
            appLauncherUrl = "https://example.com/callback",
        )
        assertNull(config.connectionId)
    }

    @Test
    fun connectConfiguration_institutionDefaultsToNull() {
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "my-connector",
            appLauncherUrl = "https://example.com/callback",
        )
        assertNull(config.institution)
    }

    @Test
    fun connectConfiguration_withInstitution() {
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "my-connector",
            appLauncherUrl = "https://example.com/callback",
            institution = "mx_bank_1",
        )
        assertEquals("mx_bank_1", config.institution)
        assertNull(config.connectionId)
    }

    @Test
    fun reconnectConfiguration_hasExpectedFields() {
        val config = QuilttConnectorReconnectConfiguration(
            connectorId = "my-connector",
            appLauncherUrl = "https://example.com/callback",
            connectionId = "conn-abc123",
        )
        assertEquals("my-connector", config.connectorId)
        assertEquals("https://example.com/callback", config.appLauncherUrl)
        assertEquals("conn-abc123", config.connectionId)
    }

    @Test
    fun reconnectConfiguration_institutionIsAlwaysNull() {
        val config = QuilttConnectorReconnectConfiguration(
            connectorId = "my-connector",
            appLauncherUrl = "https://example.com/callback",
            connectionId = "conn-1",
        )
        assertNull(config.institution)
    }
}
