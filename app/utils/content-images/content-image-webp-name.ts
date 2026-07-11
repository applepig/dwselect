// image_file → build-content-images webp 產物檔名的單一規則來源：og URL 組裝（seo-metadata）與
// 轉檔輸出（scripts/build-content-images）共用，兩端對映不再靠註解維繫等價性。
// 純字串實作、不用 node:path（app/utils 會進 client bundle）；「去掉最後一節 .ext」與 parse(name).name
// 對本專案輸入等價——IMAGE_FILE_PATTERN 已禁止斜線與前導點，無 edge case 分岔。
export function getContentImageWebpName(image_file: string): string {
  return `${image_file.replace(/\.[^.]+$/, '')}.webp`
}
