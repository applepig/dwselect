import { afterEach, describe, expect, it, vi } from 'vitest'

const original_app_url = process.env.APP_URL
const original_external_server = process.env.PLAYWRIGHT_EXTERNAL_SERVER
const original_base_url = process.env.PLAYWRIGHT_BASE_URL

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

  if (original_base_url === undefined) {
    delete process.env.PLAYWRIGHT_BASE_URL
  }
  else {
    process.env.PLAYWRIGHT_BASE_URL = original_base_url
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

  it('uses a CI static-preview URL without starting the local dev server', async () => {
    process.env.APP_URL = 'dwselect.applepig.net'
    process.env.PLAYWRIGHT_EXTERNAL_SERVER = '1'
    process.env.PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:4173'

    const { default: config } = await import('../playwright.config')

    expect(config.use?.baseURL).toBe('http://127.0.0.1:4173')
    expect(config.webServer).toBeUndefined()
  })
})
