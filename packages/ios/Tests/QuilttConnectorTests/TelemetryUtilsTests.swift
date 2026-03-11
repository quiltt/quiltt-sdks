import XCTest

@testable import QuilttConnector

final class TelemetryUtilsTests: XCTestCase {
    func testGetSDKAgent_formatsLikeJsPackages() {
        let sdkAgent = TelemetryUtils.getSDKAgent(sdkVersion: "5.2.0", platformInfo: "iOS")
        XCTAssertEqual(sdkAgent, "Quiltt/5.2.0 (iOS)")
    }

    func testGetRuntimePlatformInfo_containsExpectedParts() {
        let platformInfo = TelemetryUtils.getRuntimePlatformInfo()

        XCTAssertFalse(platformInfo.isEmpty)
        XCTAssertTrue(platformInfo.contains("; OS "))
        XCTAssertTrue(platformInfo.contains("; Device ") || platformInfo.hasPrefix("Apple; OS "))
    }
}
