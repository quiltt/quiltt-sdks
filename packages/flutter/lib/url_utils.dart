import 'package:flutter/foundation.dart';

/// Utility functions for handling URL encoding/decoding
class URLUtils {
  /// Checks if a string appears to be already URL encoded
  static bool isEncoded(String string) {
    if (string.isEmpty) return false;

    // Check for typical URL encoding patterns like %20, %3A, etc.
    final hasEncodedChars = RegExp(
      r'%[0-9A-F]{2}',
      caseSensitive: false,
    ).hasMatch(string);

    // Double-encoded strings (e.g. %253A) are not considered properly encoded —
    // normalizeUrlEncoding should be used to fix them first.
    final hasDoubleEncoding = RegExp(
      r'%25[0-9A-F]{2}',
      caseSensitive: false,
    ).hasMatch(string);

    return hasEncodedChars && !hasDoubleEncoding;
  }

  /// Smart URL encoder that ensures a string is encoded exactly once
  static String smartEncodeURIComponent(String string) {
    if (string.isEmpty) return string;

    // If it's already encoded, return as is
    if (isEncoded(string)) {
      debugPrint('URL already encoded, skipping encoding: $string');
      return string;
    }

    // Otherwise, encode it with error handling
    try {
      final encoded = Uri.encodeComponent(string);
      debugPrint('URL encoded from: $string to: $encoded');
      return encoded;
    } catch (error) {
      debugPrint('URL encoding failed for: $string, returning original');
      return string; // Fallback like iOS does
    }
  }

  /// Checks if a string appears to be double-encoded
  static bool isDoubleEncoded(String string) {
    if (string.isEmpty) return false;
    return RegExp(r'%25[0-9A-F]{2}', caseSensitive: false).hasMatch(string);
  }

  /// Normalizes a URL string by decoding it once if it appears to be double-encoded
  static String normalizeUrlEncoding(String urlString) {
    if (isDoubleEncoded(urlString)) {
      debugPrint('Detected double-encoded URL: $urlString');
      final normalized = Uri.decodeComponent(urlString);
      debugPrint('Normalized to: $normalized');
      return normalized;
    }
    return urlString;
  }
}
