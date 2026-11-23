import WebKit
import XCTest

@testable import QuilttConnector

final class QuilttConnectorTests: XCTestCase {
    private let connectConfig = QuilttConnectorConnectConfiguration(
        connectorId: "test-connector",
        appLauncherUrl: "https://example.com/callback"
    )

    private let reconnectConfig = QuilttConnectorReconnectConfiguration(
        connectorId: "test-connector",
        appLauncherUrl: "https://example.com/callback",
        connectionId: "conn-abc123"
    )

    @MainActor
    func testAuthenticate_doesNotThrow() {
        let connector = QuilttConnector()
        XCTAssertNoThrow(connector.authenticate(token: "test-session-token"))
    }

    @MainActor
    func testConnect_returnsAConfiguredWebView() {
        let connector = QuilttConnector()
        connector.authenticate(token: "test-session-token")

        let webView = connector.connect(config: connectConfig)

        XCTAssertNotNil(webView.navigationDelegate)
    }

    @MainActor
    func testReconnect_returnsAConfiguredWebView() {
        let connector = QuilttConnector()
        connector.authenticate(token: "test-session-token")

        let webView = connector.reconnect(config: reconnectConfig)

        XCTAssertNotNil(webView.navigationDelegate)
    }

    @MainActor
    func testConnect_reusesTheSameWebView() {
        let connector = QuilttConnector()

        let connected = connector.connect(config: connectConfig)
        let reconnected = connector.reconnect(config: reconnectConfig)

        XCTAssertTrue(connected === reconnected)
    }
}
