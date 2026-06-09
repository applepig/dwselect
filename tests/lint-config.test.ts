import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const project_root_url = new URL('../', import.meta.url)
const package_json_url = new URL('../package.json', import.meta.url)
const eslint_config_url = new URL('../eslint.config.mjs', import.meta.url)

function readPackageJson() {
  return JSON.parse(readFileSync(package_json_url, 'utf8'))
}

describe('lint quality gate config', () => {
  it('declares lint, format, typecheck scripts', () => {
    const package_json = readPackageJson()

    expect(package_json.scripts).toMatchObject({
      prepare: 'nuxt prepare',
      lint: 'eslint . --max-warnings=0',
      'lint:file': 'eslint --fix --max-warnings=0',
      format: 'eslint . --fix',
      typecheck: 'nuxt typecheck',
    })
  })

  it('declares direct lint and typecheck dev dependencies', () => {
    const package_json = readPackageJson()

    expect(package_json.devDependencies).toHaveProperty('eslint')
    expect(package_json.devDependencies).toHaveProperty('@nuxt/eslint')
    expect(package_json.devDependencies).toHaveProperty('typescript')
    expect(package_json.devDependencies).toHaveProperty('vue-tsc')
  })

  it('provides a Nuxt-aware ESLint flat config with stylistic formatting', () => {
    expect(existsSync(eslint_config_url)).toBe(true)

    const config_source = readFileSync(eslint_config_url, 'utf8')

    expect(config_source).toContain('@nuxt/eslint')
    expect(config_source).toContain('stylistic')
    expect(config_source).toContain('quotes')
    expect(config_source).toContain('semi')
    expect(config_source).toContain('indent')
    expect(config_source).toContain('comma-dangle')
    expect(config_source).toContain('nuxt-ui-v4-compat')
  })

  it('uses ESLint 9 through the project dependency graph', () => {
    const version = execFileSync('pnpm', ['exec', 'eslint', '--version'], {
      cwd: project_root_url,
      encoding: 'utf8',
    }).trim()

    expect(version).toMatch(/^v9\./)
  })
})
