import { describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'

const project_root_url = new URL('../', import.meta.url)
const hook_path = new URL('../scripts/post-edit-hook.sh', import.meta.url).pathname

describe('post edit hook runner', () => {
  it('exists and is executable', () => {
    expect(existsSync(hook_path)).toBe(true)

    execFileSync('bash', ['-n', hook_path], {
      cwd: project_root_url,
    })
  })

  it('skips missing and non-lintable files silently', () => {
    for (const file_path of ['/tmp/dwselect-missing-file.md', new URL('../AGENTS.md', import.meta.url).pathname]) {
      const result = spawnSync('bash', [hook_path, file_path], {
        cwd: project_root_url.pathname,
        encoding: 'utf8',
      })

      expect(result.status).toBe(0)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
    }
  })

  it('fixes lintable files when ESLint can auto-fix them', () => {
    const temp_dir = mkdtempSync(join(project_root_url.pathname, 'tests/post-edit-hook-fixture-'))
    const file_path = join(temp_dir, 'fixable.ts')
    try {
      writeFileSync(file_path, 'export const value = "double";\n')

      const result = spawnSync('bash', [hook_path, file_path], {
        cwd: project_root_url.pathname,
        encoding: 'utf8',
      })

      expect(result.status).toBe(0)
      expect(result.stderr).toBe('')
      expect(readFileSync(file_path, 'utf8')).toBe("export const value = 'double'\n")
    }
    finally {
      rmSync(temp_dir, { recursive: true, force: true })
    }
  }, 15000)

  it('fails open with structured stderr when lint still fails', () => {
    const temp_dir = mkdtempSync(join(project_root_url.pathname, 'tests/post-edit-hook-fixture-'))
    const file_path = join(temp_dir, 'broken.ts')
    try {
      writeFileSync(file_path, 'const value = ;\n')

      const result = spawnSync('bash', [hook_path, file_path], {
        cwd: project_root_url.pathname,
        encoding: 'utf8',
      })

      expect(result.status).toBe(0)
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('[post-edit-hook]')
      expect(result.stderr).toContain('"status":"failed"')
      expect(result.stderr).toContain(file_path)
    }
    finally {
      rmSync(temp_dir, { recursive: true, force: true })
    }
  }, 15000)
})
