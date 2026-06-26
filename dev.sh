#!/bin/bash
set -e

# Configuration
SERVICE="app"
APP_ROOT="${APP_ROOT:-/app}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging helpers
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print usage
usage() {
    cat <<EOF
DW嚴選 Development Environment Manager

Usage: ./dev.sh [command]

Commands:
  dev         Run dev server in Docker from host, or Nuxt dev inside container
  generate    Generate static output in Docker from host, or Nuxt generate inside container
  start       Start development container in background
  stop        Stop development container
  restart     Restart development container
  build       Build development container image (no cache)
  rebuild     Full rebuild: stop, remove volumes, build, start
  logs        Follow container logs
  exec        Execute command in container (e.g., ./dev.sh exec pnpm install)
  shell       Open interactive shell in container
  install     Run pnpm install in container
  status      Show container status
  clean       Stop container and remove all volumes (prompts for confirmation)

Examples:
  ./dev.sh start              # Start dev environment
  ./dev.sh logs               # Watch container output
  ./dev.sh exec ls /app       # List files in container
  ./dev.sh shell              # Open shell in container
  ./dev.sh install            # Install pnpm packages after package.json change

EOF
}

cmd_start() {
    # Create .env from example if missing
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "Created .env from .env.example"
        else
            log_warn "No .env or .env.example found, using defaults"
        fi
    fi

    # Read APP_URL from .env
    if [ -f ".env" ]; then
        # shellcheck source=/dev/null
        source ".env"
    fi
    if [ -z "${APP_URL:-}" ]; then
        log_error "APP_URL 未設定——請在 .env 設定，例如 APP_URL=dwselect.toybox.local"
        exit 1
    fi

    log_info "Starting development container..."
    docker compose up -d
    log_info "Container started successfully"
    echo ""
    log_info "Use './dev.sh logs' to follow output"
    log_info "App will be available at https://${APP_URL}"
}

cmd_start_mode() {
    local mode="$1"
    # Create .env from example if missing
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "Created .env from .env.example"
        else
            log_warn "No .env or .env.example found, using defaults"
        fi
    fi

    # Read APP_URL from .env
    if [ -f ".env" ]; then
        # shellcheck source=/dev/null
        source ".env"
    fi
    if [ -z "${APP_URL:-}" ]; then
        log_error "APP_URL 未設定——請在 .env 設定，例如 APP_URL=dwselect.toybox.local"
        exit 1
    fi

    log_info "Starting ${mode} container..."
    NUXT_MODE="$mode" docker compose up -d --force-recreate "$SERVICE"
    log_info "Container started successfully"
    echo ""
    log_info "Use './dev.sh logs' to follow output"
    log_info "App will be available at https://${APP_URL}"
}

is_container() {
    [ -f "/.dockerenv" ] || [ "${DWSELECT_IN_CONTAINER:-}" = "1" ]
}

cmd_dev() {
    if is_container; then
        exec pnpm exec nuxt dev
    fi

    cmd_start_mode dev
    cmd_logs
}

cmd_generate_inner() {
    pnpm build:public-discovery
    node scripts/assert-content-images.ts
    pnpm exec nuxt generate
}

cmd_generate() {
    if is_container || [ "${DWSELECT_ALLOW_HOST_GENERATE:-}" = "1" ]; then
        cmd_generate_inner
        return
    fi

    log_error "本機不需要直接執行 generate。dev mode 走 HMR；build mode 只在 Docker app service 啟動時執行一次 generate。"
    echo ""
    log_info "若要啟動 build preview，請設定 NUXT_MODE=build 後重建 service，例如："
    echo ""
    echo "    NUXT_MODE=build ./dev.sh restart"
    echo ""
    log_info "CI 若需直接產 static artifact，必須明確設定 DWSELECT_ALLOW_HOST_GENERATE=1。"
    exit 1
}

cmd_entrypoint() {
    if [ "$(id -u)" = "0" ]; then
        mkdir -p "$APP_ROOT/.nuxt" "$APP_ROOT/.output" "$APP_ROOT/node_modules"
        # 這裡把 bind-mount 的工作目錄交給 container 內的 node 使用者（uid 1000），再 su-exec 降權。
        # 隱含假設 host 操作者 uid == 1000：若 host／CI 以非 1000 uid 跑 build mode，這個 chown 會把
        # 工作樹（.nuxt/.output/node_modules）的 owner 改成 1000，host 端可能因此需要 sudo 才能清除。
        chown -R node:node "$APP_ROOT/.nuxt" "$APP_ROOT/.output" "$APP_ROOT/node_modules"
        exec su-exec node "$0" entrypoint "$@"
    fi

    if [ "$#" -gt 0 ]; then
        exec "$@"
    fi

    if [ "$NUXT_MODE" = "dev" ]; then
        cmd_dev
    else
        cmd_generate_inner
        exec pnpm preview
    fi
}

cmd_stop() {
    log_info "Stopping development container..."
    docker compose down
    log_info "Container stopped"
}

cmd_restart() {
    # NUXT_MODE 有設定時須 recreate 並注入該 mode——docker compose restart 不會重讀 env，
    # 故 `NUXT_MODE=build ./dev.sh restart` 必須走 cmd_start_mode 的 --force-recreate 路徑才會生效。
    if [ -n "${NUXT_MODE:-}" ]; then
        cmd_start_mode "$NUXT_MODE"
        return
    fi

    log_info "Restarting development container..."
    docker compose restart "$SERVICE"
    log_info "Container restarted"
}

cmd_build() {
    log_info "Building development container (no cache)..."
    docker compose build --no-cache
    log_info "Build complete"
}

cmd_rebuild() {
    log_info "Full rebuild: stopping container and removing volumes..."
    docker compose down -v
    log_info "Building fresh image..."
    docker compose build --no-cache
    log_info "Starting container..."
    docker compose up -d
    log_info "Rebuild complete"
}

cmd_logs() {
    log_info "Following container logs (Ctrl+C to exit)..."
    docker compose logs -f "$SERVICE"
}

cmd_exec() {
    if [ $# -eq 0 ]; then
        log_error "No command provided"
        echo "Usage: ./dev.sh exec <command>"
        echo "Example: ./dev.sh exec pnpm install"
        exit 1
    fi
    docker compose exec "$SERVICE" "$@"
}

cmd_shell() {
    log_info "Opening shell in container (type 'exit' to leave)..."
    docker compose exec "$SERVICE" /bin/sh
}

cmd_install() {
    log_info "Running pnpm install in container..."
    docker compose exec "$SERVICE" pnpm install
    log_info "Installation complete"
}

cmd_status() {
    docker compose ps
}

cmd_clean() {
    log_warn "This will stop the container and remove all volumes (including node_modules cache)"
    read -r -p "Are you sure? [y/N] " response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "Stopping container and removing volumes..."
        docker compose down -v
        log_info "Pruning unused volumes..."
        docker volume prune -f
        log_info "Clean complete"
    else
        log_info "Clean cancelled"
    fi
}

case "${1:-}" in
    dev)      cmd_dev ;;
    generate) cmd_generate ;;
    entrypoint) shift; cmd_entrypoint "$@" ;;
    start)    cmd_start ;;
    stop)     cmd_stop ;;
    restart)  cmd_restart ;;
    build)    cmd_build ;;
    rebuild)  cmd_rebuild ;;
    logs)     cmd_logs ;;
    exec)     shift; cmd_exec "$@" ;;
    shell)    cmd_shell ;;
    install)  cmd_install ;;
    status)   cmd_status ;;
    clean)    cmd_clean ;;
    *)        usage ;;
esac
