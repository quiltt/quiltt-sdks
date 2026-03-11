import 'package:flutter_test/flutter_test.dart';
import 'package:quiltt_connector/event.dart';

void main() {
  group('ConnectorSDKCallbackMetadata', () {
    test('stores all fields', () {
      final metadata = ConnectorSDKCallbackMetadata(
        connectorId: 'connector-1',
        profileId: 'profile-1',
        connectionId: 'conn-1',
      );
      expect(metadata.connectorId, equals('connector-1'));
      expect(metadata.profileId, equals('profile-1'));
      expect(metadata.connectionId, equals('conn-1'));
    });

    test('optional fields default to null', () {
      final metadata = ConnectorSDKCallbackMetadata(connectorId: 'connector-1');
      expect(metadata.connectorId, equals('connector-1'));
      expect(metadata.profileId, isNull);
      expect(metadata.connectionId, isNull);
    });
  });

  group('ConnectorSDKOnEventCallback', () {
    test('stores type and eventMetadata', () {
      final metadata = ConnectorSDKCallbackMetadata(connectorId: 'c');
      final event = ConnectorSDKOnEventCallback(
        type: 'load',
        eventMetadata: metadata,
      );
      expect(event.type, equals('load'));
      expect(event.eventMetadata, same(metadata));
    });
  });

  group('ConnectorSDKOnEventExitCallback', () {
    test('stores type and eventMetadata', () {
      final metadata = ConnectorSDKCallbackMetadata(connectorId: 'c');
      final event = ConnectorSDKOnEventExitCallback(
        type: 'exitsuccess',
        eventMetadata: metadata,
      );
      expect(event.type, equals('exitsuccess'));
      expect(event.eventMetadata, same(metadata));
    });
  });

  group('ConnectorSDKOnExitSuccessCallback', () {
    test('stores eventMetadata', () {
      final metadata = ConnectorSDKCallbackMetadata(connectorId: 'c');
      final event = ConnectorSDKOnExitSuccessCallback(eventMetadata: metadata);
      expect(event.eventMetadata, same(metadata));
    });
  });

  group('ConnectorSDKOnExitAbortCallback', () {
    test('stores eventMetadata', () {
      final metadata = ConnectorSDKCallbackMetadata(connectorId: 'c');
      final event = ConnectorSDKOnExitAbortCallback(eventMetadata: metadata);
      expect(event.eventMetadata, same(metadata));
    });
  });

  group('ConnectorSDKOnExitErrorCallback', () {
    test('stores eventMetadata', () {
      final metadata = ConnectorSDKCallbackMetadata(connectorId: 'c');
      final event = ConnectorSDKOnExitErrorCallback(eventMetadata: metadata);
      expect(event.eventMetadata, same(metadata));
    });
  });
}
