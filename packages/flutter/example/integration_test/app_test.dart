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
}
