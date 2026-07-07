import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'

const project_root_url = new URL('../', import.meta.url)

describe('lint quality gate config', () => {
  it('uses ESLint 9 through the project dependency graph', () => {
    const version = execFileSync('pnpm', ['exec', 'eslint', '--version'], {
      cwd: project_root_url,
      encoding: 'utf8',
    }).trim()

    expect(version).toMatch(/^v9\./)
  })
})
