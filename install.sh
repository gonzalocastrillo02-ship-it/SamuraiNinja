#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="/opt/samurai-ninja"

if [[ $EUID -ne 0 ]]; then echo "Ejecuta como root (sudo)"; exit 1; fi

# Node.js 18+
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]]; then
  echo "Instalando Node.js 18…"
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
fi

# Clonar repo
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone https://github.com/gonzalocastrillo02-ship-it/SamuraiNinja "$INSTALL_DIR"
else
  git -C "$INSTALL_DIR" pull --ff-only || true
fi

# .env
if [[ ! -f "$INSTALL_DIR/.env" ]]; then
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  echo "Creado $INSTALL_DIR/.env — edítalo con API_URL y RUNNER_API_KEY"
fi

# Logs
touch /var/log/samurai-ninja.log

# systemd
cp "$INSTALL_DIR/samurai-ninja.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable samurai-ninja
systemctl restart samurai-ninja

echo "Hecho. Estado: systemctl status samurai-ninja · Logs: journalctl -u samurai-ninja -f"
