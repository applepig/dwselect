import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { getOptionValue, isDirectRun } from '../scripts/cli-helpers'

describe('getOptionValue', () => {
  it('回傳旗標後緊接的值，當旗標存在', () => {
    const args = ['--products-dir', 'content/products', '--out', 'dist/index.json']

    expect(getOptionValue(args, '--products-dir')).toBe('content/products')
    expect(getOptionValue(args, '--out')).toBe('dist/index.json')
  })

  it('回傳 undefined，當旗標不存在', () => {
    expect(getOptionValue(['--out', 'x'], '--products-dir')).toBeUndefined()
  })

  it('回傳 undefined，當旗標是最後一個參數且無值', () => {
    expect(getOptionValue(['--out'], '--out')).toBeUndefined()
  })
})

describe('isDirectRun', () => {
  const module_url = 'file:///project/scripts/build-search-index.ts'
  const module_path = fileURLToPath(module_url)

  it('回傳 true，當 entry 路徑指向本模組', () => {
    expect(isDirectRun(module_url, module_path)).toBe(true)
  })

  it('回傳 false，當 entry 路徑指向其他模組（被 import 而非直接執行）', () => {
    expect(isDirectRun(module_url, '/project/scripts/build-public-artifacts.ts')).toBe(false)
  })

  it('回傳 false，當沒有 entry 路徑', () => {
    expect(isDirectRun(module_url, undefined)).toBe(false)
  })
})
