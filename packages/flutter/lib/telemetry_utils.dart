import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';

/// Returns the SDK User-Agent string in the format `Quiltt/<version> (<platform>)`.
String getSDKAgent(String sdkVersion, String platformInfo) {
  return 'Quiltt/$sdkVersion ($platformInfo)';
}

/// Returns a human-readable string describing the current runtime platform and OS version.
String getRuntimePlatformInfo() {
  if (kIsWeb) {
    return 'Flutter Web';
  }

  final targetPlatform = switch (defaultTargetPlatform) {
    TargetPlatform.android => 'Flutter Android',
    TargetPlatform.iOS => 'Flutter iOS',
    TargetPlatform.macOS => 'Flutter macOS',
    TargetPlatform.windows => 'Flutter Windows',
    TargetPlatform.linux => 'Flutter Linux',
    TargetPlatform.fuchsia => 'Flutter Fuchsia',
  };

  final operatingSystemVersion = _normalizeWhitespace(
    Platform.operatingSystemVersion,
  );
  final dartVersion = _extractDartVersion(Platform.version);

  return '$targetPlatform; OS $operatingSystemVersion; Dart/$dartVersion';
}

String _extractDartVersion(String version) {
  final firstToken = version.trim().split(RegExp(r'\s+')).first;
  return firstToken.isEmpty ? 'Unknown' : firstToken;
}

String _normalizeWhitespace(String value) {
  return value.replaceAll(RegExp(r'\s+'), ' ').trim();
}
