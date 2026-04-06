#!/usr/bin/env bash
# Installation script for Governance Extension

set -e

EXTENSION_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCLAW_ROOT="${1:-$(dirname "$EXTENSION_DIR")}"

echo "🛡️  Installing Governance Extension..."
echo "   Extension dir: $EXTENSION_DIR"
echo "   OpenClaw root: $OPENCLAW_ROOT"

# Check if we're in the right place
if [ ! -f "$OPENCLAW_ROOT/package.json" ]; then
    echo "❌ Error: Could not find OpenClaw root at $OPENCLAW_ROOT"
    echo "   Usage: ./install.sh [path-to-openclaw]"
    exit 1
fi

# Create extensions directory if it doesn't exist
mkdir -p "$OPENCLAW_ROOT/extensions"

# Copy extension if not already there
if [ "$EXTENSION_DIR" != "$OPENCLAW_ROOT/extensions/governance" ]; then
    echo "📁 Copying extension to $OPENCLAW_ROOT/extensions/governance..."
    rm -rf "$OPENCLAW_ROOT/extensions/governance"
    cp -r "$EXTENSION_DIR" "$OPENCLAW_ROOT/extensions/governance"
fi

echo ""
echo "✅ Governance Extension installed!"
echo ""
echo "Next steps:"
echo "   1. Configure: edit extensions/governance/openclaw.json"
echo "   2. Enable: openclaw extension enable governance"
echo "   3. Restart OpenClaw"
echo ""
echo "Documentation: extensions/governance/README.md"
