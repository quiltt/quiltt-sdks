#!/usr/bin/env node
/**
 * Issue a Quiltt session token for local integration testing.
 *
 * Usage:
 *   QUILTT_API_KEY_SECRET=qltt_... node scripts/issue-token.mjs
 *
 * Or source a .env.local file first:
 *   export $(grep -v '^#' .env.local | xargs) && node scripts/issue-token.mjs
 */

const apiKey = process.env.QUILTT_API_KEY_SECRET
const userId = process.env.QUILTT_USER_ID ?? 'p_132giKejS3KH0xDyySC0d5'
const connectorId = process.env.QUILTT_CONNECTOR_ID ?? '1h6bz4vo9z'

if (!apiKey) {
  console.error('Error: QUILTT_API_KEY_SECRET environment variable is required')
  process.exit(1)
}

const response = await fetch('https://auth.quiltt.io/v1/users/sessions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ userId }),
})

if (!response.ok) {
  const body = await response.text()
  console.error(`Error: ${response.status} ${response.statusText}\n${body}`)
  process.exit(1)
}

const { token } = await response.json()

if (!token) {
  console.error('Error: No token in response')
  process.exit(1)
}

console.log(`Token: ${token}`)
console.log()
console.log('Platform usage:')
console.log()
console.log('  # React Native (set before expo prebuild)')
console.log(`  EXPO_PUBLIC_QUILTT_AUTH_TOKEN='${token}' pnpm run ios`)
console.log()
console.log('  # Flutter')
console.log(
  `  flutter test integration_test/app_test.dart --dart-define=QUILTT_SESSION_TOKEN='${token}' --dart-define=QUILTT_CONNECTOR_ID=${connectorId}`
)
console.log()
console.log('  # Android (pass to instrumentation runner)')
console.log(
  "  ./gradlew app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.QUILTT_API_KEY_SECRET='$QUILTT_API_KEY_SECRET'"
)
console.log()
console.log('  # iOS (set before xcodebuild or use launchEnvironment in XCUITest)')
console.log(`  QUILTT_SESSION_TOKEN='${token}' xcodebuild test ...`)
