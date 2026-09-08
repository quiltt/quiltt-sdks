import 'package:flutter_test/flutter_test.dart';
import 'package:quiltt_connector/event.dart';
import 'package:quiltt_connector/src/platform/oauth_utils.dart';

void main() {
  group('handleOAuthUrl', () {
    test(
      'reports failure instead of throwing when the URL has a malformed escape sequence',
      () async {
        const malformedUrl =
            'https://oauth.test.com/callback?code=abc%2520%ZZxyz';

        ConnectorSDKOnExitErrorCallback? captured;

        await expectLater(
          handleOAuthUrl(
            malformedUrl,
            'test-connector',
            onExitError: (event) => captured = event,
          ),
          completes,
        );

        expect(captured, isNotNull);
        expect(captured!.eventMetadata.connectorId, equals('test-connector'));
      },
    );
  });

  group('fireOAuthFailure', () {
    test('invokes all callbacks', () {
      ConnectorSDKOnEventCallback? capturedEvent;
      ConnectorSDKOnEventExitCallback? capturedExit;
      ConnectorSDKOnExitErrorCallback? capturedExitError;

      fireOAuthFailure(
        'test-connector',
        onEvent: (event) => capturedEvent = event,
        onExit: (event) => capturedExit = event,
        onExitError: (event) => capturedExitError = event,
      );

      expect(capturedEvent, isNotNull);
      expect(capturedEvent!.type, equals(ConnectorSDKEventType.exitErrored));
      expect(
        capturedEvent!.eventMetadata.connectorId,
        equals('test-connector'),
      );

      expect(capturedExit, isNotNull);
      expect(capturedExit!.type, equals(ConnectorSDKEventType.exitErrored));
      expect(capturedExit!.eventMetadata.connectorId, equals('test-connector'));

      expect(capturedExitError, isNotNull);
      expect(
        capturedExitError!.eventMetadata.connectorId,
        equals('test-connector'),
      );
    });

    test('does not throw when callbacks are null', () {
      expect(() => fireOAuthFailure('test-connector'), returnsNormally);
    });

    test('metadata has null profileId and connectionId', () {
      ConnectorSDKOnExitErrorCallback? captured;

      fireOAuthFailure(
        'test-connector',
        onExitError: (event) => captured = event,
      );

      expect(captured!.eventMetadata.profileId, isNull);
      expect(captured!.eventMetadata.connectionId, isNull);
    });
  });
}
