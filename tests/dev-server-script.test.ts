import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import package_json from '../package.json' with { type: 'json' }
import nuxt_config from '../nuxt.config'

describe('dev server script', () => {
  it('should not bind to a specific host (Docker uses NUXT_HOST env var)', () => {
    // dev script 前置 assert-in-container.mjs 守門（擋 host 直跑），故用 toContain 而非 toBe，
    // 但核心契約不變：跑的是 `nuxt dev` 且不帶 --host（host binding 交給 NUXT_HOST env）。
    expect(package_json.scripts.dev).toContain('nuxt dev')
    expect(package_json.scripts.dev).not.toContain('--host')
  })

  it('should read APP_URL for Vite allowed hosts without localhost fallback', () => {
    const allowed_hosts = nuxt_config.vite?.server?.allowedHosts
    expect(allowed_hosts).toBeDefined()
    expect(Array.isArray(allowed_hosts)).toBe(true)
    if (process.env.APP_URL) {
      expect(allowed_hosts).toContain(process.env.APP_URL)
    }
    expect(allowed_hosts).not.toContain('localhost')
    expect(allowed_hosts).not.toContain('127.0.0.1')
  })

  it('should load .env before Playwright reads APP_URL', () => {
    const playwright_config_source = readFileSync(
      new URL('../playwright.config.ts', import.meta.url),
      'utf8',
    )

    const load_env_position = playwright_config_source.indexOf('process.loadEnvFile()')
    const app_url_position = playwright_config_source.indexOf('process.env.APP_URL')

    expect(load_env_position).toBeGreaterThanOrEqual(0)
    expect(load_env_position).toBeLessThan(app_url_position)
  })
})
