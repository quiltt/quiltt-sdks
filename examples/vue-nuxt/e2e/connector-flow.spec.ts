import { expect, type Page, test } from '@playwright/test'

const connectorId = process.env.NUXT_PUBLIC_CONNECTOR_ID ?? '1h6bz4vo9z'
const iframeSelector = `iframe#quiltt--frame[data-quiltt-connector-id="${connectorId}"]`
const modalWrapperSelector = '.quiltt--frame-modal-wrapper'
const modalIframeSelector = `${modalWrapperSelector} ${iframeSelector}`

const dismissOpenConnectorModal = async (page: Page) => {
  const modalWrapper = page.locator(modalWrapperSelector)

  if ((await modalWrapper.count()) === 0) {
    return
  }

  await page.keyboard.press('Escape')
  await expect(modalWrapper).toHaveCount(0, { timeout: 5_000 })
}

test.describe('Connector Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: 'Launch with HTML' })).toBeVisible()
    await dismissOpenConnectorModal(page)
  })

  test('should launch connector with HTML launcher', async ({ page }) => {
    const button = page.getByRole('button', { name: 'Launch with HTML' })
    await button.click()

    await expect(page.locator(iframeSelector)).toBeVisible()
  })

  test('should launch connector with JavaScript launcher', async ({ page }) => {
    await dismissOpenConnectorModal(page)

    const button = page.getByRole('button', { name: 'Launch with Javascript' })
    await button.click()

    await expect(page.locator(iframeSelector)).toBeVisible()
  })

  test('should launch connector with QuilttButton component', async ({ page }) => {
    await dismissOpenConnectorModal(page)

    const button = page.getByRole('button', { name: 'Launch with Component' })
    await button.click()

    await expect(page.locator(iframeSelector)).toBeVisible()
  })

  test('should launch connector with custom button component', async ({ page }) => {
    await dismissOpenConnectorModal(page)

    const button = page.getByRole('button', { name: 'Launch with Custom Component' })
    await button.click()

    await expect(page.locator(iframeSelector)).toBeVisible()
  })

  test('should display connector in container components', async ({ page }) => {
    await expect(page.locator('.container-frame.quiltt-container')).toHaveCount(2)

    const containerIframes = page.locator(iframeSelector)
    await expect(containerIframes).toHaveCount(1, { timeout: 10000 })
    await expect(containerIframes).toBeVisible({ timeout: 10000 })
  })

  test('should allow only one modal connector at a time', async ({ page }) => {
    const htmlButton = page.getByRole('button', { name: 'Launch with HTML' })
    await htmlButton.click({ force: true })

    await expect(page.locator(iframeSelector)).toBeVisible()

    const jsButton = page.getByRole('button', { name: 'Launch with Javascript' })
    await jsButton.click({ force: true })

    await expect(page.locator(iframeSelector)).toHaveCount(1)
  })
})

test.describe('Connector: Full Bank Connection', () => {
  test('should complete a Mock bank connection end-to-end', async ({ page, context }) => {
    test.setTimeout(90000)

    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Launch with HTML' })).toBeVisible()

    await page.getByRole('button', { name: 'Launch with Custom Component' }).click()

    // Some environments render the connector without the modal wrapper class.
    // Prefer asserting modal visibility when present, but always gate on the iframe itself.
    const modalWrapper = page.locator(modalWrapperSelector)
    if ((await modalWrapper.count()) > 0) {
      await expect(modalWrapper).toBeVisible({ timeout: 10000 })
    }

    const activeIframeSelector =
      (await page.locator(modalIframeSelector).count()) > 0 ? modalIframeSelector : iframeSelector

    await expect(page.locator(activeIframeSelector).first()).toBeVisible({ timeout: 10000 })

    const frame = page.frameLocator(activeIframeSelector).first()

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

    // Wait for the popup to close, then let the connector process the callback.
    // In CI, console event capture can be flaky; modal dismissal is a stable success signal.
    await popup.waitForEvent('close', { timeout: 30000 })
    await expect(page.locator(modalWrapperSelector)).toHaveCount(0, { timeout: 30000 })
  })
})
