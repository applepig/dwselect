import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { TaxonomyItemsSource } from '../../app/utils/published-products/select-taxonomy-items.ts'
import { isMissingFileError } from './is-missing-file-error.ts'
import { readPublishedJsonEntries } from './read-published-json-entries.ts'

export type TaxonomyContentDirs = {
  products_dir: string
  guides_dir: string
  links_dir: string
  // brand 切分（ADR-8）需 brands.json 成員；tag/category builder 不需，故 optional。
  taxonomies_dir?: string
}

type RawOffer = { channel_id?: string }
type RawProduct = { status?: string, category_id?: string, tag_ids?: string[], offers?: RawOffer[] | null }
type RawResource = { status?: string, category_ids?: string[], tag_ids?: string[] }

// Why: route builder 在 nuxt.config 同步執行（無 async），故用 content-source 的 sync 讀取，
// 只讀「決定非空 taxonomy 所需」的最小欄位（status + taxonomy ids + offers 的 channel_id），不過 schema parse。
// channel_ids 取自 product offers（所有 offer 的 channel_id，products-only，ADR-9）。
export function readPublishedTaxonomyItems(dirs: TaxonomyContentDirs): TaxonomyItemsSource {
  return {
    products: readPublished<RawProduct>(dirs.products_dir).map((product) => ({
      category_id: product.category_id ?? '',
      tag_ids: product.tag_ids ?? [],
      channel_ids: extractChannelIds(product.offers),
    })),
    guides: readPublished<RawResource>(dirs.guides_dir).map((guide) => ({
      category_ids: guide.category_ids ?? [],
      tag_ids: guide.tag_ids ?? [],
    })),
    links: readPublished<RawResource>(dirs.links_dir).map((link) => ({
      category_ids: link.category_ids ?? [],
      tag_ids: link.tag_ids ?? [],
    })),
  }
}

type RawBrand = { id?: string }

// brands.json 形如 { items: [{ id, ... }] }；只取 id 集合供 brand/tag namespace 切分（ADR-8）。
export function readBrandIds(taxonomies_dir: string | undefined): Set<string> {
  if (!taxonomies_dir) {
    return new Set()
  }

  let raw: { items?: RawBrand[] }

  try {
    raw = JSON.parse(readFileSync(join(taxonomies_dir, 'brands.json'), 'utf8')) as { items?: RawBrand[] }
  }
  catch (error) {
    if (isMissingFileError(error)) {
      return new Set()
    }

    throw error
  }

  const ids = (raw.items ?? [])
    .map((brand) => brand.id)
    .filter((id): id is string => typeof id === 'string' && id !== '')

  return new Set(ids)
}

function extractChannelIds(offers: RawOffer[] | null | undefined): string[] {
  if (!offers) {
    return []
  }

  return offers
    .map((offer) => offer.channel_id)
    .filter((channel_id): channel_id is string => typeof channel_id === 'string' && channel_id !== '')
}

function readPublished<T extends { status?: string }>(dir: string): T[] {
  return readPublishedJsonEntries(dir).map((entry) => entry.data as T)
}
