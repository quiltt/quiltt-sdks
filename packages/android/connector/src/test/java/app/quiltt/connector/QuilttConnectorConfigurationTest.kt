package app.quiltt.connector

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class QuilttConnectorConfigurationTest {
    // ConnectConfiguration

    @Test
    fun connectConfiguration_requiredFields() {
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "my-connector",
            appLauncherUrl = "https://example.com/callback",
        )
        assertEquals("my-connector", config.connectorId)
        assertEquals("https://example.com/callback", config.appLauncherUrl)
        assertNull(config.connectionId)
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
    fun connectConfiguration_themeModeDefaultsToNull() {
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "my-connector",
            appLauncherUrl = "https://example.com/callback",
        )
        assertNull(config.themeMode)
    }

    @Test
    fun connectConfiguration_withThemeMode() {
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "my-connector",
            appLauncherUrl = "https://example.com/callback",
            themeMode = "dark",
        )
        assertEquals("dark", config.themeMode)
    }

    // ReconnectConfiguration

    @Test
    fun reconnectConfiguration_requiredFields() {
        val config = QuilttConnectorReconnectConfiguration(
            connectorId = "my-connector",
            appLauncherUrl = "https://example.com/callback",
            connectionId = "conn-abc123",
        )
        assertEquals("my-connector", config.connectorId)
        assertEquals("https://example.com/callback", config.appLauncherUrl)
        assertEquals("conn-abc123", config.connectionId)
        assertNull(config.institution)
    }

    @Test
    fun reconnectConfiguration_institutionIsAlwaysNull() {
        val config = QuilttConnectorReconnectConfiguration(
            connectorId = "c",
            appLauncherUrl = "https://example.com",
            connectionId = "conn-1",
        )
        assertNull(config.institution)
    }

    @Test
    fun reconnectConfiguration_themeModeDefaultsToNull() {
        val config = QuilttConnectorReconnectConfiguration(
            connectorId = "c",
            appLauncherUrl = "https://example.com",
            connectionId = "conn-1",
        )
        assertNull(config.themeMode)
    }

    @Test
    fun reconnectConfiguration_withThemeMode() {
        val config = QuilttConnectorReconnectConfiguration(
            connectorId = "c",
            appLauncherUrl = "https://example.com",
            connectionId = "conn-1",
            themeMode = "auto",
        )
        assertEquals("auto", config.themeMode)
    }

    // QuilttConnectorConfiguration

    @Test
    fun configurationInterface_themeModeDefaultsToNull() {
        val config = object : QuilttConnectorConfiguration {
            override val connectorId = "c"
            override val appLauncherUrl = "https://example.com"
            override val connectionId: String? = null
            override val institution: String? = null
        }
        assertNull(config.themeMode)
    }
}
