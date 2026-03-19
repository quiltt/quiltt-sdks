import { expect, test } from '@playwright/test'

// The Capacitor React SDK renders the inline connector with title="Quiltt Connector"
const iframeSelector = 'iframe[title="Quiltt Connector"]'

test.describe('Connector: Full Bank Connection', () => {
  test('should complete a Mock bank connection end-to-end', async ({ page, context }) => {
    test.setTimeout(90000)

    await page.goto('/')
    await expect(page.locator(iframeSelector)).toBeVisible({ timeout: 15000 })

    const frame = page.frameLocator(iframeSelector)

    // --- Authenticate: email ---
    await expect(frame.getByText("What's your email?")).toBeVisible({ timeout: 15000 })
    const emailInput = frame.locator('input[type="email"]')
    await emailInput.fill('technology@quiltt.io')
    await emailInput.press('Enter')

    // --- Authenticate: OTP (sandbox always accepts 000000) ---
    await expect(frame.getByText('Enter your passcode')).toBeVisible({ timeout: 10000 })
    const otpInput = frame.getByRole('textbox')
    await otpInput.fill('000000')
    await otpInput.press('Enter')

    // --- Mock bank login screen ---
    // This connector (1h6bz4vo9z) is pre-configured for Mock Bank and skips institution search
    await expect(frame.getByRole('heading', { name: 'Log in at Mock Bank' })).toBeVisible({
      timeout: 15000,
    })

    // Clicking "Continue to login" opens an OAuth popup window
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      frame.getByRole('button', { name: 'Continue to login' }).click(),
    ])

    // The Mock bank OAuth popup shows an Authorize button; click it to approve the connection
    await popup.waitForLoadState('load').catch(() => {})
    await popup
      .getByRole('button', { name: 'Authorize' })
      .click({ timeout: 15000 })
      .catch(() => {})

    // Wait for the popup to close, then assert the inline connector reports success via the event list
    await popup.waitForEvent('close', { timeout: 30000 })
    await expect(page.getByText(/Inline ExitSuccess:/)).toBeVisible({ timeout: 30000 })
  })
})
