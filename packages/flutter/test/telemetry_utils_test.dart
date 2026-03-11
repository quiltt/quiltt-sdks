import 'package:flutter_test/flutter_test.dart';
import 'package:quiltt_connector/telemetry_utils.dart';

void main() {
  group('getSDKAgent', () {
    test('formats like JS packages', () {
      expect(getSDKAgent('5.2.0', 'Flutter'), equals('Quiltt/5.2.0 (Flutter)'));
    });
  });

  group('getRuntimePlatformInfo', () {
    test('contains expected parts', () {
      final platformInfo = getRuntimePlatformInfo();

      expect(platformInfo, isNotEmpty);
      expect(platformInfo.startsWith('Flutter '), isTrue);
      expect(platformInfo.contains('; OS '), isTrue);
      expect(platformInfo.contains('; Dart/'), isTrue);
    });
  });
}
