// ENOENT → 缺目錄／檔案視為空集合而非錯誤，async／sync 讀取器共用同一判定。
export function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && (error as { code?: unknown }).code === 'ENOENT'
}
