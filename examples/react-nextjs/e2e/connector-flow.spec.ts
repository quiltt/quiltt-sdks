import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const connectorId = process.env.NEXT_PUBLIC_CONNECTOR_ID ?? 'connector'
const iframeSelector = `iframe#quiltt--frame[data-quiltt-connector-id="${connectorId}"]`

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Text that appears on a Cloudflare interstitial instead of the page requested.
 *
 * The Mock bank OAuth pages sit behind Cloudflare bot protection, which
 * challenges browser automation. A challenge looks nothing like a failure of
 * ours, so it is worth naming when it happens.
 */
const CLOUDFLARE_MARKERS = [
  ['you have been blocked', 'block page'],
  ['attention required', 'block page'],
  ['cf-error-details', 'block page'],
  ['just a moment', 'challenge'],
  ['checking your browser', 'challenge'],
  ['enable javascript and cookies to continue', 'challenge'],
] as const

/**
 * Returns what kind of Cloudflare interstitial the popup is showing, or null.
 */
async function cloudflareInterstitial(popup: Page): Promise<string | null> {
  if (popup.isClosed()) return null

  const [title, body] = await Promise.all([
    popup.title().catch(() => ''),
    popup
      .locator('body')
      .innerText()
      .catch(() => ''),
  ])
  const haystack = `${title}\n${body}`.toLowerCase()

  const found = CLOUDFLARE_MARKERS.find(([marker]) => haystack.includes(marker))

  return found ? found[1] : null
}

/**
 * Polls until `done()` is true, failing as soon as Cloudflare steps in.
 *
 * Without this the test waits out its timeout and reports only that the popup
 * never closed, which says nothing about why. Detecting the interstitial instead
 * stops the run within a few hundred milliseconds and names the cause.
 *
 * @note Cloudflare bot fight mode breaks the server-side New Relic connector-oauth
 *   synthetic on the same host, so this is a known infrastructure problem rather
 *   than something specific to this test.
 */
async function waitForPopup(
  popup: Page,
  done: () => Promise<boolean>,
  description: string,
  timeout: number
): Promise<void> {
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    if (await done()) return

    const kind = await cloudflareInterstitial(popup)
    if (kind) {
      throw new Error(
        `Cloudflare returned a ${kind} at ${popup.url()} instead of the Mock bank page.\n\n` +
          `These hosts are behind Cloudflare bot protection, which challenges browser\n` +
          `automation, so retrying will not help. This is an infrastructure block rather\n` +
          `than a failure of the SDK or this example: the Mock bank OAuth hosts need a\n` +
          `Cloudflare WAF exception for CI traffic, or a mock host without bot fight mode.`
      )
    }

    await sleep(250)
  }

  throw new Error(
    `Timed out after ${timeout}ms waiting for ${description}. Popup is at ${popup.url()}.`
  )
}

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

    const iframe = page.locator(iframeSelector)
    await expect(iframe).toBeVisible()
  })

  test('should pass quiltt-theme-mode attribute on themed button', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Launch with Component' })
    await expect(button).toBeVisible()
    await expect(button).toHaveAttribute('quiltt-theme-mode', 'dark')
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
    await waitForPopup(
      popup,
      () => authorizeBtn.isVisible().catch(() => false),
      'the Mock bank authorize screen',
      20000
    )
    await authorizeBtn.click()

    // Wait for the popup to close, then let the connector process the callback.
    // The close depends on the bank redirecting back to the callback host.
    await waitForPopup(
      popup,
      () => Promise.resolve(popup.isClosed()),
      'the Mock bank popup to close',
      30000
    )
    await expect.poll(() => exitSuccessFired, { timeout: 30000 }).toBe(true)
  })
})
