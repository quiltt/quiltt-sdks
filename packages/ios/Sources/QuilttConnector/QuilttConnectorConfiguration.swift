// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import Foundation

public protocol QuilttConnectorConfiguration {
    var connectorId: String { get }
    var appLauncherUrl: String { get }
    var connectionId: String? { get }
    var institution: String? { get }
}

public struct QuilttConnectorConnectConfiguration: QuilttConnectorConfiguration {
    public var connectorId: String
    public var appLauncherUrl: String
    public var connectionId: String?
    public var institution: String?
    public init(
        connectorId: String,
        appLauncherUrl: String,
        institution: String? = nil
    ) {
        self.connectorId = connectorId
        self.appLauncherUrl = appLauncherUrl
        self.institution = institution
    }
}

public struct QuilttConnectorReconnectConfiguration: QuilttConnectorConfiguration {
    public var connectorId: String
    public var appLauncherUrl: String
    public var connectionId: String?
    public var institution: String?

    public init(
        connectorId: String,
        appLauncherUrl: String,
        connectionId: String
    ) {
        self.connectorId = connectorId
        self.appLauncherUrl = appLauncherUrl
        self.connectionId = connectionId
    }
}
