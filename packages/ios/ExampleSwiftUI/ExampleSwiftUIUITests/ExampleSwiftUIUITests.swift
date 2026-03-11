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
        let connectionIdPrefixLabel = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "connection_")).firstMatch

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
}
