# Quiltt Android SDK

[![Maven Central](https://img.shields.io/maven-central/v/io.quiltt/connector)](https://search.maven.org/artifact/io.quiltt/connector)
[![API Level](https://img.shields.io/badge/API-26%2B-brightgreen.svg)](https://android-arsenal.com/api?level=26)
[![CI](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-android.yml/badge.svg?branch=main)](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-android.yml)

The Quiltt Android SDK provides native Android components for integrating [Quiltt Connector](https://quiltt.dev/connector) into your Android applications.

Note that this SDK currently supports Android API level 26+ (Android 8.0). We welcome contributions to add support for additional Android versions!

See the official guide at: [https://quiltt.dev/connector/sdk/android](https://quiltt.dev/connector/sdk/android)

## Installation

### Gradle (Recommended)

Add the dependency to your app's `build.gradle` or `build.gradle.kts`:

```gradle
android {
    defaultConfig {
        minSdk = 26 // or greater
    }
}

dependencies {
    implementation("io.quiltt:connector:<INSERT_LATEST_VERSION>")
}
```

### Maven

```xml
<dependency>
    <groupId>io.quiltt</groupId>
    <artifactId>connector</artifactId>
    <version>INSERT_LATEST_VERSION</version>
</dependency>
```

## Usage

### Basic Implementation (View-based)

```kotlin
package app.quiltt.example

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.widget.Toast
import androidx.constraintlayout.widget.ConstraintLayout
import app.quiltt.connector.QuilttConnector
import app.quiltt.connector.QuilttConnectorConnectConfiguration
import app.quiltt.connector.QuilttConnectorWebView

class QuilttConnectorActivity : AppCompatActivity() {
    private lateinit var webView: QuilttConnectorWebView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_quiltt_connector)

        val connectorLayout = findViewById<ConstraintLayout>(R.id.connector_layout)
        val quilttConnector = QuilttConnector(this)
        
        // Authenticate with session token
        quilttConnector.authenticate("<SESSION_TOKEN>")
        
        val config = QuilttConnectorConnectConfiguration(
            connectorId = "<CONNECTOR_ID>",
            appLauncherUrl = "<YOUR_HTTPS_APP_LINK>"
        )

        // Launch Connect Flow
        webView = quilttConnector.connect(
            config = config,
            onEvent = { eventType, metadata ->
                println("onEvent $eventType: $metadata")
            },
            onExitSuccess = { metadata ->
                println("onExitSuccess: $metadata")
                Toast.makeText(this, "Connected: ${metadata.connectionId}", Toast.LENGTH_LONG).show()
                finish()
            },
            onExitAbort = { metadata ->
                println("onExitAbort: $metadata")
                finish()
            },
            onExitError = { metadata ->
                println("onExitError: $metadata")
                Toast.makeText(this, "Connection failed", Toast.LENGTH_LONG).show()
                finish()
            }
        )

        connectorLayout.addView(webView)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
```

### Layout XML

Create `activity_quiltt_connector.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout 
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/connector_layout"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <!-- The QuilttConnectorWebView will be added programmatically -->

</androidx.constraintlayout.widget.ConstraintLayout>
```

### Jetpack Compose Implementation

```kotlin
package app.quiltt.example

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import app.quiltt.connector.QuilttConnector
import app.quiltt.connector.QuilttConnectorConnectConfiguration

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            QuilttConnectorScreen()
        }
    }
}

@Composable
fun QuilttConnectorScreen() {
    val context = LocalContext.current
    
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            val quilttConnector = QuilttConnector(ctx)
            quilttConnector.authenticate("<SESSION_TOKEN>")
            
            val config = QuilttConnectorConnectConfiguration(
                connectorId = "<CONNECTOR_ID>",
                appLauncherUrl = "<YOUR_HTTPS_APP_LINK>"
            )
            
            quilttConnector.connect(
                config = config,
                onEvent = { eventType, metadata ->
                    println("onEvent $eventType: $metadata")
                },
                onExitSuccess = { metadata ->
                    println("onExitSuccess: $metadata")
                    Toast.makeText(ctx, "Connected: ${metadata.connectionId}", Toast.LENGTH_LONG).show()
                    (ctx as? ComponentActivity)?.finish()
                },
                onExitAbort = { metadata ->
                    println("onExitAbort: $metadata")
                    (ctx as? ComponentActivity)?.finish()
                },
                onExitError = { metadata ->
                    println("onExitError: $metadata")
                    Toast.makeText(ctx, "Connection failed", Toast.LENGTH_LONG).show()
                    (ctx as? ComponentActivity)?.finish()
                }
            )
        }
    )
}
```

### Reconnect Flow

```kotlin
class ReconnectActivity : AppCompatActivity() {
    private lateinit var webView: QuilttConnectorWebView
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_quiltt_connector)

        val connectorLayout = findViewById<ConstraintLayout>(R.id.connector_layout)
        val quilttConnector = QuilttConnector(this)
        quilttConnector.authenticate("<SESSION_TOKEN>")
        
        val config = QuilttConnectorReconnectConfiguration(
            connectorId = "<CONNECTOR_ID>",
            appLauncherUrl = "<YOUR_HTTPS_APP_LINK>",
            connectionId = "<CONNECTION_ID>" // Required for reconnect
        )

        // Launch Reconnect Flow
        webView = quilttConnector.reconnect(
            config = config,
            onEvent = { eventType, metadata ->
                println("onEvent $eventType: $metadata")
            },
            onExitSuccess = { metadata ->
                println("onExitSuccess: $metadata")
                finish()
            },
            onExitAbort = { metadata ->
                println("onExitAbort: $metadata")
                finish()
            },
            onExitError = { metadata ->
                println("onExitError: $metadata")
                finish()
            }
        )

        connectorLayout.addView(webView)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
```

## Deep Link Configuration

For OAuth redirect flows to work properly, you must configure App Links in your Android app to handle the `appLauncherUrl` parameter.

### 1. Add Intent Filter to AndroidManifest.xml

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTop">
    
    <!-- Standard launch intent -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    
    <!-- App Link intent filter for OAuth redirects -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="your-app-domain.com" />
    </intent-filter>
</activity>
```

### 2. Create Digital Asset Links File

Host this file at `https://your-app-domain.com/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yourcompany.yourapp",
    "sha256_cert_fingerprints": ["YOUR_APP_SIGNING_CERTIFICATE_SHA256"]
  }
}]
```

### 3. Handle App Links in Your Activity

```kotlin
class MainActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Handle the incoming app link
        handleIntent(intent)
    }
    
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }
    
    private fun handleIntent(intent: Intent) {
        val appLinkAction = intent.action
        val appLinkData = intent.data
        
        if (Intent.ACTION_VIEW == appLinkAction && appLinkData != null) {
            println("Received App Link: $appLinkData")
            handleOAuthRedirect(appLinkData)
        }
    }
    
    private fun handleOAuthRedirect(uri: Uri) {
        // Handle OAuth redirect
        // Extract parameters and process the redirect
        val code = uri.getQueryParameter("code")
        val state = uri.getQueryParameter("state")
        
        // Process OAuth callback
    }
}
```

### 4. Custom URL Scheme Fallback (Optional)

Add a custom URL scheme as a fallback:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="your-app-scheme" />
</intent-filter>
```

## API Reference

### QuilttConnector

Main SDK class for managing connections.

#### Methods

```kotlin
fun authenticate(token: String)
```

Authenticates the SDK with a session token.

```kotlin
fun connect(
    config: QuilttConnectorConnectConfiguration,
    onEvent: ConnectorSDKOnEventCallback? = null,
    onExit: ConnectorSDKOnEventExitCallback? = null,
    onExitSuccess: ConnectorSDKOnExitSuccessCallback? = null,
    onExitAbort: ConnectorSDKOnExitAbortCallback? = null,
    onExitError: ConnectorSDKOnExitErrorCallback? = null
): QuilttConnectorWebView
```

Launches the connect flow and returns a configured WebView.

```kotlin
fun reconnect(
    config: QuilttConnectorReconnectConfiguration,
    onEvent: ConnectorSDKOnEventCallback? = null,
    onExit: ConnectorSDKOnEventExitCallback? = null,
    onExitSuccess: ConnectorSDKOnExitSuccessCallback? = null,
    onExitAbort: ConnectorSDKOnExitAbortCallback? = null,
    onExitError: ConnectorSDKOnExitErrorCallback? = null
): QuilttConnectorWebView
```

Launches the reconnect flow for existing connections.

### Configuration Types

#### QuilttConnectorConnectConfiguration

```kotlin
data class QuilttConnectorConnectConfiguration(
    val connectorId: String,
    val appLauncherUrl: String,
    val institution: String? = null // Optional institution filter
)
```

#### QuilttConnectorReconnectConfiguration

```kotlin
data class QuilttConnectorReconnectConfiguration(
    val connectorId: String,
    val appLauncherUrl: String,
    val connectionId: String // Required for reconnect
)
```

### Event Types

```kotlin
enum class ConnectorSDKEventType(val value: String) {
    Load("loaded"),
    ExitSuccess("exited.successful"),
    ExitAbort("exited.aborted"),
    ExitError("exited.errored")
}
```

### Callback Metadata

```kotlin
data class ConnectorSDKCallbackMetadata(
    val connectorId: String,
    val profileId: String?,
    val connectionId: String?
)
```

### Type Aliases

```kotlin
typealias ConnectorSDKOnEventCallback = (ConnectorSDKEventType, ConnectorSDKCallbackMetadata) -> Unit
typealias ConnectorSDKOnEventExitCallback = (ConnectorSDKEventType, ConnectorSDKCallbackMetadata) -> Unit
typealias ConnectorSDKOnExitSuccessCallback = (ConnectorSDKCallbackMetadata) -> Unit
typealias ConnectorSDKOnExitAbortCallback = (ConnectorSDKCallbackMetadata) -> Unit
typealias ConnectorSDKOnExitErrorCallback = (ConnectorSDKCallbackMetadata) -> Unit
```

## Troubleshooting

### Common Issues

**WebView shows white screen after authentication:**

- Verify your `appLauncherUrl` is properly configured
- Ensure App Links are set up correctly
- Check that your redirect URL uses HTTPS scheme
- Verify Digital Asset Links file is accessible

**App Link not opening app:**

- Confirm your `assetlinks.json` file is accessible at `/.well-known/assetlinks.json`
- Verify the package name and SHA256 fingerprint in the asset links file
- Test App Link with `adb shell am start -W -a android.intent.action.VIEW -d "https://your-domain.com/test"`

**OAuth redirect not working:**

- Ensure your app's App Link matches the `appLauncherUrl`
- Verify your domain's SSL certificate is valid
- Check that the redirect URL leads back to your app
- Test with Android's App Link verification: `adb shell pm verify-app-links --re-verify your.package.name`

**Callbacks not firing:**

- Ensure you're handling the OAuth redirect properly in your app
- Check that the redirect URL leads back to your app
- Verify the `connectorId` is correct
- Make sure WebView is properly added to the view hierarchy

**Build issues:**

- Ensure minimum SDK version is 26 or higher
- Check that you're using a compatible version of Android Gradle Plugin
- Verify ProGuard/R8 rules if using code obfuscation

### Debug Mode

Enable debug logging to troubleshoot issues:

```kotlin
// In debug builds, enable WebView debugging
if (BuildConfig.DEBUG) {
    WebView.setWebContentsDebuggingEnabled(true)
}
```

### Testing App Links

Test your App Links using ADB:

```bash
# Test App Link
adb shell am start \
  -W -a android.intent.action.VIEW \
  -d "https://your-app-domain.com/quiltt/oauth/test" \
  your.package.name

# Verify App Links
adb shell pm verify-app-links --re-verify your.package.name

# Check verification status
adb shell pm get-app-links your.package.name
```

## ProGuard/R8 Rules

If using code obfuscation, add these rules to your `proguard-rules.pro`:

```proguard
# Keep Quiltt SDK classes
-keep class app.quiltt.connector.** { *; }

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep callback interfaces
-keep interface app.quiltt.connector.ConnectorSDK** { *; }
```

## Requirements

- **Android API Level 26+** (Android 8.0)
- **Kotlin 1.8+** or **Java 8+**
- **Android Gradle Plugin 7.0+**

## Releases

This SDK is released automatically alongside all other Quiltt packages when a new version is published. Versions are unified across the entire monorepo.

**Latest Version:** [![Maven Central](https://img.shields.io/maven-central/v/io.quiltt/connector)](https://search.maven.org/artifact/io.quiltt/connector)

For release process details, see the [monorepo release documentation](../../RELEASING.md).

## Contributing

We welcome contributions! Please see the [contributing guidelines](../../CONTRIBUTING.md) and [Code of Conduct](../../CODE_OF_CONDUCT.md) for more information.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE.md) file for details.

---

This project is tested with [BrowserStack](https://www.browserstack.com).
