// Un bot por instancia. Login en OGame + bucle de tick que ejecuta las features activas.

const { OGameClient } = require('./ogame/client');
const { LogBuffer } = require('./logger');

const FEATURES = {
  defender: require('./features/defender'),
  autofarm: require('./features/autofarm'),
  expeditions: require('./features/expeditions'),
  automine: require('./features/automine'),
  autoresearch: require('./features/autoresearch'),
  autocargo: require('./features/autocargo'),
  autoharvest: require('./features/autoharvest'),
  autocolonize: require('./features/autocolonize'),
};

class Bot {
  constructor(config, { tickInterval = 30 } = {}) {
    this.config = config;
    this.tickInterval = tickInterval;
    this.log = new LogBuffer();
    this.client = new OGameClient(config);
    this.running = false;
    this.timer = null;
    this.state = { planets: [], planetsLoaded: false };
  }

  async start() {
    this.running = true;
    this.log.push('info', 'Core', `Arrancando bot para ${this.config.alias} (${this.config.server})`);
    try {
      const r = await this.client.login();
      this.log.push('info', 'Auth', `Sesión OGame iniciada · planeta ${r.planetId || '?'}`);
    } catch (e) {
      this.log.push('error', 'Auth', `Login fallido: ${e.message}`);
      this.running = false;
      return;
    }
    const tick = () => { this.tick().catch((e) => this.log.push('error', 'Core', `tick: ${e.message}`)); };
    tick();
    this.timer = setInterval(tick, this.tickInterval * 1000);
  }

  async stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.log.push('info', 'Core', `Bot detenido: ${this.config.alias}`);
    await this.client.close();
  }

  _isSleepTime() {
    if (!this.config.features.sleep_mode) return false;
    try {
      const now = new Date();
      const cur = now.getHours() * 60 + now.getMinutes();
      const [sh, sm] = (this.config.sleep_start || '23:15').split(':').map(Number);
      const [eh, em] = (this.config.sleep_end || '07:05').split(':').map(Number);
      const s = sh * 60 + sm, e = eh * 60 + em;
      return s <= e ? (cur >= s && cur < e) : (cur >= s || cur < e);
    } catch { return false; }
  }

  async tick() {
    if (!this.running || !this.client.connected) return;
    if (this._isSleepTime()) {
      this.log.push('info', 'Sleep', `Modo sueño activo (${this.config.sleep_start}-${this.config.sleep_end})`);
      return;
    }
    // Eventbox: eventos de flota en curso
    try {
      const ev = await this.client.getEventbox();
      const hostile = ev.hostile && ev.hostile.length;
      if (hostile) this.log.push('warning', 'Defender', `${hostile} flota(s) hostil(es) entrante(s)`);
    } catch (e) {
      this.log.push('warning', 'Core', `eventbox: ${e.message}`);
    }
    // Features activas
    for (const [key, fn] of Object.entries(FEATURES)) {
      if (this.config.features[key]) {
        try { await fn.run(this.client, this.config, this.log, this.state); }
        catch (e) { this.log.push('warning', key, `error: ${e.message}`); }
      }
    }
  }
}

module.exports = { Bot };
