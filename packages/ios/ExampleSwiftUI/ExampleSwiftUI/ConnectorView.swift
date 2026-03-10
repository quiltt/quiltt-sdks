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
//        institution: "<OPTIONAL_INSTITUTION_SEARCH_TERM_TO_PREFILL_INSTITUTION>"
    )

    func makeUIView(context: Context) -> WKWebView {
        let quilttConnector = QuilttConnector.init()
        quilttConnector.authenticate(token: "<SESSION_TOKEN>")
        let webview = quilttConnector.connect(config: config,
                                              onEvent: { eventType, metadata in
                                                print("onEvent \(eventType), \(metadata)")
                                              },
                                              onExit: { eventType, metadata in
                                                print("onExit \(eventType), \(metadata)")
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
