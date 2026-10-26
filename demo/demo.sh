#!/usr/bin/env bash
# Runs the OpenTelemetry Demo (https://opentelemetry.io/docs/demo/) with its
# collector exporting traces, metrics, and logs to otel-tui on the host.
set -euo pipefail

# Exported so images match the checkout; the demo's .env defaults them to latest.
export DEMO_VERSION=3.1.0
DEMO_REPO=https://github.com/open-telemetry/opentelemetry-demo.git

demo_dir=$(cd "$(dirname "$0")" && pwd)
upstream_dir="$demo_dir/.upstream/$DEMO_VERSION"

if [[ ! -d $upstream_dir ]]; then
  git clone --quiet --depth 1 --branch "$DEMO_VERSION" "$DEMO_REPO" "$upstream_dir"
fi

export OTEL_TUI_PORT=${OTEL_TUI_PORT:-4318}
export OTEL_COLLECTOR_CONFIG_EXTRAS="$demo_dir/otelcol-config.yml"

compose() {
  docker compose \
    --project-name otel-tui-demo \
    --project-directory "$upstream_dir" \
    --env-file "$upstream_dir/.env" \
    --env-file "$upstream_dir/.env.override" \
    -f "$upstream_dir/compose.yaml" \
    -f "$upstream_dir/compose.full.yaml" \
    -f "$demo_dir/compose.yaml" \
    "$@"
}

case ${1:-} in
  up)
    compose up --detach --remove-orphans
    echo "Sending telemetry to otel-tui on port $OTEL_TUI_PORT."
    echo "Shop: http://localhost:8080, load generator: http://localhost:8080/loadgen/,"
    echo "feature flags (failure scenarios): http://localhost:8080/feature/"
    ;;
  down)
    compose down --remove-orphans
    ;;
  *)
    echo "usage: $0 up|down" >&2
    exit 1
    ;;
esac
