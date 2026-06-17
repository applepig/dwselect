import { describe, expect, it } from 'vitest'

import package_json from '../package.json' with { type: 'json' }
import nuxt_config from '../nuxt.config'

describe('dev server script', () => {
  it('should not bind to a specific host (Docker uses NUXT_HOST env var)', () => {
    expect(package_json.scripts.dev).toBe('nuxt dev')
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
})
