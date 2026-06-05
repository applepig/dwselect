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

export const product_schema = z.object({
  id: z.string().min(1),
  status: z.enum(['draft', 'published', 'unpublished', 'archived']),
  name: z.string().min(1),
  price_text: z.string(),
  description: z.string(),
  purchase_url: http_url_schema,
  image_url: http_url_schema,
  category: z.string().min(1),
  tags: z.array(z.string()),
  reference_url: http_url_schema.nullable(),
  created_at: timestamp_schema,
  updated_at: timestamp_schema,
  published_at: timestamp_schema.nullable(),
  unpublished_at: timestamp_schema.nullable(),
  archived_at: timestamp_schema.nullable(),
})

export type Product = z.infer<typeof product_schema>
