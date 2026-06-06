import { describe, expect, it } from 'vitest'

import package_json from '../package.json' with { type: 'json' }
import nuxt_config from '../nuxt.config'

describe('dev server script', () => {
  it('should listen on IPv4 and IPv6 interfaces for LAN device testing', () => {
    expect(package_json.scripts.dev).toContain('--host ::')
  })

  it('should allow the Traefik development host', () => {
    expect(nuxt_config.vite?.server?.allowedHosts).toContain('dwselect.toybox.local')
  })
})
