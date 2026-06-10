#!/bin/bash
set -e

# Configuration
SERVICE="app"

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

    # Read APP_URL from .env if it exists
    APP_URL="localhost"
    if [ -f ".env" ]; then
        # shellcheck source=/dev/null
        source ".env"
    fi

    log_info "Starting development container..."
    docker compose up -d
    log_info "Container started successfully"
    echo ""
    log_info "Use './dev.sh logs' to follow output"
    log_info "App will be available at https://${APP_URL}"
}

cmd_stop() {
    log_info "Stopping development container..."
    docker compose down
    log_info "Container stopped"
}

cmd_restart() {
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
