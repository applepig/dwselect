import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('Nuxt UI app.config theme baseline', () => {
  const app_config_source = readFileSync(
    new URL('../app.config.ts', import.meta.url),
    'utf8',
  )

  it('should centralise Nuxt UI theme via defineAppConfig', () => {
    expect(app_config_source).toContain('defineAppConfig(')
    expect(app_config_source).toContain('ui:')
    expect(app_config_source).toContain('colors:')
  })

  it('should map primary and neutral colour aliases to Tailwind palette names', () => {
    expect(app_config_source).toMatch(/primary:\s*'orange'/)
    expect(app_config_source).toMatch(/neutral:\s*'stone'/)
  })

  it('should preserve the variables.css --ui-primary override on --dw-accent', () => {
    const variables_css = readFileSync(
      new URL('../app/assets/styles/variables.css', import.meta.url),
      'utf8',
    )

    expect(variables_css).toContain('--ui-primary: var(--dw-accent)')
    expect(variables_css).toContain('--dw-accent: #ec7a2b')
    expect(variables_css).toContain('--dw-accent: #ff8a3d')
  })
})
