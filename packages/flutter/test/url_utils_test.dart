import 'package:flutter_test/flutter_test.dart';
import 'package:quiltt_connector/url_utils.dart';

void main() {
  group('URLUtils.isEncoded', () {
    test('returns true for percent-20 encoded string', () {
      expect(URLUtils.isEncoded('hello%20world'), isTrue);
    });

    test('returns true for percent-encoded URL characters', () {
      expect(URLUtils.isEncoded('https%3A%2F%2Fexample.com'), isTrue);
    });

    test('returns true for lowercase hex digits', () {
      expect(URLUtils.isEncoded('hello%2fworld'), isTrue);
    });

    test('returns false for plain string with spaces', () {
      expect(URLUtils.isEncoded('hello world'), isFalse);
    });

    test('returns false for plain URL', () {
      expect(URLUtils.isEncoded('https://example.com'), isFalse);
    });

    test('returns false for empty string', () {
      expect(URLUtils.isEncoded(''), isFalse);
    });

    test('returns false for double-encoded string', () {
      // Double-encoded strings are not considered properly encoded
      expect(URLUtils.isEncoded('https%253A%252F%252Fexample.com'), isFalse);
    });
  });

  group('URLUtils.isDoubleEncoded', () {
    test('returns true for double-encoded string', () {
      expect(URLUtils.isDoubleEncoded('https%253A%252F%252Fexample.com'), isTrue);
    });

    test('returns false for single-encoded string', () {
      expect(URLUtils.isDoubleEncoded('https%3A%2F%2Fexample.com'), isFalse);
    });

    test('returns false for plain URL', () {
      expect(URLUtils.isDoubleEncoded('https://example.com'), isFalse);
    });

    test('returns false for empty string', () {
      expect(URLUtils.isDoubleEncoded(''), isFalse);
    });
  });

  group('URLUtils.smartEncodeURIComponent', () {
    test('returns empty string for empty input', () {
      expect(URLUtils.smartEncodeURIComponent(''), equals(''));
    });

    test('returns as-is when already encoded', () {
      const encoded = 'https%3A%2F%2Fexample.com%2Fcallback';
      expect(URLUtils.smartEncodeURIComponent(encoded), equals(encoded));
    });

    test('encodes an unencoded URL', () {
      const plain = 'https://example.com/callback?foo=bar baz';
      final result = URLUtils.smartEncodeURIComponent(plain);
      expect(result, isNot(equals(plain)));
      expect(result.contains(' '), isFalse);
    });
  });

  group('URLUtils.normalizeUrlEncoding', () {
    test('returns plain URL unchanged', () {
      const url = 'https://example.com';
      expect(URLUtils.normalizeUrlEncoding(url), equals(url));
    });

    test('returns single-encoded URL unchanged', () {
      const url = 'https%3A%2F%2Fexample.com';
      expect(URLUtils.normalizeUrlEncoding(url), equals(url));
    });

    test('decodes double-encoded URL exactly once', () {
      const doubleEncoded = 'https%253A%252F%252Fexample.com';
      final result = URLUtils.normalizeUrlEncoding(doubleEncoded);
      expect(result, equals('https%3A%2F%2Fexample.com'));
    });
  });
}
