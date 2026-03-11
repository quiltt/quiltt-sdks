import Foundation

#if canImport(UIKit)
    import UIKit
#endif

enum TelemetryUtils {
    static func getSDKAgent(sdkVersion: String, platformInfo: String) -> String {
        return "Quiltt/\(sdkVersion) (\(platformInfo))"
    }

    static func getRuntimePlatformInfo() -> String {
        #if canImport(UIKit)
            let device = UIDevice.current
            let osName = device.systemName
            let osVersion = device.systemVersion
            let model = device.model
            return "iOS; OS \(osName) \(osVersion); Device \(model)"
        #else
            let osVersion = ProcessInfo.processInfo.operatingSystemVersionString
            return "Apple; OS \(osVersion)"
        #endif
    }
}
