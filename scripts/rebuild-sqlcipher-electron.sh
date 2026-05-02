#!/usr/bin/env bash
set -euo pipefail

echo "Gremia.SBV: SQLCipher native Modul für Electron neu bauen"
echo "----------------------------------------------------------"

if [ ! -d node_modules ]; then
  echo "node_modules fehlt. Führe zuerst npm install aus."
  exit 1
fi

npx electron-rebuild -f -w better-sqlite3-multiple-ciphers

echo ""
echo "Fertig. Danach starten mit:"
echo "  rm -rf dist dist-electron"
echo "  npm run dev"
