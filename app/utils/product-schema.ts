import { z } from 'zod'

const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
export const CATEGORY_IDS = ['home', 'kitchen', 'computer', 'three-c', 'av', 'food', 'other'] as const
export const CHANNEL_IDS = ['pchome', 'momo', 'amazonjp', 'amazonus', 'costco', 'other'] as const

const content_status_schema = z.enum(['draft', 'published', 'unpublished', 'archived'])
const category_id_schema = z.enum(CATEGORY_IDS)
const channel_id_schema = z.enum(CHANNEL_IDS)
const tag_id_schema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a kebab-case ASCII tag id')

const http_url_schema = z.string().refine((value) => {
  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    return false
  }
}, 'must be a valid HTTP(S) URL')

const LOCAL_IMAGE_PATH_PATTERN = /^\/images\/(products|guides)\/[^/?#.][^/?#]*\.(jpe?g|png|webp|gif|avif)$/

const local_image_path_schema = z.string().refine((value) => {
  try {
    if (!LOCAL_IMAGE_PATH_PATTERN.test(value)) {
      return false
    }

    if (value.includes('..') || value.includes('?') || value.includes('#')) {
      return false
    }

    return true
  }
  catch {
    return false
  }
}, 'must be a /images/(products|guides)/<filename>.<ext> path')

const local_or_http_url_schema = z.union([http_url_schema, local_image_path_schema])

const timestamp_schema = z.string().regex(TIMESTAMP_PATTERN, 'must be a timestamp with timezone offset')

const product_price_schema = z.object({
  amount: z.number().nullable(),
  currency: z.enum(['TWD', 'JPY', 'USD']).nullable(),
  unit: z.enum(['each', 'kilogram']).nullable(),
  label: z.string().nullable(),
}).strict()

export const product_schema = z.object({
  id: z.string().min(1),
  status: content_status_schema,
  name: z.string().min(1),
  price_text: z.string(),
  price: product_price_schema,
  summary: z.string(),
  description: z.string(),
  purchase_url: http_url_schema,
  image_url: local_or_http_url_schema,
  channel_id: channel_id_schema,
  category_id: category_id_schema,
  tag_ids: z.array(tag_id_schema),
  reference_url: http_url_schema.nullable(),
  created_at: timestamp_schema,
  updated_at: timestamp_schema,
  published_at: timestamp_schema.nullable(),
  unpublished_at: timestamp_schema.nullable(),
  archived_at: timestamp_schema.nullable(),
}).strict()

export const guide_schema = z.object({
  id: z.string().min(1),
  status: content_status_schema,
  title: z.string().min(1),
  summary: z.string(),
  source_url: http_url_schema,
  image_url: local_or_http_url_schema.nullable(),
  category_ids: z.array(category_id_schema),
  tag_ids: z.array(tag_id_schema),
  related_product_ids: z.array(z.string().min(1)),
  created_at: timestamp_schema,
  updated_at: timestamp_schema,
  published_at: timestamp_schema.nullable(),
  unpublished_at: timestamp_schema.nullable(),
  archived_at: timestamp_schema.nullable(),
}).strict()

export const link_schema = z.object({
  id: z.string().min(1),
  status: content_status_schema,
  title: z.string().min(1),
  summary: z.string(),
  url: http_url_schema,
  image_url: local_or_http_url_schema.nullable().optional(),
  icon: z.string().min(1),
  category_ids: z.array(category_id_schema),
  tag_ids: z.array(tag_id_schema),
  sort_order: z.number(),
  created_at: timestamp_schema,
  updated_at: timestamp_schema,
  published_at: timestamp_schema.nullable(),
  unpublished_at: timestamp_schema.nullable(),
  archived_at: timestamp_schema.nullable(),
}).strict()

export const channel_definition_schema = z.object({
  id: channel_id_schema,
  label: z.string().min(1),
  tint: z.string().min(1),
  host_patterns: z.array(z.string()),
  sort_order: z.number(),
}).strict()

export const category_definition_schema = z.object({
  id: category_id_schema,
  label: z.string().min(1),
  short_label: z.string().min(1),
  nav_visible: z.boolean(),
  sort_order: z.number(),
}).strict()

export const legacy_link_definition_schema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string(),
  url: http_url_schema,
  icon: z.string().min(1),
  sort_order: z.number(),
}).strict()

export const tag_definition_schema = z.object({
  id: tag_id_schema,
  label: z.string().min(1),
  description: z.string(),
  aliases: z.array(z.string()),
  nav_visible: z.boolean(),
  sort_order: z.number(),
}).strict()

export const channel_taxonomy_schema = z.object({
  items: z.array(channel_definition_schema),
}).strict()

export const category_taxonomy_schema = z.object({
  items: z.array(category_definition_schema),
}).strict()

export const legacy_link_taxonomy_schema = z.object({
  items: z.array(legacy_link_definition_schema),
}).strict()

export const tag_taxonomy_schema = z.object({
  items: z.array(tag_definition_schema),
}).strict()

export type ContentTypeWithTaxonomyReferences = 'product' | 'guide' | 'link'

export type ContentTaxonomyReferenceViolation = {
  content_type: ContentTypeWithTaxonomyReferences
  content_id: string
  field: 'category_id' | 'category_ids' | 'tag_ids'
  value: string
}

export type ContentTaxonomyReferenceInput = {
  products?: Array<{ id: string, category_id: string, tag_ids: string[] }>
  guides?: Array<{ id: string, category_ids: string[], tag_ids: string[] }>
  links?: Array<{ id: string, category_ids: string[], tag_ids: string[] }>
  categories: Array<Pick<CategoryDefinition, 'id'>>
  tags: Array<Pick<TagDefinition, 'id'>>
}

export function validateContentTaxonomyReferences(input: ContentTaxonomyReferenceInput): ContentTaxonomyReferenceViolation[] {
  const category_ids = new Set<string>(input.categories.map((category) => category.id))
  const tag_ids = new Set(input.tags.map((tag) => tag.id))
  const violations: ContentTaxonomyReferenceViolation[] = []

  for (const product of input.products ?? []) {
    if (!category_ids.has(product.category_id)) {
      violations.push({
        content_type: 'product',
        content_id: product.id,
        field: 'category_id',
        value: product.category_id,
      })
    }

    addMissingTagViolations(violations, 'product', product.id, product.tag_ids, tag_ids)
  }

  for (const guide of input.guides ?? []) {
    addMissingCategoryViolations(violations, 'guide', guide.id, guide.category_ids, category_ids)
    addMissingTagViolations(violations, 'guide', guide.id, guide.tag_ids, tag_ids)
  }

  for (const link of input.links ?? []) {
    addMissingCategoryViolations(violations, 'link', link.id, link.category_ids, category_ids)
    addMissingTagViolations(violations, 'link', link.id, link.tag_ids, tag_ids)
  }

  return violations
}

function addMissingCategoryViolations(
  violations: ContentTaxonomyReferenceViolation[],
  content_type: ContentTypeWithTaxonomyReferences,
  content_id: string,
  referenced_category_ids: string[],
  valid_category_ids: ReadonlySet<string>,
) {
  for (const category_id of referenced_category_ids) {
    if (valid_category_ids.has(category_id)) {
      continue
    }

    violations.push({
      content_type,
      content_id,
      field: 'category_ids',
      value: category_id,
    })
  }
}

function addMissingTagViolations(
  violations: ContentTaxonomyReferenceViolation[],
  content_type: ContentTypeWithTaxonomyReferences,
  content_id: string,
  referenced_tag_ids: string[],
  valid_tag_ids: ReadonlySet<string>,
) {
  for (const tag_id of referenced_tag_ids) {
    if (valid_tag_ids.has(tag_id)) {
      continue
    }

    violations.push({
      content_type,
      content_id,
      field: 'tag_ids',
      value: tag_id,
    })
  }
}

export type ProductPrice = z.infer<typeof product_price_schema>
export type Product = z.infer<typeof product_schema>
export type Guide = z.infer<typeof guide_schema>
export type Link = z.infer<typeof link_schema>
export type ChannelDefinition = z.infer<typeof channel_definition_schema>
export type CategoryDefinition = z.infer<typeof category_definition_schema>
export type LegacyLinkDefinition = z.infer<typeof legacy_link_definition_schema>
export type LinkDefinition = Link
export type TagDefinition = z.infer<typeof tag_definition_schema>
