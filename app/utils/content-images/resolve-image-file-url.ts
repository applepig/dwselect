export type ContentImageDirectory = 'products' | 'guides'

const IMAGE_FILE_PATTERN = /^[^./\\/?#"][^\\/?#"]*\.(jpg|jpeg|png|webp|gif|avif)$/

export function resolveImageFileUrl(image_file: string | null | undefined, image_directory: ContentImageDirectory): string | null {
  if (image_file === null || image_file === undefined) {
    return null
  }

  const normalized_image_file = normalizeImageFile(image_file)

  if (!IMAGE_FILE_PATTERN.test(normalized_image_file) || normalized_image_file.includes('..')) {
    throw new Error(`Invalid image_file: ${image_file}`)
  }

  return `/images/${image_directory}/${normalized_image_file}`
}

function normalizeImageFile(image_file: string): string {
  if (!image_file.startsWith('"') || !image_file.endsWith('"')) {
    return image_file
  }

  try {
    const parsed_image_file = JSON.parse(image_file) as unknown

    return typeof parsed_image_file === 'string' ? parsed_image_file : image_file
  }
  catch {
    return image_file
  }
}
