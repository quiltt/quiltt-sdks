package app.quiltt.connector

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class QuilttConnectorEventTest {
    @Test
    fun eventType_loadValue() {
        assertEquals("loaded", ConnectorSDKEventType.Load.value)
    }

    @Test
    fun eventType_exitSuccessValue() {
        assertEquals("exited.successful", ConnectorSDKEventType.ExitSuccess.value)
    }

    @Test
    fun eventType_exitAbortValue() {
        assertEquals("exited.aborted", ConnectorSDKEventType.ExitAbort.value)
    }

    @Test
    fun eventType_exitErrorValue() {
        assertEquals("exited.errored", ConnectorSDKEventType.ExitError.value)
    }

    @Test
    fun eventType_allValuesAreDistinct() {
        val values = ConnectorSDKEventType.entries.map { it.value }
        assertEquals(values.size, values.toSet().size)
    }

    @Test
    fun callbackMetadata_storesAllFields() {
        val metadata = ConnectorSDKCallbackMetadata(
            connectorId = "connector-1",
            profileId = "profile-1",
            connectionId = "conn-1",
        )
        assertEquals("connector-1", metadata.connectorId)
        assertEquals("profile-1", metadata.profileId)
        assertEquals("conn-1", metadata.connectionId)
    }

    @Test
    fun callbackMetadata_allowsNullOptionals() {
        val metadata = ConnectorSDKCallbackMetadata(
            connectorId = "connector-1",
            profileId = null,
            connectionId = null,
        )
        assertEquals("connector-1", metadata.connectorId)
        assertNull(metadata.profileId)
        assertNull(metadata.connectionId)
    }
}
