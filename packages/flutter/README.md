# Quiltt Flutter SDK

[![pub package](https://img.shields.io/pub/v/quiltt_connector.svg)](https://pub.dev/packages/quiltt_connector)
[![CI](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-flutter.yml/badge.svg?branch=main)](https://github.com/quiltt/quiltt-sdks/actions/workflows/ci-flutter.yml)

The Quiltt Flutter SDK provides a Widget for integrating [Quiltt Connector](https://quiltt.dev/connector) into your Flutter app.

Note that this SDK currently supports iOS and Android. We welcome contributions to add support for other Flutter platforms!

See the official guide at: [https://quiltt.dev/connector/sdk/flutter](https://quiltt.dev/connector/sdk/flutter)

## Installation

Add the package to your project:

```sh
flutter pub add quiltt_connector
```

## Usage

Add `quiltt_connector` as a [dependency in your pubspec.yaml file](https://pub.dev/packages/quiltt_connector/install).

```dart
import 'package:quiltt_connector/quiltt_connector.dart';
import 'package:quiltt_connector/configuration.dart';

class _Example extends State {
  connect() {
    QuilttConnectorConfiguration config = QuilttConnectorConfiguration(
      connectorId: "<CONNECTOR_ID>",
      appLauncherUrl: "<YOUR_HTTPS_APP_LINK>"
    );

    QuilttConnector quilttConnector = QuilttConnector();

    // Authenticate profile
    quilttConnector.authenticate(token);

    // Launch Connect Flow
    quilttConnector.connect(
      context,
      config,

      // Handle Callbacks
      onEvent: (event) {
        debugPrint("onEvent ${event.type}: ${event.eventMetadata}");
      },
      onExitSuccess: (event) {
        debugPrint("onExitSuccess: ${event.eventMetadata}");
        _setConnectionId(event.eventMetadata.connectionId!);
      },
      onExitAbort: (event) {
        debugPrint("onExitAbort: ${event.eventMetadata}");
      },
      onExitError: (event) {
        debugPrint("onExitError: ${event.eventMetadata}");
      }
    );
  }

  reconnect() {
    QuilttConnectorConfiguration config = QuilttConnectorConfiguration(
      connectorId: "<CONNECTOR_ID>",
      connectionId: "<CONNECTION_ID>", // To support the Reconnect Flow
      appLauncherUrl: "<YOUR_HTTPS_APP_LINK>"
    );

    QuilttConnector quilttConnector = QuilttConnector();

    // Authenticate profile
    quilttConnector.authenticate(token);

    // Launch Reconnect Flow
    quilttConnector.reconnect(
      context,
      config,

      // Handle Callbacks
      onEvent: (event) {
        debugPrint("onEvent: ${event.eventMetadata}");
      },
      onExit: (event) {
        debugPrint("onExit: ${event.eventMetadata}");
      },
      onExitSuccess: (event) {
        debugPrint("onExitSuccess: ${event.eventMetadata}");
        _setConnectionId(event.eventMetadata.connectionId!);
      },
      onExitAbort: (event) {
        debugPrint("onExitAbort: ${event.eventMetadata}");
      },
      onExitError: (event) {
        debugPrint("onExitError: ${event.eventMetadata}");
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container();
  }
}
```

## Deep Link Configuration

For OAuth redirect flows to work properly, you must configure deep links in your Flutter app to handle the `appLauncherUrl` parameter.

### iOS Configuration

Add the following URL scheme to your `ios/Runner/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>quiltt.connector</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>your-app-scheme</string>
    </array>
  </dict>
</array>
```

### Android Configuration

Add an intent filter to your `android/app/src/main/AndroidManifest.xml`:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTop"
    android:theme="@style/LaunchTheme">
    
    <!-- Standard Flutter activity configuration -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
    </intent-filter>
    
    <!-- Deep link intent filter for OAuth redirects -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https"
              android:host="your-app-domain.com" />
    </intent-filter>
</activity>
```

### Flutter Deep Link Handling

Use a package like `app_links` or `uni_links` to handle incoming deep links:

```dart
import 'package:app_links/app_links.dart';

class _MyAppState extends State<MyApp> {
  late AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  void _initDeepLinks() async {
    _appLinks = AppLinks();
    
    // Listen for incoming links when app is already running
    _linkSubscription = _appLinks.uriLinkStream.listen((uri) {
      debugPrint('Deep link received: $uri');
      _handleDeepLink(uri);
    });

    // Handle links when app is launched from a deep link
    final uri = await _appLinks.getInitialLink();
    if (uri != null) {
      debugPrint('App launched from deep link: $uri');
      _handleDeepLink(uri);
    }
  }

  void _handleDeepLink(Uri uri) {
    // Handle the OAuth redirect here
    // Extract any necessary parameters from the URI
    // Navigate to appropriate screen or trigger callbacks
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }
}
```

## Troubleshooting

### Common Issues

**WebView shows white screen after authentication:**

- Verify your `appLauncherUrl` is properly configured
- Ensure deep link handling is set up correctly
- Check that your redirect URL uses HTTPS scheme

**OAuth redirect not working:**

- Confirm your app's URL scheme matches the `appLauncherUrl`
- Verify deep link intent filters are correctly configured
- Test deep link functionality with `adb shell am start -W -a android.intent.action.VIEW -d "https://example.com/callback" your.package.name`

**Callbacks not firing:**

- Ensure you're handling the OAuth redirect properly in your app
- Check that the redirect URL leads back to your app
- Verify the `connectorId` is correct

### Debug Mode

Enable debug logging to troubleshoot issues:

```dart
import 'package:flutter/foundation.dart';

// In debug mode, the SDK will print detailed logs
if (kDebugMode) {
  debugPrint('Quiltt SDK running in debug mode');
}
```

## Releases

This SDK is released automatically alongside all other Quiltt packages when a new version is published. Versions are unified across the entire monorepo.

**Latest Version:** [![pub package](https://img.shields.io/pub/v/quiltt_connector.svg)](https://pub.dev/packages/quiltt_connector)

For release process details, see the [monorepo release documentation](../../RELEASING.md).

## Contributing

We welcome contributions! Please see the [contributing guidelines](../../CONTRIBUTING.md) and [Code of Conduct](../../CODE_OF_CONDUCT.md) for more information.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE.md) file for details.
