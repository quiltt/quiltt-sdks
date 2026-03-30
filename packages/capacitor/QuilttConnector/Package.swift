// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "QuilttConnector",
  platforms: [.iOS(.v14)],
  products: [
    .library(
      name: "QuilttConnector",
      targets: ["QuilttConnectorPlugin"])
  ],
  dependencies: [
    .package(
      url: "https://github.com/ionic-team/capacitor-swift-pm.git",
      from: "8.0.0")
  ],
  targets: [
    .target(
      name: "QuilttConnectorPlugin",
      dependencies: [
        .product(name: "Capacitor", package: "capacitor-swift-pm"),
        .product(name: "Cordova", package: "capacitor-swift-pm"),
      ],
      path: "../ios/Sources/QuilttConnectorPlugin")
  ]
)
