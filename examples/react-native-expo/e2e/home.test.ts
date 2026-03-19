import { by, device, element, waitFor } from 'detox'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForConnectorReady = async () => {
  await waitFor(element(by.id('quiltt-connector')))
    .toBeVisible()
    .withTimeout(120000)
}

const launchAppWithRetries = async () => {
  const platform = device.getPlatform()
  const attempts = 2
  let launchError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (platform === 'ios') {
        await device.launchApp({
          newInstance: true,
          launchArgs: {
            detoxEnableSynchronization: 0,
          },
          permissions: { notifications: 'YES' },
        })
      } else {
        await device.launchApp({
          newInstance: true,
          launchArgs: {
            detoxEnableSynchronization: 0,
          },
        })
      }

      launchError = undefined
      return
    } catch (error) {
      launchError = error

      if (attempt === attempts) {
        throw error
      }

      try {
        await device.terminateApp()
      } catch {
        // Ignore termination failures and retry launch.
      }

      await sleep(1500)
    }
  }

  if (launchError) {
    throw launchError
  }
}

describe('E2E Tests', () => {
  beforeAll(async () => {
    await launchAppWithRetries()

    try {
      // WebView-heavy screens can keep Detox sync busy on both platforms.
      await device.disableSynchronization()
    } catch {
      // Ignore if synchronization API is unavailable.
    }
  }, 180000)

  afterAll(async () => {
    try {
      await device.terminateApp()
    } catch {
      // Ignore shutdown failures in CI cleanup.
    }
  })

  it('should launch app without crashing', async () => {
    await device.takeScreenshot('app-launched')
  }, 60000)

  it('should reach connector ready state', async () => {
    try {
      await waitForConnectorReady()
    } catch {
      await launchAppWithRetries()
      await waitForConnectorReady()
    }

    await device.takeScreenshot('connector-ready-connector')
  }, 180000)
})
