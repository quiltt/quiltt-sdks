/// <reference types="node" />
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const rootDir = dirname(fileURLToPath(import.meta.url))
const appPort = 5173

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    baseURL: `http://localhost:${appPort}`,
  },
  projects: [
    {
      name: 'e2e-chromium',
      testDir: './e2e',
      testMatch: '**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Use system Chrome with automation flags stripped to avoid Cloudflare bot detection
        // on the OAuth popup pages used by Mock bank
        channel: 'chrome',
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled'],
          ignoreDefaultArgs: ['--enable-automation'],
        },
      },
    },
  ],
  webServer: {
    command: 'pnpm run dev --host 127.0.0.1 --port 5173',
    cwd: rootDir,
    url: `http://localhost:${appPort}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
