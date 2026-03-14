import { expect, test } from '@playwright/test'

const connectorId = process.env.VITE_QUILTT_CONNECTOR_ID ?? 'connector'
const connectorOrigin = `https://${connectorId}.quiltt.app`

test('renders Quiltt button and inline connector', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.ok()).toBeTruthy()
  await expect(page).toHaveTitle(/Quiltt Capacitor Vue Example/)

  const connectorFrame = page.locator('iframe.quiltt-connector')
  await expect(connectorFrame).toHaveCount(1)
  await expect(connectorFrame).toHaveAttribute('src', /^https:\/\/[^/]+\.quiltt\.app\/?/)
  await expect(connectorFrame).toHaveAttribute('src', /(?:\?|&)embed_location=(?:[^&]+)(?:&|$)/)
  await expect(connectorFrame).toHaveAttribute('src', /(?:\?|&)mode=INLINE(?:&|$)/)

  await page.evaluate((origin) => {
    window.dispatchEvent(
      new MessageEvent('message', {
        origin,
        data: {
          source: 'quiltt',
          type: 'Load',
        },
      })
    )
  }, connectorOrigin)

  await expect(page.getByText('Load').first()).toBeVisible()
})
