package app.quiltt.example

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.isEnabled
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Instrumented end-to-end tests for the Quiltt Connector example app.
 *
 * Verifies that:
 *  - The app launches without crashing
 *  - The "Launch Connector" button is visible and enabled on the home screen
 *  - Tapping the button opens QuilttConnectorActivity
 *  - The WebView container that renders the Quiltt Connector (connectorId: 1h6bz4vo9z) is displayed
 */
@RunWith(AndroidJUnit4::class)
class ConnectorE2ETest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    // -------------------------------------------------------------------------
    // App bootstrap
    // -------------------------------------------------------------------------

    @Test
    fun appLaunchesWithCorrectPackage() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assert(appContext.packageName == "app.quiltt.example") {
            "Expected package name 'app.quiltt.example', got '${appContext.packageName}'"
        }
    }

    // -------------------------------------------------------------------------
    // Home screen
    // -------------------------------------------------------------------------

    @Test
    fun launchConnectorButtonIsDisplayed() {
        onView(withId(R.id.launch_connector_button))
            .check(matches(isDisplayed()))
    }

    @Test
    fun launchConnectorButtonIsEnabled() {
        onView(withId(R.id.launch_connector_button))
            .check(matches(isEnabled()))
    }

    @Test
    fun launchConnectorButtonHasCorrectLabel() {
        onView(withId(R.id.launch_connector_button))
            .check(matches(withText("Launch Connector")))
    }

    // -------------------------------------------------------------------------
    // Connector navigation
    // -------------------------------------------------------------------------

    @Test
    fun tappingLaunchConnectorRendersConnectorLayout() {
        onView(withId(R.id.launch_connector_button)).perform(click())

        // QuilttConnectorActivity adds a QuilttConnectorWebView to connector_layout,
        // which loads the Quiltt Connector with connectorId: 1h6bz4vo9z.
        onView(withId(R.id.connector_layout))
            .check(matches(isDisplayed()))
    }
}
