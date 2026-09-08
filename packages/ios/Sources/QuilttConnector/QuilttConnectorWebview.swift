// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

@preconcurrency import Foundation
@preconcurrency import WebKit

#if canImport(UIKit)
    import UIKit
#endif

class QuilttConnectorWebview: WKWebView, WKNavigationDelegate {
    public var config: QuilttConnectorConfiguration?
    public var token: String?
    public var onEvent: ConnectorSDKOnEventCallback?
    public var onExit: ConnectorSDKOnEventExitCallback?
    public var onExitSuccess: ConnectorSDKOnExitSuccessCallback?
    public var onExitAbort: ConnectorSDKOnExitAbortCallback?
    public var onExitError: ConnectorSDKOnExitErrorCallback?

    public init() {
        let webConfiguration = WKWebViewConfiguration()
        super.init(frame: .zero, configuration: webConfiguration)

        // Configure JavaScript based on iOS version
        if #available(iOS 14.0, macOS 11.0, *) {
            self.configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        } else {
            self.configuration.preferences.javaScriptEnabled = true
        }

        // Skip scrollView setup during testing/macOS
        #if os(iOS)
            // Explicitly access WKWebView's scrollView property
            (self as WKWebView).scrollView.isScrollEnabled = true
            self.isMultipleTouchEnabled = false
        #endif
        // Enable isInspectable to debug webview
        //  if #available(iOS 16.4, *) {
        //  self.isInspectable = true
        //  }
        self.navigationDelegate = self  // to manage navigation behavior for the webview.
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    @discardableResult
    public func load(
        token: String? = nil,
        config: QuilttConnectorConfiguration,
        onEvent: ConnectorSDKOnEventCallback? = nil,
        onExit: ConnectorSDKOnEventExitCallback? = nil,
        onExitSuccess: ConnectorSDKOnExitSuccessCallback? = nil,
        onExitAbort: ConnectorSDKOnExitAbortCallback? = nil,
        onExitError: ConnectorSDKOnExitErrorCallback? = nil
    ) -> WKNavigation? {
        self.token = token
        self.config = config
        self.onEvent = onEvent
        self.onExit = onExit
        self.onExitSuccess = onExitSuccess
        self.onExitAbort = onExitAbort
        self.onExitError = onExitError

        // Apply smart URL encoding to the app launcher URL
        let safeAppLauncherUrl = URLUtils.smartEncodeURIComponent(config.appLauncherUrl)

        // Build the URL components
        var urlComponents = URLComponents()
        urlComponents.scheme = "https"
        urlComponents.host = "\(config.connectorId).quiltt.app"

        // Create query items
        var queryItems = [
            URLQueryItem(name: "mode", value: "webview"),
            URLQueryItem(name: "agent", value: "ios-\(quilttSdkVersion)"),
        ]

        // Handle the app launcher URL with special care
        if URLUtils.isEncoded(safeAppLauncherUrl) {
            // If already encoded, decode once to prevent double encoding
            let decodedOnce = safeAppLauncherUrl.removingPercentEncoding ?? safeAppLauncherUrl
            queryItems.append(URLQueryItem(name: "app_launcher_url", value: decodedOnce))
        } else {
            queryItems.append(URLQueryItem(name: "app_launcher_url", value: safeAppLauncherUrl))
        }

        // Add theme mode if provided
        if let themeMode = config.themeMode {
            queryItems.append(URLQueryItem(name: "theme_mode", value: themeMode))
        }

        urlComponents.queryItems = queryItems

        if let url = urlComponents.url {
            let sdkAgent = TelemetryUtils.getSDKAgent(
                sdkVersion: quilttSdkVersion,
                platformInfo: TelemetryUtils.getRuntimePlatformInfo()
            )
            var req = URLRequest(url: url)
            req.setValue(sdkAgent, forHTTPHeaderField: "Quiltt-SDK-Agent")
            return super.load(req)
        }
        return nil
    }

    /**
     Intercepts navigation actions to handle Quiltt events, render allowed content,
     or open OAuth URLs in an external browser.

     https://developer.apple.com/documentation/webkit/wknavigationdelegate/1455641-webview
     */
    public func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if let url = navigationAction.request.url {
            // Intercept the URL here
            print("Intercepted URL: \(url)")
            if isQuilttEvent(url) {
                handleQuilttEvent(url)
                decisionHandler(.cancel)
                return
            }
            if shouldRender(url) {
                decisionHandler(.allow)
                return
            }
            handleOAuthUrl(url)
            decisionHandler(.cancel)
            return
        } else {
            decisionHandler(.cancel)
            return
        }
    }

    // TODO: FIXME, not sure how this func can fit into here
    public func authenticate(_ token: String) {
        self.token = token
        self.initInjectJavaScript()
    }

    private func handleQuilttEvent(_ url: URL) {
        let urlComponents = URLComponents(string: url.absoluteString)
        let connectorId = config?.connectorId
        let profileId = urlComponents?.queryItems?.first(where: { $0.name == "profileId" })?.value
        let connectionId = urlComponents?.queryItems?.first(where: { $0.name == "connectionId" })?
            .value
        let metaData = ConnectorSDKCallbackMetadata(
            connectorId: connectorId!, profileId: profileId, connectionId: connectionId)
        print("handleQuilttEvent \(url)")
        switch url.host {
        case "Load":
            initInjectJavaScript()
            self.onEvent?(ConnectorSDKEventType.Load, metaData)
            break
        case "ExitAbort":
            clearLocalStorage()
            self.onEvent?(ConnectorSDKEventType.ExitAbort, metaData)
            self.onExit?(ConnectorSDKEventType.ExitAbort, metaData)
            self.onExitAbort?(metaData)
            break
        case "ExitError":
            clearLocalStorage()
            self.onEvent?(ConnectorSDKEventType.ExitError, metaData)
            self.onExit?(ConnectorSDKEventType.ExitError, metaData)
            self.onExitError?(metaData)
            break
        case "ExitSuccess":
            clearLocalStorage()
            self.onEvent?(ConnectorSDKEventType.ExitSuccess, metaData)
            self.onExit?(ConnectorSDKEventType.ExitSuccess, metaData)
            self.onExitSuccess?(metaData)
            break
        case "Authenticate":
            // Not used in mobile but leaving breadcrumb here.
            print("Authenticate \(String(describing: profileId))")
            break
        case "Navigate":
            if let urlc = URLComponents(string: url.absoluteString),
                let navigateUrlItem = urlc.queryItems?.first(where: { $0.name == "url" }),
                let navigateUrlString = navigateUrlItem.value
            {
                handleNavigateUrl(navigateUrlString)
            } else {
                print("Navigate URL missing from request")
            }
            break
        default:
            print("unhandled event \(url.absoluteString)")
        }
    }

    private func handleNavigateUrl(_ navigateUrlString: String) {
        if let resolved = URLUtils.resolveUrl(navigateUrlString),
           let url = URL(string: resolved)
        {
            handleOAuthUrl(url)
        } else {
            print("Failed to parse OAuth URL after decoding attempts: \(navigateUrlString)")
        }
    }

    private func initInjectJavaScript() {
        let tokenString = token ?? "null"

        let connectorId = config!.connectorId
        let connectionId = config?.connectionId ?? "null"
        let institution = config?.institution ?? "null"
        let script = """
                const options = {
                  source: 'quiltt',
                  type: 'Options',
                  token: '\(tokenString)',
                  connectorId: '\(connectorId)',
                  connectionId: '\(connectionId)',
                  institution: '\(institution)',
                };
                const compactedOptions = Object.keys(options).reduce((acc, key) => {
                  if (options[key] !== 'null') {
                    acc[key] = options[key];
                  }
                  return acc;
                }, {});
                window.postMessage(compactedOptions);
            """
        self.evaluateJavaScript(script)
    }

    private func clearLocalStorage() {
        let script = "localStorage.clear()"
        self.evaluateJavaScript(script)
    }

    private func shouldRender(_ url: URL) -> Bool {
        if isQuilttEvent(url) {
            return false
        }
        return true
    }

    func handleOAuthUrl(_ oauthUrl: URL) {
        // Check if URL uses HTTPS scheme using the URL object's normalized scheme property
        guard oauthUrl.scheme?.lowercased() == "https" else {
            print("handleOAuthUrl - Skipping non-HTTPS URL: \(oauthUrl)")
            return
        }

        #if canImport(UIKit) && os(iOS)
            // Attempt to open the URL directly without a preflight check, since
            // the `open` completion handler below reports success/failure authoritatively.
            if #available(iOS 10.0, *) {
                UIApplication.shared.open(oauthUrl, options: [:]) { success in
                    if !success {
                        print("handleOAuthUrl - Failed to open URL: \(oauthUrl)")
                        self.fireOAuthFailure()
                    }
                }
            } else {
                let opened = UIApplication.shared.openURL(oauthUrl)
                if !opened {
                    print("handleOAuthUrl - Failed to open URL: \(oauthUrl)")
                    fireOAuthFailure()
                }
            }
        #else
            // For non-iOS platforms (used only during testing)
            print("[TEST MODE] Would open URL: \(oauthUrl)")
        #endif
    }

    func fireOAuthFailure() {
        guard let connectorId = config?.connectorId else { return }
        let metadata = ConnectorSDKCallbackMetadata(
            connectorId: connectorId,
            profileId: nil,
            connectionId: nil
        )
        onEvent?(ConnectorSDKEventType.ExitError, metadata)
        onExit?(ConnectorSDKEventType.ExitError, metadata)
        onExitError?(metadata)
    }

    private func isQuilttEvent(_ url: URL) -> Bool {
        return url.absoluteString.hasPrefix("quilttconnector://")
    }
}
