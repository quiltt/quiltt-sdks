import 'package:flutter_test/flutter_test.dart';
import 'package:quiltt_connector/quiltt_sdk_version.dart';

void main() {
  group('quilttSdkVersion', () {
    test('is not empty', () {
      expect(quilttSdkVersion, isNotEmpty);
    });

    test('follows semver X.Y.Z format', () {
      final semverPattern = RegExp(r'^\d+\.\d+\.\d+$');
      expect(
        semverPattern.hasMatch(quilttSdkVersion),
        isTrue,
        reason: "SDK version '$quilttSdkVersion' should follow semver X.Y.Z format",
      );
    });

    test('does not contain spaces', () {
      expect(quilttSdkVersion.contains(' '), isFalse);
    });
  });
}
