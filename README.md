# SamuraiNinja

Bot de OGame en **Node.js** (sin dependencias externas — usa el `fetch` global de Node ≥ 18).
Gestionado desde **AutoBot Portal** (Base44): el panel lanza/para instancias y recibe
los logs reales; este bot vive en tu VPS, hace *pull* de las instancias activas y
*heartbeat* con los logs.

## Arquitectura

```
[Panel AutoBot Portal (Base44)]
        │  (1) pull: pide instancias "running"
        ▼
[botRunner (función backend)]
        │  (2) devuelve config completa por instancia
        ▼
[runner.js (VPS)]
        │  (3) lanza un Bot por instancia
        ▼
[Bot → OGameClient → OGame (lobby + servidor)]
        │  (4) ejecuta features activas, genera logs
        ▼
[runner.js] → heartbeat {logs, status} → botRunner → Panel
```

- **runner.js**: bucle principal. Cada `PULL_INTERVAL` segundos pide instancias activas,
  arranca nuevos bots y detiene los que ya no están activos. Vacía los logs de cada
  bot y los envía con `heartbeat`.
- **src/bot.js**: un bot por instancia. Login en OGame + bucle de *tick* que ejecuta
  las features activas y produce logs.
- **src/ogame/client.js**: cliente HTTP de OGame (login GameForge SSO → sesión de
  universo; lectura de eventbox, recursos, planetas; envío de flota).
- **src/features/*.js**: cada feature (defender, autofarm, expeditions, automine,
  autoresearch, autocargo, autoharvest, autocolonize).

## Instalación en el VPS (Ubuntu / IONOS)

```bash
# 1) Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 2) Clonar el repo
sudo mkdir -p /opt/samurai-ninja
sudo chown $USER:$USER /opt/samurai-ninja
git clone https://github.com/gonzalocastrillo02-ship-it/SamuraiNinja /opt/samurai-ninja
cd /opt/samurai-ninja

# 3) Configurar entorno
cp .env.example .env
nano .env   # rellena API_URL y RUNNER_API_KEY

# 4) (Opcional) instalar como servicio systemd
sudo cp samurai-ninja.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now samurai-ninja
sudo journalctl -u samurai-ninja -f
```

### Obtener `API_URL` y `RUNNER_API_KEY`

- `API_URL`: en Base44 → API → función `botRunner` → copia la URL.
- `RUNNER_API_KEY`: en Base44 → Settings → Secrets → crea/visualiza `RUNNER_API_KEY`.
  El valor debe ser idéntico en el `.env` del VPS.

## Uso

1. En el panel AutoBot Portal, crea una instancia con sus credenciales de OGame.
2. Activa las features que quieras (defender, autofarm, etc.).
3. Pulsa **Iniciar** (status = running).
4. En el VPS, el runner hace pull y arranca el bot en ~10 s.
5. Verás los logs reales aparecer en el panel (página Logs / detalle de instancia).

> El bot usa login nativo de GameForge + sesión de universo. Los detalles exactos de
> algunos endpoints de OGame pueden requerir ajustes menores según la versión del juego.
