#!/usr/bin/env bash

file_path="${1:-}"
script_dir="$(cd "$(dirname "$0")" && pwd)"
project_root="$(dirname "$script_dir")"

if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  /*) abs_path="$file_path" ;;
  *) abs_path="$PWD/$file_path" ;;
esac

case "$abs_path" in
  "$project_root"/*) lint_path="${abs_path#$project_root/}" ;;
  *) lint_path="$abs_path" ;;
esac

# 非阻斷式回報：把某道檢查的失敗輸出寫到 stderr，永遠不讓 hook 中止編輯流程。
report_failure() {
  local check="$1" status="$2" output="$3"
  printf '[post-edit-hook] {"status":"failed","check":"%s","file":"%s","exit_code":%s}\n' "$check" "$abs_path" "$status" >&2
  sed 's/^/[post-edit-hook] /' "$output" >&2
}

case "$file_path" in
  *.vue|*.ts|*.js|*.mjs)
    lint_output="$(mktemp)"
    (cd "$project_root" && pnpm --silent exec eslint --fix --max-warnings=0 --no-ignore "$lint_path" >"$lint_output" 2>&1)
    lint_status="$?"
    [ "$lint_status" -eq 0 ] || report_failure "eslint" "$lint_status" "$lint_output"
    rm -f "$lint_output"
    ;;
  *.json)
    # 只對 schema 受管的 content JSON 跑閘門；其餘 .json（tsconfig / .vscode 等可能是 JSONC）不碰，避免誤報。
    case "$lint_path" in
      content/products/*.json|content/guides/*.json|content/links/*.json|content/taxonomies/*.json)
        # content:check 一次涵蓋：JSON 語法 → zod schema → taxonomy 參照 → published image guard。
        # 缺欄位時 JSON 仍合法，只有這道 gate 攔得下；純語法檢查不夠。
        gate_output="$(mktemp)"
        (cd "$project_root" && pnpm --silent content:check >"$gate_output" 2>&1)
        gate_status="$?"
        [ "$gate_status" -eq 0 ] || report_failure "content-check" "$gate_status" "$gate_output"
        rm -f "$gate_output"
        ;;
    esac
    ;;
esac

exit 0
