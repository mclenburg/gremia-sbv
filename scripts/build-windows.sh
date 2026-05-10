#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Baue Gremia.SBV für Windows x64 ..."
echo

if [[ "${OSTYPE:-}" != msys* && "${OSTYPE:-}" != cygwin* && "$(uname -s)" != MINGW* ]]; then
  echo "Hinweis: Windows-Portable-Builds auf Linux benötigen je nach electron-builder-Version Wine/Mono."
  echo "Falls der Build daran scheitert, baue auf Windows oder installiere wine64 und mono-complete."
  echo
fi

npm run build
npm run native:rebuild:electron
npx electron-builder --win portable --x64

echo
echo "Fertig. Windows-Artefakte liegen unter:"
echo "  $ROOT_DIR/release"
echo
echo "Erwartete Dateien:"
echo "  Gremia.SBV-<version>-win-x64.exe              (portable EXE, kein Installer)"
