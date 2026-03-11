import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:example/main.dart';

void main() {
  testWidgets('home screen renders title', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.text('Quiltt Connector Home'), findsOneWidget);
  });

  testWidgets('home screen shows initial connection ID label',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.text('Connection ID: No connection Id yet'), findsOneWidget);
  });

  testWidgets('home screen renders an AppBar', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.byType(AppBar), findsOneWidget);
  });

  testWidgets('home screen renders a FloatingActionButton',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    expect(find.byType(FloatingActionButton), findsOneWidget);
  });

  testWidgets('FloatingActionButton has an onPressed callback',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    final fab =
        tester.widget<FloatingActionButton>(find.byType(FloatingActionButton));
    expect(fab.onPressed, isNotNull);
  });
}
