import { expect, test } from '@playwright/test'

const connectorId = process.env.NEXT_PUBLIC_CONNECTOR_ID ?? 'connector'
const iframeSelector = `iframe#quiltt--frame[data-quiltt-connector-id="${connectorId}"]`

test.describe('Connector Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    // Wait for script to become interactive
    // This is almost instantaneous locally but takes time in CI
    await page.waitForTimeout(1250)
  })

  test('should launch connector with HTML launcher', async ({ page }) => {
    const iframe = page.locator(iframeSelector)

    const button = page.getByRole('button', { name: 'Launch with HTML' })
    await button.click()

    // TODO: Add more assertions about iframe content when needed
    // const frame = page.frameLocator('iframe#quiltt--frame')
    // await expect(frame.locator('text=Stitching finance together')).toBeVisible()
    await expect(iframe).toBeVisible()
  })

  test('should launch connector with JavaScript launcher', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Launch with Javascript' })
    await button.click()

    await expect(page.locator(iframeSelector)).toBeVisible()
  })

  test('should launch connector with QuilttButton component', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Launch with Component' })
    await button.click()

    await expect(page.locator(iframeSelector)).toBeVisible()
  })

  test('should launch connector with custom button component', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Launch with Custom Component' })
    await button.click()

    await expect(page.locator(iframeSelector)).toBeVisible()
  })

  test('should display connector in container components', async ({ page }) => {
    // Verify container elements exist
    const containers = page.locator(`[quiltt-container="${connectorId}"]`)
    await expect(containers).toHaveCount(2)

    // Container iframes are rendered at page level with the connector ID, not inside the container elements
    // The SDK creates one iframe per unique connector ID for inline/container mode
    const containerIframes = page.locator(iframeSelector)
    await expect(containerIframes).toHaveCount(1, { timeout: 10000 })
    await expect(containerIframes).toBeVisible({ timeout: 10000 })
  })

  test('should allow only one modal connector at a time', async ({ page }) => {
    const htmlButton = page.getByRole('button', { name: 'Launch with HTML' })
    await htmlButton.click()

    await expect(page.locator(iframeSelector)).toBeVisible()

    // Force click to bypass modal overlay
    const jsButton = page.getByRole('button', { name: 'Launch with Javascript' })
    await jsButton.click({ force: true })

    await expect(page.locator(iframeSelector)).toHaveCount(1)
  })
})

test.describe('Connector: Full Bank Connection', () => {
  test('should complete a Mock bank connection end-to-end', async ({ page, context }) => {
    test.setTimeout(90000)

    await page.goto('/')
    await page.waitForTimeout(1250)

    // TestCustomButton logs 'onExitSuccess' to the console via its onExitSuccess callback
    let exitSuccessFired = false
    page.on('console', (msg) => {
      if (msg.text() === 'onExitSuccess') exitSuccessFired = true
    })

    await page.getByRole('button', { name: 'Launch with Custom Component' }).click()

    const iframe = page.locator(iframeSelector)
    await expect(iframe).toBeVisible({ timeout: 10000 })

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
    const authorizeBtn = popup.getByRole('button', { name: 'Authorize' })
    await expect(authorizeBtn).toBeVisible({ timeout: 20000 })
    await authorizeBtn.click()

    // Wait for the popup to close, then let the connector process the callback
    await popup.waitForEvent('close', { timeout: 30000 })
    await expect.poll(() => exitSuccessFired, { timeout: 30000 }).toBe(true)
  })
})
