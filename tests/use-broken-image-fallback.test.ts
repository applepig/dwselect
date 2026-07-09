// @vitest-environment happy-dom

import { ref } from 'vue'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useBrokenImageFallback } from '../app/composables/use-broken-image-fallback'

// composable 內部用 Nuxt auto-import 的 ref（與 use-taxonomy-detail-page 等既有 composable 同慣例）；
// bare vitest 環境無 auto-import，須以 vue 的 ref stub 全域。
describe('useBrokenImageFallback', () => {
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('回報任何 id 未破圖，當初始狀態', () => {
    const { isBrokenImage } = useBrokenImageFallback()

    expect(isBrokenImage('hero')).toBe(false)
    expect(isBrokenImage('product-a')).toBe(false)
  })

  it('把該 id 標記為破圖而不影響其他 id，當 onImageError 觸發', () => {
    const { isBrokenImage, onImageError } = useBrokenImageFallback()

    onImageError('product-a')

    expect(isBrokenImage('product-a')).toBe(true)
    expect(isBrokenImage('product-b')).toBe(false)
  })

  it('累加多個破圖 id 而不覆蓋既有標記', () => {
    const { isBrokenImage, onImageError } = useBrokenImageFallback()

    onImageError('a')
    onImageError('b')

    expect(isBrokenImage('a')).toBe(true)
    expect(isBrokenImage('b')).toBe(true)
  })

  it('冪等重複標記同一 id 不影響其結果', () => {
    const { isBrokenImage, onImageError } = useBrokenImageFallback()

    onImageError('a')
    onImageError('a')

    expect(isBrokenImage('a')).toBe(true)
  })

  it('標記 complete 但 naturalWidth 為 0 的圖為破圖，當 scanForBrokenImage 掃描到', () => {
    const { isBrokenImage, scanForBrokenImage } = useBrokenImageFallback()
    const broken_image = { complete: true, naturalWidth: 0 }
    const root = { querySelector: () => broken_image } as unknown as Pick<ParentNode, 'querySelector'>

    scanForBrokenImage(root, '.detail-hero-image', 'hero')

    expect(isBrokenImage('hero')).toBe(true)
  })

  it('放過已成功載入的圖，當 scanForBrokenImage 掃描到 naturalWidth 非 0', () => {
    const { isBrokenImage, scanForBrokenImage } = useBrokenImageFallback()
    const loaded_image = { complete: true, naturalWidth: 300 }
    const root = { querySelector: () => loaded_image } as unknown as Pick<ParentNode, 'querySelector'>

    scanForBrokenImage(root, '.detail-hero-image', 'hero')

    expect(isBrokenImage('hero')).toBe(false)
  })

  it('安全跳過而不拋錯，當 scanForBrokenImage 的 root 為 null 或查無圖', () => {
    const { isBrokenImage, scanForBrokenImage } = useBrokenImageFallback()
    const empty_root = { querySelector: () => null } as unknown as Pick<ParentNode, 'querySelector'>

    expect(() => scanForBrokenImage(null, '.detail-hero-image', 'hero')).not.toThrow()
    scanForBrokenImage(empty_root, '.detail-hero-image', 'hero')

    expect(isBrokenImage('hero')).toBe(false)
  })
})
