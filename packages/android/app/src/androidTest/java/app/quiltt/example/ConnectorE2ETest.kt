package app.quiltt.example

import android.content.Intent
import android.util.Log
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
import org.json.JSONObject
import org.junit.FixMethodOrder
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.MethodSorters
import java.net.HttpURLConnection
import java.net.URL

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
 * For the authenticated test, pass your API key as an instrumentation argument:
 *   ./gradlew app:connectedDebugAndroidTest \
 *     -Pandroid.testInstrumentationRunnerArguments.QUILTT_API_KEY_SECRET=<key>
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
     * Issues a real session token for the sandbox test profile, then launches
     * QuilttConnectorActivity directly with the token. Waits for the connector
     * WebView to reach "Log in at Mock Bank", confirming the SDK accepted the
     * token and the connector skipped the email/OTP auth flow entirely.
     *
     * Skipped automatically when QUILTT_API_KEY_SECRET is not provided.
     */
    @Test
    fun verifyPreAuthConnectorReachesBankScreen() {
        val apiKey = InstrumentationRegistry.getArguments()
            .getString("QUILTT_API_KEY_SECRET").takeIf { !it.isNullOrBlank() } ?: return

        val token = issueSessionToken(apiKey)
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

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Issues a Quiltt session token for the sandbox test profile via the auth API.
     * Safe to call from the Instrumentation thread (not the main UI thread).
     */
    private fun issueSessionToken(apiKey: String): String {
        val url = URL("https://auth.quiltt.io/v1/users/sessions")
        val conn = url.openConnection() as HttpURLConnection
        return try {
            conn.requestMethod = "POST"
            conn.setRequestProperty("Authorization", "Bearer $apiKey")
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.outputStream.use { os ->
                os.write("""{"userId":"p_132giKejS3KH0xDyySC0d5"}""".toByteArray())
            }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = stream.bufferedReader().readText()
            Log.d("ConnectorE2ETest", "Auth response ($code): $body")
            check(code in 200..299) { "Auth API returned HTTP $code: $body" }
            val json = JSONObject(body)
            check(json.has("token") && !json.isNull("token")) { "Auth API 200 response missing 'token': $body" }
            json.getString("token")
        } finally {
            conn.disconnect()
        }
    }
}
