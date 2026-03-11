import XCTest

@testable import QuilttConnector

final class QuilttConnectorConfigurationTests: XCTestCase {
    func testConnectConfiguration_requiredFields() {
        let config = QuilttConnectorConnectConfiguration(
            connectorId: "my-connector",
            appLauncherUrl: "https://example.com/callback"
        )
        XCTAssertEqual(config.connectorId, "my-connector")
        XCTAssertEqual(config.appLauncherUrl, "https://example.com/callback")
        XCTAssertNil(config.connectionId)
        XCTAssertNil(config.institution)
    }

    func testConnectConfiguration_withInstitution() {
        let config = QuilttConnectorConnectConfiguration(
            connectorId: "my-connector",
            appLauncherUrl: "https://example.com/callback",
            institution: "mx_bank_1"
        )
        XCTAssertEqual(config.institution, "mx_bank_1")
        XCTAssertNil(config.connectionId)
    }

    func testConnectConfiguration_connectionIdIsAlwaysNil() {
        let config = QuilttConnectorConnectConfiguration(
            connectorId: "c",
            appLauncherUrl: "https://example.com"
        )
        XCTAssertNil(config.connectionId)
    }

    func testReconnectConfiguration_requiredFields() {
        let config = QuilttConnectorReconnectConfiguration(
            connectorId: "my-connector",
            appLauncherUrl: "https://example.com/callback",
            connectionId: "conn-abc123"
        )
        XCTAssertEqual(config.connectorId, "my-connector")
        XCTAssertEqual(config.appLauncherUrl, "https://example.com/callback")
        XCTAssertEqual(config.connectionId, "conn-abc123")
        XCTAssertNil(config.institution)
    }

    func testReconnectConfiguration_institutionIsAlwaysNil() {
        let config = QuilttConnectorReconnectConfiguration(
            connectorId: "c",
            appLauncherUrl: "https://example.com",
            connectionId: "conn-1"
        )
        XCTAssertNil(config.institution)
    }
}
