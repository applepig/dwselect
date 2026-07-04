import type { MaybeRefOrGetter, Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref, shallowRef, toValue, watchEffect } from 'vue'

import { useTaxonomyDetailPage } from '../app/composables/use-taxonomy-detail-page'
import type { TaxonomyKind } from '../app/utils/published-products/select-taxonomy-items'
import type { TaxonomyPageData } from '../app/utils/published-products/types'
import { SITE_NAME, SITE_OG_IMAGE } from '../app/utils/seo-metadata'

type HeadLink = {
  key: string
  rel: string
  href: string
}

type HeadPayload = {
  title: string
  link: HeadLink[]
}

type SeoMetaPayload = Record<string, unknown>

type TaxonomyPageErrorInput = {
  statusCode: number
  message: string
  fatal: boolean
}

type TaxonomyPageError = Error & TaxonomyPageErrorInput

type StubRuntimeOptions = {
  route_id?: string | string[]
  data?: TaxonomyPageData | null
  fetch_promise?: Promise<Ref<TaxonomyPageData | null>>
}

function makeTaxonomyPageData(overrides: Partial<TaxonomyPageData> = {}): TaxonomyPageData {
  return {
    taxonomy_kind: 'tag',
    id: 'coffee',
    label: '咖啡',
    description: '咖啡選物專題。',
    products: [],
    guides: [],
    links: [],
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve_deferred: (value: T) => void = () => {}
  const promise = new Promise<T>((resolve) => {
    resolve_deferred = resolve
  })

  return {
    promise,
    resolve: resolve_deferred,
  }
}

function stubTaxonomyComposableRuntime(options: StubRuntimeOptions = {}) {
  const call_order: string[] = []
  const route_params = options.route_id === undefined ? {} : { id: options.route_id }
  const initial_data = Object.hasOwn(options, 'data')
    ? options.data ?? null
    : makeTaxonomyPageData()
  const taxonomy_page_data = ref<TaxonomyPageData | null>(initial_data)
  let head_input: unknown = null
  let seo_meta_payload: SeoMetaPayload | null = null

  const use_head = vi.fn((input: unknown) => {
    call_order.push('useHead')
    head_input = input
  })
  const use_seo_meta = vi.fn((payload: SeoMetaPayload) => {
    call_order.push('useSeoMeta')
    seo_meta_payload = payload
  })
  const use_taxonomy_page_data = vi.fn((_kind: TaxonomyKind, _taxonomy_id: string) => {
    call_order.push('useTaxonomyPageData')

    return options.fetch_promise ?? Promise.resolve(taxonomy_page_data)
  })
  const create_error = vi.fn((input: TaxonomyPageErrorInput) => {
    const error = new Error(input.message) as TaxonomyPageError
    error.statusCode = input.statusCode
    error.message = input.message
    error.fatal = input.fatal

    return error
  })

  vi.stubGlobal('computed', computed)
  vi.stubGlobal('shallowRef', shallowRef)
  vi.stubGlobal('watchEffect', watchEffect)
  vi.stubGlobal('useRoute', () => ({ params: route_params }))
  vi.stubGlobal('useHead', use_head)
  vi.stubGlobal('useSeoMeta', use_seo_meta)
  vi.stubGlobal('useTaxonomyPageData', use_taxonomy_page_data)
  vi.stubGlobal('createError', create_error)

  return {
    call_order,
    create_error,
    get head_input() {
      return head_input
    },
    get seo_meta_payload() {
      return seo_meta_payload
    },
    taxonomy_page_data,
    use_head,
    use_seo_meta,
    use_taxonomy_page_data,
  }
}

function getHeadPayload(input: unknown): HeadPayload {
  expect(input).not.toBeNull()

  if (typeof input === 'function') {
    return input() as HeadPayload
  }

  return input as HeadPayload
}

function getSeoMetaPayload(payload: SeoMetaPayload | null): SeoMetaPayload {
  expect(payload).not.toBeNull()

  return payload as SeoMetaPayload
}

function readSeoMetaValue(payload: SeoMetaPayload, key: string): string {
  return toValue(payload[key] as MaybeRefOrGetter<string>)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useTaxonomyDetailPage composable', () => {
  it('should use the first route id when Nuxt gives an array param', async () => {
    const runtime = stubTaxonomyComposableRuntime({ route_id: ['coffee', 'ignored'] })

    await useTaxonomyDetailPage('tag')

    expect(runtime.use_taxonomy_page_data).toHaveBeenCalledWith('tag', 'coffee')
  })

  it('should fall back to an empty taxonomy id when the route param is missing', async () => {
    const runtime = stubTaxonomyComposableRuntime({
      data: makeTaxonomyPageData({ taxonomy_kind: 'channel', id: '' }),
    })

    await useTaxonomyDetailPage('channel')

    expect(runtime.use_taxonomy_page_data).toHaveBeenCalledWith('channel', '')
  })

  it('should register head and SEO meta before waiting for taxonomy page data', async () => {
    const deferred_fetch = createDeferred<Ref<TaxonomyPageData | null>>()
    const runtime = stubTaxonomyComposableRuntime({ fetch_promise: deferred_fetch.promise })

    const page_promise = useTaxonomyDetailPage('category')

    expect(runtime.call_order).toEqual(['useHead', 'useSeoMeta', 'useTaxonomyPageData'])

    deferred_fetch.resolve(runtime.taxonomy_page_data)
    await page_promise
  })

  it('should fall back to the site name for title and description before page data resolves', async () => {
    // fetch 尚未 resolve 時 page_data 仍為初始 null，meta 須墊站名，不可洩漏 undefined。
    const deferred_fetch = createDeferred<Ref<TaxonomyPageData | null>>()
    const runtime = stubTaxonomyComposableRuntime({ fetch_promise: deferred_fetch.promise })

    const page_promise = useTaxonomyDetailPage('category')

    const head_payload = getHeadPayload(runtime.head_input)
    const seo_meta_payload = getSeoMetaPayload(runtime.seo_meta_payload)

    expect(head_payload.title).toBe(SITE_NAME)
    expect(readSeoMetaValue(seo_meta_payload, 'title')).toBe(SITE_NAME)
    expect(readSeoMetaValue(seo_meta_payload, 'description')).toBe(SITE_NAME)

    deferred_fetch.resolve(runtime.taxonomy_page_data)
    await page_promise
  })

  it('should derive canonical metadata from the kind and normalized taxonomy id', async () => {
    const taxonomy_data = makeTaxonomyPageData({
      taxonomy_kind: 'brand',
      id: 'fellow',
      label: 'Fellow',
      description: 'Fellow 咖啡器具選物。',
    })
    const runtime = stubTaxonomyComposableRuntime({ route_id: 'fellow', data: taxonomy_data })
    const canonical_url = 'https://dwselect.applepig.net/brand/fellow'

    await useTaxonomyDetailPage('brand')

    const head_payload = getHeadPayload(runtime.head_input)
    const seo_meta_payload = getSeoMetaPayload(runtime.seo_meta_payload)

    expect(head_payload.link).toContainEqual({
      key: 'canonical',
      rel: 'canonical',
      href: canonical_url,
    })
    expect(readSeoMetaValue(seo_meta_payload, 'ogUrl')).toBe(canonical_url)
    expect(readSeoMetaValue(seo_meta_payload, 'ogImage')).toBe(SITE_OG_IMAGE)
    expect(readSeoMetaValue(seo_meta_payload, 'twitterImage')).toBe(SITE_OG_IMAGE)
    expect(readSeoMetaValue(seo_meta_payload, 'title')).toBe('Fellow｜DW嚴選')
    expect(readSeoMetaValue(seo_meta_payload, 'description')).toBe('Fellow 咖啡器具選物。')
  })

  it('should throw the configured taxonomy 404 error when fetched page data is null', async () => {
    const runtime = stubTaxonomyComposableRuntime({ route_id: 'missing-brand', data: null })

    await expect(useTaxonomyDetailPage('brand')).rejects.toMatchObject({
      statusCode: 404,
      message: '找不到品牌',
      fatal: true,
    })
    expect(runtime.create_error).toHaveBeenCalledWith({
      statusCode: 404,
      message: '找不到品牌',
      fatal: true,
    })
  })

  it('should return page_data and keep it synced with taxonomy page data', async () => {
    const first_taxonomy_data = makeTaxonomyPageData({
      taxonomy_kind: 'channel',
      id: 'momo',
      label: 'momo',
    })
    const next_taxonomy_data = makeTaxonomyPageData({
      taxonomy_kind: 'channel',
      id: 'pchome',
      label: 'PChome',
    })
    const runtime = stubTaxonomyComposableRuntime({ route_id: 'momo', data: first_taxonomy_data })

    const result = await useTaxonomyDetailPage('channel')

    expect(result.page_data.value).toEqual(first_taxonomy_data)

    runtime.taxonomy_page_data.value = next_taxonomy_data
    await nextTick()

    expect(result.page_data.value).toEqual(next_taxonomy_data)
  })

  it('should forward the original kind and normalized id to preserve downstream namespace guards', async () => {
    const runtime = stubTaxonomyComposableRuntime({ route_id: ['brand-as-tag', 'unused'] })

    await useTaxonomyDetailPage('tag')

    expect(runtime.use_taxonomy_page_data).toHaveBeenCalledWith('tag', 'brand-as-tag')
  })
})
