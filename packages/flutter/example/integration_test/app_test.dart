import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:example/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Quiltt Connector integration tests', () {
    testWidgets('app launches and renders home screen',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      expect(find.text('Quiltt Connector Home'), findsOneWidget);
      expect(find.text('Connection ID: No connection Id yet'), findsOneWidget);
    });

    testWidgets('app bar is visible with correct title',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      expect(find.byType(AppBar), findsOneWidget);
      expect(find.text('Quiltt Connector Home'), findsOneWidget);
    });

    testWidgets('floating action button is visible and tappable',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      final fab = find.byType(FloatingActionButton);
      expect(fab, findsOneWidget);
      expect(tester.widget<FloatingActionButton>(fab).onPressed, isNotNull);
    });

    testWidgets('tapping FAB does not crash the app',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Tapping the FAB calls _launchConnector, which creates a QuilttConnector
      // with connectorId: 1h6bz4vo9z and navigates to the connector screen.
      await tester.tap(find.byType(FloatingActionButton));

      // pumpAndSettle may time out waiting for the WebView, so pump a fixed
      // duration to let navigation complete without loading a real network URL.
      await tester.pump(const Duration(seconds: 2));

      // App must still be alive - the widget tree should contain at least one Scaffold.
      expect(find.byType(Scaffold), findsWidgets);
    });
  });

  group('Connector: Full bank connection', () {
    /// Verifies the connector launches with a real session token and the app
    /// survives the WebView loading a live connector URL.
    ///
    /// Run with a real token by passing --dart-define arguments:
    ///   flutter test integration_test/app_test.dart \
    ///     --dart-define=QUILTT_SESSION_TOKEN=<token> \
    ///     --dart-define=QUILTT_CONNECTOR_ID=1h6bz4vo9z
    ///
    /// When QUILTT_SESSION_TOKEN is empty (the default) the test still runs but
    /// the connector will show its own auth screens instead of the bank screen.
    testWidgets('connector launches and app survives WebView initialization',
        (WidgetTester tester) async {
      app.main();
      await tester.pumpAndSettle();

      await tester.tap(find.byType(FloatingActionButton));

      // Allow time for the connector WebView to initialize and begin loading.
      // The platform WebView runs natively so Flutter's pump only drives the
      // Dart widget layer; the actual page load happens outside the test pump.
      await tester.pump(const Duration(seconds: 20));

      // App must still be running — no crash during connector initialization.
      expect(find.byType(Scaffold), findsWidgets);
    });
  });
}
