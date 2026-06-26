import { afterEach, describe, expect, it } from 'vitest'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import package_json from '../package.json' with { type: 'json' }
import nuxt_config from '../nuxt.config'

const project_root = new URL('..', import.meta.url).pathname
const temp_paths: string[] = []

afterEach(() => {
  for (const temp_path of temp_paths.splice(0)) {
    rmSync(temp_path, { recursive: true, force: true })
  }
})

describe('dev server script', () => {
  it('should not bind to a specific host (Docker uses NUXT_HOST env var)', () => {
    expect(package_json.scripts.dev).toBe('./dev.sh dev')
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

  it('should refuse host-side generate instead of running Nuxt or switching the service lifecycle', () => {
    const fixture = makeShellFixture()
    writeFakeCommand(fixture.bin_dir, 'docker', 'case "$*" in *"up -d"*) printf "docker %s NUXT_MODE=%s\\n" "$*" "${NUXT_MODE:-}" >> "$CALL_LOG" ;; *) printf "docker %s\\n" "$*" >> "$CALL_LOG" ;; esac\n')
    writeFakeCommand(fixture.bin_dir, 'pnpm', 'printf "unexpected pnpm %s\\n" "$*" >> "$CALL_LOG"\nexit 42\n')
    writeFakeCommand(fixture.bin_dir, 'nuxt', 'printf "unexpected nuxt %s\\n" "$*" >> "$CALL_LOG"\nexit 42\n')

    const result = runDevSh(['generate'], fixture, { APP_URL: 'dwselect.toybox.local', NUXT_MODE: 'dev' })

    expect(result.status).toBe(1)
    expect(readFileSync(fixture.log_path, 'utf8')).toBe('')
    expect(`${result.stdout}${result.stderr}`).toContain('本機不需要直接執行 generate')
  })

  it('should restart the Docker service in dev mode for host-side dev instead of switching a running process', () => {
    const fixture = makeShellFixture()
    writeFakeCommand(fixture.bin_dir, 'docker', 'case "$*" in *"up -d"*) printf "docker %s NUXT_MODE=%s\\n" "$*" "${NUXT_MODE:-}" >> "$CALL_LOG" ;; *) printf "docker %s\\n" "$*" >> "$CALL_LOG" ;; esac\n')

    const result = runDevSh(['dev'], fixture, { APP_URL: 'dwselect.toybox.local', NUXT_MODE: 'build' })

    expect(result.status).toBe(0)
    expect(readFileSync(fixture.log_path, 'utf8')).toBe([
      'docker compose up -d --force-recreate app NUXT_MODE=dev',
      'docker compose logs -f app',
      '',
    ].join('\n'))
  })

  it('should recreate the service with the requested NUXT_MODE on restart when NUXT_MODE is set', () => {
    const fixture = makeShellFixture()
    writeFakeCommand(fixture.bin_dir, 'docker', 'case "$*" in *"up -d"*) printf "docker %s NUXT_MODE=%s\\n" "$*" "${NUXT_MODE:-}" >> "$CALL_LOG" ;; *) printf "docker %s\\n" "$*" >> "$CALL_LOG" ;; esac\n')

    const result = runDevSh(['restart'], fixture, { APP_URL: 'dwselect.toybox.local', NUXT_MODE: 'build' })

    expect(result.status).toBe(0)
    expect(readFileSync(fixture.log_path, 'utf8')).toBe([
      'docker compose up -d --force-recreate app NUXT_MODE=build',
      '',
    ].join('\n'))
  })

  it('should do a lightweight docker restart without recreate when NUXT_MODE is not set', () => {
    const fixture = makeShellFixture()
    writeFakeCommand(fixture.bin_dir, 'docker', 'case "$*" in *"up -d"*) printf "docker %s NUXT_MODE=%s\\n" "$*" "${NUXT_MODE:-}" >> "$CALL_LOG" ;; *) printf "docker %s\\n" "$*" >> "$CALL_LOG" ;; esac\n')

    const result = runDevSh(['restart'], fixture, { APP_URL: 'dwselect.toybox.local', NUXT_MODE: '' })

    expect(result.status).toBe(0)
    expect(readFileSync(fixture.log_path, 'utf8')).toBe([
      'docker compose restart app',
      '',
    ].join('\n'))
  })

  it('should run the real generate pipeline when already inside the container', () => {
    const fixture = makeShellFixture()
    writeFakeCommand(fixture.bin_dir, 'docker', 'printf "unexpected docker %s\\n" "$*" >> "$CALL_LOG"\nexit 42\n')
    writeFakeCommand(fixture.bin_dir, 'pnpm', 'printf "pnpm %s\\n" "$*" >> "$CALL_LOG"\n')
    writeFakeCommand(fixture.bin_dir, 'node', 'printf "node %s\\n" "$*" >> "$CALL_LOG"\n')

    const result = runDevSh(['generate'], fixture, { DWSELECT_IN_CONTAINER: '1' })

    expect(result.status).toBe(0)
    expect(readFileSync(fixture.log_path, 'utf8')).toBe([
      'pnpm build:public-discovery',
      'node scripts/assert-content-images.ts',
      'pnpm exec nuxt generate',
      '',
    ].join('\n'))
  })

  it('should allow direct host generate only when CI explicitly opts in', () => {
    const fixture = makeShellFixture()
    writeFakeCommand(fixture.bin_dir, 'docker', 'printf "unexpected docker %s\\n" "$*" >> "$CALL_LOG"\nexit 42\n')
    writeFakeCommand(fixture.bin_dir, 'pnpm', 'printf "pnpm %s\\n" "$*" >> "$CALL_LOG"\n')
    writeFakeCommand(fixture.bin_dir, 'node', 'printf "node %s\\n" "$*" >> "$CALL_LOG"\n')

    const result = runDevSh(['generate'], fixture, { DWSELECT_ALLOW_HOST_GENERATE: '1' })

    expect(result.status).toBe(0)
    expect(readFileSync(fixture.log_path, 'utf8')).toBe([
      'pnpm build:public-discovery',
      'node scripts/assert-content-images.ts',
      'pnpm exec nuxt generate',
      '',
    ].join('\n'))
  })

  it('should drop root privileges before the Docker entrypoint runs project commands', () => {
    const fixture = makeShellFixture()
    const app_root = join(fixture.temp_dir, 'app')
    writeFakeCommand(fixture.bin_dir, 'id', 'if [ "$1" = "-u" ]; then echo 0; else /usr/bin/id "$@"; fi\n')
    writeFakeCommand(fixture.bin_dir, 'chown', 'printf "chown %s\\n" "$*" >> "$CALL_LOG"\n')
    writeFakeCommand(fixture.bin_dir, 'su-exec', 'printf "su-exec %s\\n" "$*" >> "$CALL_LOG"\n')

    const result = runDevSh(['entrypoint'], fixture, { APP_ROOT: app_root })

    expect(result.status).toBe(0)
    expect(readFileSync(fixture.log_path, 'utf8')).toBe([
      `chown -R node:node ${app_root}/.nuxt ${app_root}/.output ${app_root}/node_modules`,
      'su-exec node ./dev.sh entrypoint',
      '',
    ].join('\n'))
  })
})

function makeShellFixture() {
  const temp_dir = mkdtempSync(join(tmpdir(), 'dwselect-dev-sh-'))
  const bin_dir = join(temp_dir, 'bin')
  const log_path = join(temp_dir, 'calls.log')
  temp_paths.push(temp_dir)
  writeFileSync(log_path, '')
  mkdirSync(bin_dir)

  return { temp_dir, bin_dir, log_path }
}

function writeFakeCommand(bin_dir: string, name: string, body: string) {
  const file_path = join(bin_dir, name)
  writeFileSync(file_path, `#!/bin/sh\n${body}`)
  chmodSync(file_path, 0o755)
}

function runDevSh(
  args: string[],
  fixture: { bin_dir: string, log_path: string },
  extra_env: Record<string, string> = {},
) {
  const env = { ...process.env }
  delete env.DWSELECT_IN_CONTAINER
  delete env.DWSELECT_ALLOW_HOST_GENERATE

  return spawnSync('bash', ['./dev.sh', ...args], {
    cwd: project_root,
    env: {
      ...env,
      ...extra_env,
      CALL_LOG: fixture.log_path,
      PATH: `${fixture.bin_dir}:${process.env.PATH ?? ''}`,
    },
    encoding: 'utf8',
  })
}
