import 'package:flutter_test/flutter_test.dart';
import 'package:quiltt_connector/configuration.dart';

void main() {
  group('QuilttConnectorConfiguration', () {
    test('stores connectorId and appLauncherUrl', () {
      final config = QuilttConnectorConfiguration(
        connectorId: 'my-connector',
        appLauncherUrl: 'https://example.com/callback',
      );
      expect(config.connectorId, equals('my-connector'));
      expect(config.appLauncherUrl, equals('https://example.com/callback'));
    });

    test('connectionId defaults to null', () {
      final config = QuilttConnectorConfiguration(
        connectorId: 'my-connector',
        appLauncherUrl: 'https://example.com/callback',
      );
      expect(config.connectionId, isNull);
    });

    test('institution defaults to null', () {
      final config = QuilttConnectorConfiguration(
        connectorId: 'my-connector',
        appLauncherUrl: 'https://example.com/callback',
      );
      expect(config.institution, isNull);
    });

    test('stores optional connectionId', () {
      final config = QuilttConnectorConfiguration(
        connectorId: 'my-connector',
        appLauncherUrl: 'https://example.com/callback',
        connectionId: 'conn-abc123',
      );
      expect(config.connectionId, equals('conn-abc123'));
    });

    test('stores optional institution', () {
      final config = QuilttConnectorConfiguration(
        connectorId: 'my-connector',
        appLauncherUrl: 'https://example.com/callback',
        institution: 'mx_bank_1',
      );
      expect(config.institution, equals('mx_bank_1'));
    });
  });
}
