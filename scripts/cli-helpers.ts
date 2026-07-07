import { fileURLToPath } from 'node:url'

// 各 build/assert script 共用的 CLI 小工具：旗標取值與「是否被直接執行」判定。

// 回傳 `--option value` 形式旗標後緊接的值；旗標不存在或無後續值時回傳 undefined。
export function getOptionValue(args: string[], option: string): string | undefined {
  const option_index = args.indexOf(option)

  if (option_index === -1) {
    return undefined
  }

  return args[option_index + 1]
}

// 判斷本模組是否為 process 的 entry（`node scripts/foo.ts`）而非被 import。
// 傳入 `import.meta.url`；entry_path 預設取 process.argv[1]，注入參數僅為測試便利。
export function isDirectRun(module_url: string, entry_path = process.argv[1]): boolean {
  if (!entry_path) {
    return false
  }

  return fileURLToPath(module_url) === entry_path
}
