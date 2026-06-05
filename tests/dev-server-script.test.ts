import { describe, expect, it } from 'vitest'

import package_json from '../package.json' with { type: 'json' }

describe('dev server script', () => {
  it('should listen on IPv4 and IPv6 interfaces for LAN device testing', () => {
    expect(package_json.scripts.dev).toContain('--host ::')
  })
})
