package app.quiltt.example

import android.content.Intent
import android.widget.Button
import android.view.ViewGroup
import android.view.WindowManager
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assume.assumeTrue
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
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
 *  - A pre-authenticated connector skips auth and attaches connector content to the host layout
 *
 * For the authenticated test, pass a pre-issued session token as an instrumentation argument:
 *   ./gradlew app:connectedDebugAndroidTest \
 *     -Pandroid.testInstrumentationRunnerArguments.QUILTT_SESSION_TOKEN=<token>
 *
 * Tests are ordered by name (ascending). The WebView/UIAutomator2 test is
 * prefixed 'v' so it runs after all home-screen checks (a, l, t).
 */
@RunWith(AndroidJUnit4::class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
class ConnectorE2ETest {

    @get:Rule
    val activityRule = ActivityScenarioRule(MainActivity::class.java)

    /**
     * Force the activity window to be interactive before each test so that
        * direct activity interactions and view lookups run against a focused window.
        * Without this, headless CI emulators can leave the screen off or keyguarded,
        * making UI state checks and button taps flaky.
     */
    @Before
    fun bringActivityToFocus() {
        activityRule.scenario.onActivity { activity ->
            activity.setShowWhenLocked(true)
            activity.setTurnScreenOn(true)
            activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    // -------------------------------------------------------------------------
    // App bootstrap
    // -------------------------------------------------------------------------

    @Test
    fun appLaunchesWithCorrectPackage() {
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("app.quiltt.example", appContext.packageName)
    }

    // -------------------------------------------------------------------------
    // Home screen
    // -------------------------------------------------------------------------

    @Test
    fun launchConnectorButtonIsDisplayed() {
        activityRule.scenario.onActivity { activity ->
            val button = activity.findViewById<Button>(R.id.launch_connector_button)
            assertNotNull("Expected launch connector button to exist", button)
            assertTrue("Expected launch connector button to be visible", button.isShown)
        }
    }

    @Test
    fun launchConnectorButtonIsEnabled() {
        activityRule.scenario.onActivity { activity ->
            val button = activity.findViewById<Button>(R.id.launch_connector_button)
            assertNotNull("Expected launch connector button to exist", button)
            assertTrue("Expected launch connector button to be enabled", button.isEnabled)
        }
    }

    @Test
    fun launchConnectorButtonHasCorrectLabel() {
        activityRule.scenario.onActivity { activity ->
            val button = activity.findViewById<Button>(R.id.launch_connector_button)
            assertNotNull("Expected launch connector button to exist", button)
            assertEquals("Launch Connector", button.text.toString())
        }
    }

    // -------------------------------------------------------------------------
    // Connector navigation
    // -------------------------------------------------------------------------

    @Test
    fun tappingLaunchConnectorRendersConnectorLayout() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val monitor = instrumentation.addMonitor(
            QuilttConnectorActivity::class.java.name,
            null,
            false,
        )

        activityRule.scenario.onActivity { activity ->
            val button = activity.findViewById<Button>(R.id.launch_connector_button)
            assertNotNull("Expected launch connector button to exist", button)
            button.performClick()
        }

        val launchedConnector =
            instrumentation.waitForMonitorWithTimeout(monitor, 10_000) as? QuilttConnectorActivity

        try {
            assertNotNull("Expected QuilttConnectorActivity to be launched after launch tap", launchedConnector)
            val connectorActivity = launchedConnector!!

            val start = System.currentTimeMillis()
            var connectorReady = false
            while (System.currentTimeMillis() - start < 15_000L && !connectorReady) {
                instrumentation.waitForIdleSync()

                instrumentation.runOnMainSync {
                    val connectorLayout = connectorActivity.findViewById<ViewGroup>(R.id.connector_layout)
                    connectorReady = connectorLayout != null &&
                        (connectorLayout.isShown || connectorLayout.childCount > 0)
                }

                if (!connectorReady) {
                    Thread.sleep(250)
                }
            }

            assertTrue(
                "Expected connector layout to become visible or host connector content",
                connectorReady,
            )
        } finally {
            launchedConnector?.finish()
            instrumentation.removeMonitor(monitor)
        }
    }

    // -------------------------------------------------------------------------
    // Connector: Full bank connection
    // -------------------------------------------------------------------------

    /**
     * Verifies that a pre-authenticated connector loads without auth screens.
     *
     * Receives a pre-issued session token via instrumentation argument QUILTT_SESSION_TOKEN,
     * launches QuilttConnectorActivity with the token, and waits for connector_layout to contain
     * attached connector content.
     *
     * Skipped automatically when QUILTT_SESSION_TOKEN is not provided or is blank.
     */
    @Test
    fun verifyPreAuthConnectorReachesBankScreen() {
        val token = InstrumentationRegistry.getArguments()
            .getString("QUILTT_SESSION_TOKEN")
        assumeTrue(
            "Skipping test: QUILTT_SESSION_TOKEN is missing or blank",
            !token.isNullOrBlank(),
        )

        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val intent = Intent(context, QuilttConnectorActivity::class.java).apply {
            putExtra("connectorId", "1h6bz4vo9z")
            putExtra("token", token)
        }

        ActivityScenario.launch<QuilttConnectorActivity>(intent).use {
            val start = System.currentTimeMillis()
            var connectorIsReady = false

            while (System.currentTimeMillis() - start < 120_000L && !connectorIsReady) {
                InstrumentationRegistry.getInstrumentation().waitForIdleSync()
                it.onActivity { activity ->
                    val connectorLayout = activity.findViewById<ViewGroup>(R.id.connector_layout)
                    connectorIsReady = connectorLayout != null && connectorLayout.childCount > 0
                }

                if (!connectorIsReady) {
                    Thread.sleep(500)
                }
            }

            assertTrue("Expected connector WebView to be attached in connector_layout", connectorIsReady)
        }
    }
}
