import { z } from '@nuxt/content'

const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/

const http_url_schema = z.string().refine((value) => {
  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    return false
  }
}, 'must be a valid HTTP(S) URL')

const timestamp_schema = z.string().regex(TIMESTAMP_PATTERN, 'must be a timestamp with timezone offset')

const product_price_schema = z.object({
  amount: z.number().nullable(),
  currency: z.enum(['TWD', 'JPY', 'USD']).nullable(),
  unit: z.enum(['each', 'kilogram']).nullable(),
  label: z.string().nullable(),
}).strict()

export const product_schema = z.object({
  id: z.string().min(1),
  status: z.enum(['draft', 'published', 'unpublished', 'archived']),
  name: z.string().min(1),
  price_text: z.string(),
  price: product_price_schema,
  summary: z.string(),
  description: z.string(),
  purchase_url: http_url_schema,
  image_url: http_url_schema,
  channel_id: z.enum(['pchome', 'momo', 'amazonjp', 'amazonus', 'costco', 'other']),
  category_id: z.enum(['home', 'kitchen', 'computer', 'three-c', 'av', 'food', 'other']),
  tags: z.array(z.string()),
  reference_url: http_url_schema.nullable(),
  created_at: timestamp_schema,
  updated_at: timestamp_schema,
  published_at: timestamp_schema.nullable(),
  unpublished_at: timestamp_schema.nullable(),
  archived_at: timestamp_schema.nullable(),
}).strict()

export const channel_definition_schema = z.object({
  id: z.enum(['pchome', 'momo', 'amazonjp', 'amazonus', 'costco', 'other']),
  label: z.string().min(1),
  tint: z.string().min(1),
  host_patterns: z.array(z.string()),
  sort_order: z.number(),
}).strict()

export const category_definition_schema = z.object({
  id: z.enum(['home', 'kitchen', 'computer', 'three-c', 'av', 'food', 'other']),
  label: z.string().min(1),
  short_label: z.string().min(1),
  sort_order: z.number(),
}).strict()

export const link_definition_schema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string(),
  url: http_url_schema,
  icon: z.string().min(1),
  sort_order: z.number(),
}).strict()

export const channel_taxonomy_schema = z.object({
  items: z.array(channel_definition_schema),
}).strict()

export const category_taxonomy_schema = z.object({
  items: z.array(category_definition_schema),
}).strict()

export const link_taxonomy_schema = z.object({
  items: z.array(link_definition_schema),
}).strict()

export type ProductPrice = z.infer<typeof product_price_schema>
export type Product = z.infer<typeof product_schema>
export type ChannelDefinition = z.infer<typeof channel_definition_schema>
export type CategoryDefinition = z.infer<typeof category_definition_schema>
export type LinkDefinition = z.infer<typeof link_definition_schema>
