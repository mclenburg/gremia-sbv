#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Baue Gremia.SBV für Linux ..."
npm run build
npm run native:rebuild:electron
npx electron-builder --linux AppImage

echo
echo "Fertig. Artefakte liegen unter:"
echo "  $ROOT_DIR/release"
