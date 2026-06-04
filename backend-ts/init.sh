#!/usr/bin/env bash
# Init script: copies config.example.toml -> config.toml if not exists
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/config.toml" ]; then
  echo "config.toml already exists, skipping."
else
  cp "$SCRIPT_DIR/config.example.toml" "$SCRIPT_DIR/config.toml"
  echo "Created config.toml from template. Edit it with your settings:"
  echo "  $SCRIPT_DIR/config.toml"
fi
