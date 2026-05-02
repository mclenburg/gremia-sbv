#!/usr/bin/env bash
set -euo pipefail

cat <<'MSG'
Gremia.SBV Linux-Dependency-Check
----------------------------------
Dieses Script installiert keine Systempakete automatisch ohne sudo-Aufruf, sondern zeigt die nötigen Schritte an.
MSG

if command -v apt >/dev/null 2>&1; then
  echo "\nDebian/Ubuntu/Linux Mint:"
  echo "  sudo apt update"
  echo "  sudo apt install -y build-essential python3 make g++"
elif command -v dnf >/dev/null 2>&1; then
  echo "\nFedora/RHEL:"
  echo "  sudo dnf groupinstall -y 'Development Tools'"
  echo "  sudo dnf install -y python3 make gcc-c++"
elif command -v pacman >/dev/null 2>&1; then
  echo "\nArch/Manjaro:"
  echo "  sudo pacman -S --needed base-devel python"
else
  echo "\nBitte Compiler-Toolchain, Python 3, make und g++ passend zu deiner Distribution installieren."
fi

cat <<'MSG'

Danach im Projektordner ausführen:
  rm -rf node_modules package-lock.json
  npm install

Falls das native Modul trotzdem nicht lädt oder eine NODE_MODULE_VERSION-Meldung erscheint:
  npm run native:rebuild:electron

MSG
