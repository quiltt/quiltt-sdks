import WebKit
import XCTest

@testable import QuilttConnector

final class QuilttConnectorWebViewNavigationTests: XCTestCase {
    // MARK: - Navigation interception

    private let config = QuilttConnectorConnectConfiguration(
        connectorId: "test-connector",
        appLauncherUrl: "https://example.com/callback"
    )

    @MainActor
    private func decidedPolicy(
        for webView: QuilttConnectorWebview,
        url: String
    ) -> WKNavigationActionPolicy? {
        let action = StubNavigationAction(request: URLRequest(url: URL(string: url)!))
        var policy: WKNavigationActionPolicy?
        webView.webView(webView, decidePolicyFor: action) { policy = $0 }
        return policy
    }

    @MainActor
    func testDecidePolicy_loadEvent_cancelsAndNotifies() {
        let webView = QuilttConnectorWebview()
        var received: ConnectorSDKEventType?
        webView.load(config: config, onEvent: { type, _ in received = type })

        let policy = decidedPolicy(for: webView, url: "quilttconnector://Load")

        XCTAssertEqual(policy, .cancel)
        XCTAssertEqual(received, .Load)
    }

    @MainActor
    func testDecidePolicy_exitSuccess_cancelsAndFiresCallbacks() {
        let webView = QuilttConnectorWebview()
        var fired: [String] = []
        var successMetadata: ConnectorSDKCallbackMetadata?
        webView.load(
            config: config,
            onEvent: { _, _ in fired.append("onEvent") },
            onExit: { _, _ in fired.append("onExit") },
            onExitSuccess: {
                fired.append("onExitSuccess")
                successMetadata = $0
            }
        )

        let policy = decidedPolicy(
            for: webView,
            url: "quilttconnector://ExitSuccess?profileId=profile-1&connectionId=conn-1"
        )

        XCTAssertEqual(policy, .cancel)
        XCTAssertEqual(fired, ["onEvent", "onExit", "onExitSuccess"])
        XCTAssertEqual(successMetadata?.connectorId, "test-connector")
        XCTAssertEqual(successMetadata?.profileId, "profile-1")
        XCTAssertEqual(successMetadata?.connectionId, "conn-1")
    }

    @MainActor
    func testDecidePolicy_exitAbort_cancelsAndFiresAbortCallback() {
        let webView = QuilttConnectorWebview()
        var abortMetadata: ConnectorSDKCallbackMetadata?
        webView.load(config: config, onExitAbort: { abortMetadata = $0 })

        let policy = decidedPolicy(for: webView, url: "quilttconnector://ExitAbort")

        XCTAssertEqual(policy, .cancel)
        XCTAssertEqual(abortMetadata?.connectorId, "test-connector")
    }

    @MainActor
    func testDecidePolicy_exitError_cancelsAndFiresErrorCallback() {
        let webView = QuilttConnectorWebview()
        var errorMetadata: ConnectorSDKCallbackMetadata?
        webView.load(config: config, onExitError: { errorMetadata = $0 })

        let policy = decidedPolicy(for: webView, url: "quilttconnector://ExitError")

        XCTAssertEqual(policy, .cancel)
        XCTAssertEqual(errorMetadata?.connectorId, "test-connector")
    }

    @MainActor
    func testDecidePolicy_navigateEvent_isCancelled() {
        let webView = QuilttConnectorWebview()
        webView.load(config: config)

        // Double-encoded, mirroring how the quilttconnector:// scheme carries OAuth URLs
        let policy = decidedPolicy(
            for: webView,
            url: "quilttconnector://Navigate"
                + "?url=https%253A%252F%252Fsecure.plaid.com%252Fhl%252Ftest"
        )

        XCTAssertEqual(policy, .cancel)
    }

    @MainActor
    func testDecidePolicy_authenticateEvent_firesNoCallbacks() {
        let webView = QuilttConnectorWebview()
        var fired = false
        webView.load(
            config: config,
            onEvent: { _, _ in fired = true },
            onExit: { _, _ in fired = true }
        )

        let policy = decidedPolicy(
            for: webView,
            url: "quilttconnector://Authenticate?profileId=profile-1"
        )

        XCTAssertEqual(policy, .cancel)
        XCTAssertFalse(fired, "Authenticate is a no-op on mobile")
    }

    @MainActor
    func testDecidePolicy_unknownEvent_firesNoCallbacks() {
        let webView = QuilttConnectorWebview()
        var fired = false
        webView.load(
            config: config,
            onEvent: { _, _ in fired = true },
            onExit: { _, _ in fired = true }
        )

        let policy = decidedPolicy(for: webView, url: "quilttconnector://SomethingElse")

        XCTAssertEqual(policy, .cancel)
        XCTAssertFalse(fired, "Unknown events must not fire callbacks")
    }

    @MainActor
    func testDecidePolicy_regularUrl_isAllowed() {
        let webView = QuilttConnectorWebview()
        webView.load(config: config)

        let policy = decidedPolicy(
            for: webView,
            url: "https://test-connector.quiltt.app/index.html"
        )

        XCTAssertEqual(policy, .allow)
    }

    @MainActor
    func testAuthenticate_updatesToken() {
        let webView = QuilttConnectorWebview()
        webView.load(config: config)

        webView.authenticate("new-session-token")

        XCTAssertEqual(webView.token, "new-session-token")
    }
}

private final class StubNavigationAction: WKNavigationAction {
    private let stubRequest: URLRequest

    init(request: URLRequest) {
        self.stubRequest = request
        super.init()
    }

    override var request: URLRequest { stubRequest }
}
