import { afterEach, describe, expect, it, vi } from 'vitest'

const original_app_url = process.env.APP_URL
const original_external_server = process.env.PLAYWRIGHT_EXTERNAL_SERVER

afterEach(() => {
  if (original_app_url === undefined) {
    delete process.env.APP_URL
  }
  else {
    process.env.APP_URL = original_app_url
  }

  if (original_external_server === undefined) {
    delete process.env.PLAYWRIGHT_EXTERNAL_SERVER
  }
  else {
    process.env.PLAYWRIGHT_EXTERNAL_SERVER = original_external_server
  }

  vi.resetModules()
})

describe('Playwright preview configuration', () => {
  it('uses an externally deployed preview without starting the local dev server', async () => {
    process.env.APP_URL = 'preview-123.dwselect.pages.dev'
    process.env.PLAYWRIGHT_EXTERNAL_SERVER = '1'

    const { default: config } = await import('../playwright.config')

    expect(config.use?.baseURL).toBe('https://preview-123.dwselect.pages.dev')
    expect(config.webServer).toBeUndefined()
  })
})
