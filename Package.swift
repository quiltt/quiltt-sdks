// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "QuilttConnector",
  platforms: [
    .iOS(.v13),
    .macOS(.v10_15),
  ],
  products: [
    .library(
      name: "QuilttConnector",
      targets: ["QuilttConnector"]
    )
  ],
  targets: [
    .target(
      name: "QuilttConnector",
      path: "packages/ios/Sources/QuilttConnector"
    ),
    .testTarget(
      name: "QuilttConnectorTests",
      dependencies: ["QuilttConnector"],
      path: "packages/ios/Tests/QuilttConnectorTests"
    ),
  ]
)
