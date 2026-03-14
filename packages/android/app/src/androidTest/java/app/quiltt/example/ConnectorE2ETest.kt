package app.quiltt.example

import android.content.Intent
import androidx.test.core.app.ActivityScenario
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
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import org.junit.FixMethodOrder
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters

/**
 * Instrumented end-to-end tests for the Quiltt Connector example app.
 *
 * Verifies that:
 *  - The app launches without crashing
 *  - The "Launch Connector" button is visible and enabled on the home screen
 *  - Tapping the button opens QuilttConnectorActivity
 *  - The WebView container that renders the Quiltt Connector is displayed
 *  - A pre-authenticated connector skips auth and reaches "Log in at Mock Bank"
 *
 * For the authenticated test, pass a pre-issued session token as an instrumentation argument:
 *   ./gradlew app:connectedDebugAndroidTest \
 *     -Pandroid.testInstrumentationRunnerArguments.QUILTT_SESSION_TOKEN=<token>
 *
 * Tests are ordered by name (ascending). The WebView/UIAutomator2 test is
 * prefixed 'v' so it runs after all Espresso tests (a, l, t), preventing the
 * long UIAutomator2 wait from corrupting window focus for subsequent tests.
 */
@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
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

    // -------------------------------------------------------------------------
    // Connector: Full bank connection
    // -------------------------------------------------------------------------

    /**
     * Verifies that a pre-authenticated connector loads without auth screens.
     *
     * Receives a pre-issued session token via instrumentation argument QUILTT_SESSION_TOKEN,
     * launches QuilttConnectorActivity with the token, and waits for the connector WebView to
     * reach "Log in at Mock Bank" — confirming the SDK accepted the token and skipped auth.
     *
     * Skipped automatically when QUILTT_SESSION_TOKEN is not provided or is blank.
     */
    @Test
    fun verifyPreAuthConnectorReachesBankScreen() {
        val token = InstrumentationRegistry.getArguments()
            .getString("QUILTT_SESSION_TOKEN").takeIf { !it.isNullOrBlank() } ?: return

        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val intent = Intent(context, QuilttConnectorActivity::class.java).apply {
            putExtra("connectorId", "1h6bz4vo9z")
            putExtra("token", token)
        }

        ActivityScenario.launch<QuilttConnectorActivity>(intent).use {
            val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
            val heading = device.wait(
                Until.findObject(By.text("Log in at Mock Bank")),
                60_000L
            )
            assert(heading != null) { "Expected 'Log in at Mock Bank' in connector WebView" }
        }
    }
}
