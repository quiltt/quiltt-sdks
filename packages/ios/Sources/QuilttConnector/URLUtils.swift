import Foundation

/// Utility functions for handling URL encoding/decoding
class URLUtils {
    /**
     Checks if a string appears to be already URL encoded
     - Parameter string: The string to check
     - Returns: Boolean indicating if the string appears to be URL encoded
     */
    static func isEncoded(_ string: String) -> Bool {
        // Check for typical URL encoding patterns like %20, %3A, etc.
        let hasEncodedChars = string.range(of: "%[0-9A-F]{2}", options: [.regularExpression, .caseInsensitive]) != nil

        // Double-encoded strings (e.g. %253A) are not considered properly encoded —
        // normalizeUrlEncoding should be used to fix them first.
        let hasDoubleEncoding =
            string.range(of: "%25[0-9A-F]{2}", options: [.regularExpression, .caseInsensitive]) != nil

        return hasEncodedChars && !hasDoubleEncoding
    }

    /**
     Smart URL encoder that ensures a string is encoded exactly once
     - Parameter string: The string to encode
     - Returns: A properly URL encoded string
     */
    static func smartEncodeURIComponent(_ string: String) -> String {
        if string.isEmpty { return string }

        // If it's already encoded, return as is
        if isEncoded(string) {
            print("URL already encoded, skipping encoding: \(string)")
            return string
        }

        // Otherwise, encode it
        guard let encoded = string.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)
        else {
            return string
        }
        print("URL encoded from: \(string) to: \(encoded)")
        return encoded
    }

    /**
     Checks if a string appears to be double-encoded
     - Parameter string: The string to check
     - Returns: Boolean indicating if the string appears to be double-encoded
     */
    static func isDoubleEncoded(_ string: String) -> Bool {
        if string.isEmpty { return false }
        return string.range(of: "%25[0-9A-F]{2}", options: [.regularExpression, .caseInsensitive]) != nil
    }

    /**
     Normalizes a URL string by decoding it once if it appears to be double-encoded
     - Parameter urlString: The URL string to normalize
     - Returns: A normalized URL string
     */
    static func normalizeUrlEncoding(_ urlString: String) -> String {
        if isDoubleEncoded(urlString) {
            print("Detected double-encoded URL: \(urlString)")
            let normalized = urlString.removingPercentEncoding ?? urlString
            print("Normalized to: \(normalized)")
            return normalized
        }
        return urlString
    }
}
