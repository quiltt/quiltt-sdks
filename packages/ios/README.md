# Quiltt iOS SDK

[![Swift Versions](https://img.shields.io/endpoint?url=https%3A%2F%2Fswiftpackageindex.com%2Fapi%2Fpackages%2Fquiltt%2Fquiltt-sdks%2Fbadge%3Ftype%3Dswift-versions)](https://swiftpackageindex.com/quiltt/quiltt-sdks)
[![Platforms](https://img.shields.io/endpoint?url=https%3A%2F%2Fswiftpackageindex.com%2Fapi%2Fpackages%2Fquiltt%2Fquiltt-sdks%2Fbadge%3Ftype%3Dplatforms)](https://swiftpackageindex.com/quiltt/quiltt-sdks)
[![CI](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-ios.yml/badge.svg?branch=main)](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-ios.yml)

## Install

### Swift Package Manager

1. Open your project in Xcode.
1. Select `File` > `Add Package Dependency...`.
1. Enter [the URL of the Quiltt Connector Swift SDK repository](https://github.com/quiltt/quiltt-sdks), select the latest version and click `Add Package`.
1. The Quiltt Connector Swift SDK is now integrated into your project. You can import it in your Swift files with `import QuilttConnector`.

## Development

Install [SwiftLint](https://github.com/realm/SwiftLint) for local linting:

```sh
brew install swiftlint
```

Run from `packages/ios/`:

```sh
swiftlint lint --strict
```

## Usage

After importing `QuilttConnector`, you can use its classes and methods in your code. Here's a basic example:

```swift
import SwiftUI
import QuilttConnector
import WebKit

struct ConnectorView: View {
    @Binding var showHomeView: Bool
    @Binding var connectionId: String
    var body: some View {
        WebView(showHomeView: $showHomeView, connectionId: $connectionId)
    }
}

struct WebView: UIViewRepresentable {
    @Binding var showHomeView: Bool
    @Binding var connectionId: String
    @State var config = QuilttConnectorConnectConfiguration(
        connectorId: "<CONNECTOR_ID>",
        appLauncherUrl: "<YOUR_HTTPS_UNIVERSAL_LINK>"
    )

    func makeUIView(context: Context) -> WKWebView {
        let quilttConnector = QuilttConnector.init()
        quilttConnector.authenticate(token: "<SESSION_TOKEN>")
        let webview = quilttConnector.connect(config: config,
                                              onEvent: { eventType, metadata in
                                                print("onEvent \(eventType), \(metadata)")
                                              },
                                              onExitSuccess: { metadata in
                                                print("onExitSuccess \(metadata)")
                                                if let newConnectionId = metadata.connectionId {
                                                    connectionId = newConnectionId
                                                }
                                                showHomeView = true
                                              },
                                              onExitAbort: { metadata in
                                                print("onExitAbort \(metadata)")
                                                showHomeView = true
                                              },
                                              onExitError: { metadata in
                                                print("onExitError \(metadata)")
                                                showHomeView = true
                                              })
        return webview
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Use this method to update the WKWebView with new configuration settings.
    }
}

#Preview {
    ConnectorView(showHomeView: .constant(false), connectionId: .constant("connectionId"))
}
```
