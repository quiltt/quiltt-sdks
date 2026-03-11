import XCTest

@testable import QuilttConnector

final class QuilttSdkVersionTests: XCTestCase {
    func testSdkVersion_isNotEmpty() {
        XCTAssertFalse(quilttSdkVersion.isEmpty)
    }

    func testSdkVersion_matchesSemanticVersioning() {
        let pattern = #"^\d+\.\d+\.\d+$"#
        let range = quilttSdkVersion.range(of: pattern, options: .regularExpression)
        XCTAssertNotNil(
            range, "SDK version '\(quilttSdkVersion)' should follow semver X.Y.Z format")
    }
}
