#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPIMAGE="$(find "$ROOT_DIR/release" -maxdepth 1 -type f -name '*.AppImage' | sort | tail -n 1 || true)"

if [[ -z "$APPIMAGE" ]]; then
  echo "Keine AppImage-Datei in release/ gefunden. Bitte zuerst ausführen: npm run build:linux" >&2
  exit 1
fi

chmod +x "$APPIMAGE"
mkdir -p "$HOME/.local/share/applications" "$HOME/.local/share/icons/hicolor/512x512/apps"
ICON_SOURCE="$ROOT_DIR/assets/icons/png/512x512.png"
ICON_TARGET="$HOME/.local/share/icons/hicolor/512x512/apps/gremia-sbv.png"
if [[ -f "$ICON_SOURCE" ]]; then
  cp "$ICON_SOURCE" "$ICON_TARGET"
fi

cat > "$HOME/.local/share/applications/gremia-sbv.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Gremia.SBV
Comment=Offline-Fallakte der Schwerbehindertenvertretung
Exec=$APPIMAGE
Terminal=false
Categories=Office;
StartupNotify=true
StartupWMClass=Gremia.SBV
Icon=gremia-sbv
DESKTOP

echo "Launcher angelegt: $HOME/.local/share/applications/gremia-sbv.desktop"
echo "Icon installiert: $ICON_TARGET"
echo "Bei Bedarf ausführen: gtk-update-icon-cache ~/.local/share/icons/hicolor 2>/dev/null || true"
echo "Bei Bedarf einmal ab- und anmelden oder das Anwendungsmenü aktualisieren."
