import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'

const opencode_config_url = new URL('../opencode.json', import.meta.url)
const codex_hooks_url = new URL('../.codex/hooks.json', import.meta.url)
const claude_settings_url = new URL('../.claude/settings.json', import.meta.url)

function readJson(url: URL) {
  return JSON.parse(readFileSync(url, 'utf8'))
}

describe('agent quality gate config', () => {
  it('configures OpenCode formatter with the shared post-edit hook', () => {
    expect(existsSync(opencode_config_url)).toBe(true)

    const config = readJson(opencode_config_url)
    const formatter = config.formatter?.dwselect_lint_file

    expect(formatter).toBeDefined()
    expect(formatter.command).toContain('scripts/post-edit-hook.sh')
    expect(formatter.command).toContain('$FILE')
    expect(formatter.extensions).toEqual(expect.arrayContaining(['.vue', '.ts', '.js', '.mjs']))
  })

  it('configures Codex PostToolUse hooks for file edit tools', () => {
    expect(existsSync(codex_hooks_url)).toBe(true)

    const config = readJson(codex_hooks_url)
    const post_tool_use = config.hooks?.PostToolUse ?? []
    const serialized = JSON.stringify(post_tool_use)

    expect(serialized).toContain('apply_patch')
    expect(serialized).toContain('Edit')
    expect(serialized).toContain('Write')
    expect(serialized).toContain('scripts/post-edit-hook.sh')
    expect(serialized).toContain('jq')
  })

  it('configures Claude PostToolUse hooks for file edit tools', () => {
    expect(existsSync(claude_settings_url)).toBe(true)

    const config = readJson(claude_settings_url)
    const post_tool_use = config.hooks?.PostToolUse ?? []
    const serialized = JSON.stringify(post_tool_use)

    expect(serialized).toContain('Edit')
    expect(serialized).toContain('MultiEdit')
    expect(serialized).toContain('Write')
    expect(serialized).toContain('scripts/post-edit-hook.sh')
    expect(serialized).toContain('jq')
  })
})
