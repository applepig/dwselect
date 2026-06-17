import { z } from 'zod'

const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
const KEBAB_CASE_ASCII_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const content_status_schema = z.enum(['draft', 'published', 'unpublished', 'archived'])
const taxonomy_id_schema = z.string().regex(KEBAB_CASE_ASCII_ID_PATTERN, 'must be a kebab-case ASCII taxonomy id')
const category_id_schema = taxonomy_id_schema
const channel_id_schema = taxonomy_id_schema
const tag_id_schema = taxonomy_id_schema

const http_url_schema = z.string().refine((value) => {
  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    return false
  }
}, 'must be a valid HTTP(S) URL')

const IMAGE_FILE_PATTERN = /^[^./\\/?#][^\\/?#]*\.(jpg|jpeg|png|webp|gif|avif)$/

const image_file_schema = z.string().refine((value) => {
  if (!IMAGE_FILE_PATTERN.test(value)) {
    return false
  }

  return !value.includes('..')
}, 'must be a local image filename with a supported extension')
const optional_image_file_schema = image_file_schema.nullable().optional()
const optional_http_image_url_schema = http_url_schema.nullable().optional()

const timestamp_schema = z.string().regex(TIMESTAMP_PATTERN, 'must be a timestamp with timezone offset')

const product_price_schema = z.object({
  amount: z.number().nullable(),
  currency: z.enum(['TWD', 'JPY', 'USD']).nullable(),
  unit: z.enum(['each', 'kilogram']).nullable(),
  label: z.string().nullable(),
}).strict()

const product_offer_schema = z.object({
  channel_id: channel_id_schema,
  url: http_url_schema,
  price_text: z.string(),
  price: product_price_schema,
  checked_at: timestamp_schema,
}).strict()

export const product_schema = z.object({
  id: z.string().min(1),
  status: content_status_schema,
  name: z.string().min(1),
  english_name: z.string().min(1),
  summary: z.string(),
  long_description: z.string(),
  llm_description: z.string(),
  search_aliases: z.array(z.string()),
  model_numbers: z.array(z.string()),
  offers: z.array(product_offer_schema).min(1),
  image_file: optional_image_file_schema,
  image_url: optional_http_image_url_schema,
  category_id: category_id_schema,
  tag_ids: z.array(tag_id_schema),
  reference_url: http_url_schema.nullable(),
  created_at: timestamp_schema,
  updated_at: timestamp_schema,
  published_at: timestamp_schema.nullable(),
  unpublished_at: timestamp_schema.nullable(),
  archived_at: timestamp_schema.nullable(),
}).strict().superRefine((product, context) => {
  addProductImageSourceIssue(product, context)
})

export const guide_schema = z.object({
  id: z.string().min(1),
  status: content_status_schema,
  title: z.string().min(1),
  summary: z.string(),
  source_url: http_url_schema,
  image_file: optional_image_file_schema,
  image_url: optional_http_image_url_schema,
  category_ids: z.array(category_id_schema),
  tag_ids: z.array(tag_id_schema),
  related_product_ids: z.array(z.string().min(1)),
  created_at: timestamp_schema,
  updated_at: timestamp_schema,
  published_at: timestamp_schema.nullable(),
  unpublished_at: timestamp_schema.nullable(),
  archived_at: timestamp_schema.nullable(),
}).strict().superRefine((guide, context) => {
  addExclusiveImageSourceIssue(guide, context, false)
})

export const link_schema = z.object({
  id: z.string().min(1),
  status: content_status_schema,
  title: z.string().min(1),
  summary: z.string(),
  url: http_url_schema,
  image_url: optional_http_image_url_schema,
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

function addExclusiveImageSourceIssue(
  content: { image_file?: string | null, image_url?: string | null },
  context: z.RefinementCtx,
  require_image: boolean,
) {
  const has_image_file = content.image_file !== null && content.image_file !== undefined
  const has_image_url = content.image_url !== null && content.image_url !== undefined

  if (has_image_file && has_image_url) {
    context.addIssue({
      code: 'custom',
      path: ['image_file'],
      message: 'must not be provided with image_url',
    })
  }

  if (require_image && !has_image_file && !has_image_url) {
    context.addIssue({
      code: 'custom',
      path: ['image_file'],
      message: 'must provide exactly one image source',
    })
  }
}

function addProductImageSourceIssue(
  product: { status: z.infer<typeof content_status_schema>, image_file?: string | null, image_url?: string | null },
  context: z.RefinementCtx,
) {
  const has_image_file = product.image_file !== null && product.image_file !== undefined
  const has_image_url = product.image_url !== null && product.image_url !== undefined

  if (product.status === 'published' && !has_image_file) {
    context.addIssue({
      code: 'custom',
      path: ['image_file'],
      message: 'Published product image_file is required',
    })
  }

  if (has_image_url) {
    context.addIssue({
      code: 'custom',
      path: ['image_url'],
      message: 'must not be provided for product images; use image_file',
    })
  }
}

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
export const brand_taxonomy_schema = tag_taxonomy_schema

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
  brands?: Array<Pick<TagDefinition, 'id'>>
}

export function validateContentTaxonomyReferences(input: ContentTaxonomyReferenceInput): ContentTaxonomyReferenceViolation[] {
  const category_ids = new Set<string>(input.categories.map((category) => category.id))
  const tag_ids = new Set(input.tags.map((tag) => tag.id))
  const product_tag_ids = new Set([
    ...input.tags.map((tag) => tag.id),
    ...(input.brands ?? []).map((brand) => brand.id),
  ])
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

    addMissingTaxonomyViolations(violations, 'product', product.id, product.tag_ids, product_tag_ids, 'tag_ids')
  }

  for (const guide of input.guides ?? []) {
    addMissingTaxonomyViolations(violations, 'guide', guide.id, guide.category_ids, category_ids, 'category_ids')
    addMissingTaxonomyViolations(violations, 'guide', guide.id, guide.tag_ids, tag_ids, 'tag_ids')
  }

  for (const link of input.links ?? []) {
    addMissingTaxonomyViolations(violations, 'link', link.id, link.category_ids, category_ids, 'category_ids')
    addMissingTaxonomyViolations(violations, 'link', link.id, link.tag_ids, tag_ids, 'tag_ids')
  }

  return violations
}

function addMissingTaxonomyViolations(
  violations: ContentTaxonomyReferenceViolation[],
  content_type: ContentTypeWithTaxonomyReferences,
  content_id: string,
  referenced_ids: string[],
  valid_ids: ReadonlySet<string>,
  field: Extract<ContentTaxonomyReferenceViolation['field'], 'category_ids' | 'tag_ids'>,
) {
  for (const referenced_id of referenced_ids) {
    if (valid_ids.has(referenced_id)) {
      continue
    }

    violations.push({
      content_type,
      content_id,
      field,
      value: referenced_id,
    })
  }
}

export type ProductPrice = z.infer<typeof product_price_schema>
export type ProductOffer = z.infer<typeof product_offer_schema>
export type Product = z.infer<typeof product_schema>
export type Guide = z.infer<typeof guide_schema>
export type Link = z.infer<typeof link_schema>
export type ChannelDefinition = z.infer<typeof channel_definition_schema>
export type CategoryDefinition = z.infer<typeof category_definition_schema>
export type LegacyLinkDefinition = z.infer<typeof legacy_link_definition_schema>
export type LinkDefinition = Link
export type TagDefinition = z.infer<typeof tag_definition_schema>
