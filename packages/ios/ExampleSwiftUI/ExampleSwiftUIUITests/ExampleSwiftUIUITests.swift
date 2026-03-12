import XCTest

final class ExampleSwiftUIUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.terminate()
        app.launch()
    }

    override func tearDownWithError() throws {
        app.terminate()
        app = nil
    }

    // MARK: - Home screen

    func testAppLaunchesWithoutCrashing() {
        XCTAssertTrue(app.state == .runningForeground, "App should be running in the foreground after launch")
        add(XCTAttachment(screenshot: app.screenshot()))
    }

    func testHomeScreenShowsNavigationTitle() {
        let navBar = app.navigationBars["Home View"]
        XCTAssertTrue(navBar.waitForExistence(timeout: 5), "Navigation bar with title 'Home View' should be visible")
    }

    func testHomeScreenShowsLaunchConnectorButton() {
        let button = app.buttons["Launch Connector"]
        XCTAssertTrue(button.waitForExistence(timeout: 5), "Launch Connector button should be visible")
        XCTAssertTrue(button.isEnabled, "Launch Connector button should be enabled")
    }

    func testHomeScreenShowsConnectionIdLabel() {
        let navBar = app.navigationBars["Home View"]
        XCTAssertTrue(navBar.waitForExistence(timeout: 10), "Home screen should be visible before asserting connection label")

        // The label may show the initial value or a previously established connection id.
        let initialLabel = app.staticTexts["No Connection ID"]
        let connectionIdPredicate = NSPredicate(format: "label BEGINSWITH %@", "connection_")
        let connectionIdPrefixLabel = app.staticTexts.matching(connectionIdPredicate).firstMatch

        XCTAssertTrue(
            initialLabel.exists || connectionIdPrefixLabel.exists,
            "Connection ID label should be visible on home screen"
        )
    }

    // MARK: - Connector navigation

    func testTappingLaunchConnectorOpensConnectorView() {
        let button = app.buttons["Launch Connector"]
        XCTAssertTrue(button.waitForExistence(timeout: 5))
        button.tap()

        // ContentView swaps showHomeView to false; the home NavigationBar disappears.
        let homeNavBar = app.navigationBars["Home View"]
        XCTAssertFalse(
            homeNavBar.waitForExistence(timeout: 3),
            "Home navigation bar should no longer be visible after navigating to Connector"
        )

        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "connector-view"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    func testConnectorViewDoesNotCrashApp() {
        let button = app.buttons["Launch Connector"]
        XCTAssertTrue(button.waitForExistence(timeout: 5))
        button.tap()

        // Allow the WKWebView time to begin loading the Quiltt connector (connectorId: 1h6bz4vo9z)
        sleep(3)

        XCTAssertTrue(
            app.state == .runningForeground,
            "App should still be running in the foreground after the Connector WebView loads"
        )

        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "connector-loaded"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    // MARK: - Connector: Full bank connection

    /// Verifies that a pre-authenticated connector loads without auth screens.
    ///
    /// Issues a real session token for the sandbox test profile, relaunch the app
    /// with the token injected via `launchEnvironment`, then waits for the WKWebView
    /// to show "Log in at Mock Bank" — confirming the SDK accepted the token and the
    /// connector skipped the email/OTP auth flow entirely.
    ///
    /// The test is skipped when `QUILTT_API_KEY_SECRET` is not set in the environment.
    func testConnectorLoadsWithRealToken() throws {
        let apiKey = ProcessInfo.processInfo.environment["QUILTT_API_KEY_SECRET"] ?? ""
        try XCTSkipIf(apiKey.isEmpty, "QUILTT_API_KEY_SECRET not set; skipping authenticated connector test")

        let token = try issueSessionToken(apiKey: apiKey)

        // Relaunch the app with the session token injected into the process environment
        app.terminate()
        app.launchEnvironment["QUILTT_SESSION_TOKEN"] = token
        app.launchEnvironment["QUILTT_CONNECTOR_ID"] = "1h6bz4vo9z"
        app.launchEnvironment["QUILTT_APP_LAUNCHER_URL"] = "https://example.com/callback"
        app.launch()

        let button = app.buttons["Launch Connector"]
        XCTAssertTrue(button.waitForExistence(timeout: 5))
        button.tap()

        // Wait for the WKWebView to appear
        let webView = app.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 30), "WKWebView should appear after tapping Launch Connector")

        // The connector skips auth (token pre-loaded) and should show the Mock bank screen
        let bankHeading = webView.staticTexts["Log in at Mock Bank"]
        XCTAssertTrue(bankHeading.waitForExistence(timeout: 30), "Expected 'Log in at Mock Bank' in connector WebView")

        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "connector-mock-bank"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    // MARK: - Helpers

    /// Issues a Quiltt session token for the sandbox test profile via the auth API.
    /// Uses a semaphore so it can be called synchronously from XCTest.
    private func issueSessionToken(apiKey: String) throws -> String {
        let url = URL(string: "https://auth.quiltt.io/v1/users/sessions")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(
            withJSONObject: ["userId": "p_132giKejS3KH0xDyySC0d5"]
        )

        var result: Result<String, Error> = .failure(
            NSError(domain: "QuilttTest", code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Request did not complete"])
        )
        let semaphore = DispatchSemaphore(value: 0)

        URLSession.shared.dataTask(with: request) { data, _, error in
            defer { semaphore.signal() }
            if let error = error {
                result = .failure(error)
                return
            }
            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let token = json["token"] as? String else {
                result = .failure(NSError(
                    domain: "QuilttTest", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to parse token from auth response"]
                ))
                return
            }
            result = .success(token)
        }.resume()

        semaphore.wait()
        return try result.get()
    }
}
