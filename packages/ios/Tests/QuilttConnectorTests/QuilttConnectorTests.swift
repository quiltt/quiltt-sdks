import XCTest

@testable import QuilttConnector

final class QuilttConnectorTests: XCTestCase {
    @MainActor
    func testAuthenticate_doesNotThrow() {
        let connector = QuilttConnector()
        XCTAssertNoThrow(connector.authenticate(token: "test-session-token"))
    }
}
