import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const workflow_url = new URL('../.github/workflows/static-generate.yml', import.meta.url)

function readWorkflow() {
  return readFileSync(workflow_url, 'utf8')
}

describe('static generate workflow', () => {
  it('should run validation for pull requests and master pushes', () => {
    const workflow_source = readWorkflow()

    expect(workflow_source).toContain('pull_request:')
    expect(workflow_source).toContain('push:')
    expect(workflow_source).toContain('      - master')
    expect(workflow_source).not.toContain('      - main')
  })

  it('should run quality gates before deployment', () => {
    const workflow_source = readWorkflow()
    const quality_gate_commands = [
      'pnpm test',
      'pnpm lint',
      'pnpm typecheck',
      'pnpm generate',
      'node scripts/assert-runtime-google-sheet-clean.ts',
    ]

    const command_positions = quality_gate_commands.map((command) => workflow_source.indexOf(`run: ${command}`))

    expect(command_positions.every((position) => position > -1)).toBe(true)
    expect(command_positions).toEqual([...command_positions].sort((a, b) => a - b))
  })

  it('should deploy generated output to Cloudflare Pages only for master pushes', () => {
    const workflow_source = readWorkflow()

    expect(workflow_source).toContain('contents: read')
    expect(workflow_source).toContain('deployments: write')
    expect(workflow_source).toContain("if: github.event_name == 'push' && github.ref == 'refs/heads/master'")
    expect(workflow_source).toContain('cloudflare/wrangler-action@v3')
    expect(workflow_source).toContain('command: pages deploy .output/public --project-name=dwselect --branch=master')
    expect(workflow_source).toContain('apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}')
    expect(workflow_source).toContain('accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}')
    expect(workflow_source).toContain('gitHubToken: ${{ secrets.GITHUB_TOKEN }}')
  })
})
