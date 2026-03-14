import { by, expect as detoxExpect, device, element, waitFor, web } from 'detox'

const launchAppWithRetry = async () => {
  const platform = device.getPlatform()
  const maxAttempts = platform === 'android' ? 3 : 1
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (platform === 'ios') {
        await device.launchApp({
          newInstance: true,
          permissions: { notifications: 'YES' },
        })
      } else {
        await device.launchApp({ newInstance: true })
      }

      return
    } catch (error) {
      lastError = error

      if (attempt === maxAttempts) {
        throw error
      }

      await device.terminateApp()
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  throw lastError
}

describe('E2E Tests', () => {
  beforeAll(async () => {
    await launchAppWithRetry()
  }, 120000)

  it('should launch app without crashing', async () => {
    await device.takeScreenshot('app-launched')
  }, 30000)

  /**
   * Verifies that the pre-authenticated connector loads without auth screens.
   *
   * The session token is baked into the app at build time via
   * EXPO_PUBLIC_QUILTT_AUTH_TOKEN (set by CI before the prebuild step).
   * With a valid token, the connector skips the email/OTP auth flow and
   * should reach "Log in at Mock Bank" directly.
   */
  it('should load the connector and reach the Mock bank screen', async () => {
    // QuilttProvider keeps 2 dispatch queue items permanently pending (network
    // requests for token validation), which causes Detox to hang waiting for
    // app idle on iOS, and to lose the bridge connection on Android.
    // Disable sync so Detox interacts without waiting for idle, then call
    // launchApp() to re-establish the bridge if Android dropped it.
    await device.disableSynchronization()
    await device.launchApp()

    // Wait for the tab bar to be fully rendered before tapping
    await waitFor(element(by.text('Connector')))
      .toBeVisible()
      .withTimeout(15000)
    await element(by.text('Connector')).tap()

    // Wait for the quiltt-connector container to appear
    await waitFor(element(by.id('quiltt-connector')))
      .toBeVisible()
      .withTimeout(15000)

    // waitFor() only accepts native elements; poll expect() for the web element instead.
    // Waits up to 30 s for "Log in at Mock Bank" to appear in the WebView.
    const deadline = Date.now() + 30000
    while (Date.now() < deadline) {
      try {
        await detoxExpect(web.element(by.web.cssSelector('h2'))).toExist()
        break
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    await detoxExpect(web.element(by.web.cssSelector('h2'))).toHaveText('Log in at Mock Bank')

    await device.takeScreenshot('connector-mock-bank')
    await device.enableSynchronization()
  }, 90000)
})
