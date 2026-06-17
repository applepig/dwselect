import { defineConfig, devices } from '@playwright/test'

const app_url = process.env.APP_URL
if (!app_url) {
  throw new Error('APP_URL 環境變數未設定——請在 .env 設定，例如 APP_URL=dwselect.toybox.local')
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `https://${app_url}`,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    url: `https://${app_url}`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Mini'],
        browserName: 'chromium',
        viewport: { width: 900, height: 1100 },
      },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
})
