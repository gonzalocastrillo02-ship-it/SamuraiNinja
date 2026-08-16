// Cliente HTTP de OGame. Login GameForge SSO → sesión de universo. Lectura de estado
// (eventbox, recursos, planetas) y envío de flota.
// Nota: algunos endpoints de OGame cambian entre versiones; la estructura está pensada
// para ajustes menores contra un servidor real.

const LOBBY = 'https://lobby.ogame.gameforge.com';

function makeDispatcher(proxy) {
  if (!proxy) return null;
  try {
    const { ProxyAgent } = require('undici');
    const auth = proxy.username && proxy.password ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@` : '';
    return new ProxyAgent(`${proxy.type || 'http'}://${auth}${proxy.host}:${proxy.port}`);
  } catch (e) {
    return null;
  }
}

class OGameClient {
  constructor(cfg) {
    this.server = (cfg.server || '').trim();
    this.username = (cfg.username || '').trim();
    this.password = cfg.password || '';
    this.language = cfg.language || 'es';
    this.userAgent = cfg.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
    this.dispatcher = makeDispatcher(cfg.proxy);
    this.cookies = {};
    this.accountId = null;
    this.planetId = null;
    this.connected = false;
  }

  _cookieHeader() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  _setCookies(res) {
    const sc = res.headers.get('set-cookie');
    if (!sc) return;
    for (const c of sc.split(/,(?![^()]*\))/)) {
      const m = c.trim().match(/^([^=;]+)=([^;]*)/);
      if (m) this.cookies[m[1].trim()] = m[2].trim();
    }
  }

  async _req(url, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (this._cookieHeader()) headers.Cookie = this._cookieHeader();
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    headers['User-Agent'] = this.userAgent;
    const fetchOpts = { method: opts.method || 'GET', headers, redirect: 'manual' };
    if (opts.body) fetchOpts.body = opts.body;
    if (this.dispatcher) fetchOpts.dispatcher = this.dispatcher;
    return fetch(url, fetchOpts);
  }

  _gameUrl(path, params = {}) {
    const u = new URL(`https://${this.server}/game/index.php`);
    if (this.planetId) params.cp = this.planetId;
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    u.searchParams.set('page', path);
    return u.toString();
  }

  async login() {
    if (!this.server || !this.username || !this.password) throw new Error('Faltan server/username/password');
    // 1) Login lobby
    const lobbyLogin = await this._req(`${LOBBY}/api/users`, {
      method: 'POST',
      body: JSON.stringify({ email: this.username, password: this.password }),
    });
    this._setCookies(lobbyLogin);
    // 2) Cuentas
    const accRes = await this._req(`${LOBBY}/api/users/me/accounts`);
    if (!accRes.ok) throw new Error('login: no se pudo obtener lista de cuentas');
    const accounts = await accRes.json();
    const acc = Array.isArray(accounts)
      ? accounts.find((a) => a.group === this.server || a.server === this.server || a.serverGroup === this.server)
      : null;
    this.accountId = acc ? (acc.id || acc.accountId) : null;
    if (!this.accountId) throw new Error(`login: no se encontró cuenta en ${this.server}`);
    // 3) Login token
    const tokenUrl = new URL(`${LOBBY}/api/users/me/loginToken`);
    tokenUrl.searchParams.set('account', this.accountId);
    tokenUrl.searchParams.set('language', this.language);
    tokenUrl.searchParams.set('server', this.server);
    const tokenRes = await this._req(tokenUrl.toString(), { method: 'POST' });
    if (!tokenRes.ok) throw new Error('login: no se pudo obtener loginToken');
    const tokenData = await tokenRes.json();
    const token = tokenData && (tokenData.token || tokenData.loginToken);
    if (!token) throw new Error('login: loginToken vacío');
    // 4) Sesión de universo
    const gameUrl = new URL(`https://${this.server}/game/index.php`);
    gameUrl.searchParams.set('loginToken', token);
    const gameRes = await this._req(gameUrl.toString(), { method: 'GET' });
    this._setCookies(gameRes);
    this.connected = true;
    // 5) Planeta actual desde la landing
    const html = await gameRes.text();
    const pm = html.match(/currentPlanet\s*=\s*(\d+)/) || html.match(/planet=([0-9]+)/);
    if (pm) this.planetId = pm[1];
    return { ok: true, planetId: this.planetId };
  }

  async _getJson(path, params) {
    const res = await this._req(this._gameUrl(path, params), { headers: { Accept: 'application/json, text/javascript, */*; q=0.01' } });
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return { raw: txt }; }
  }

  async getEventbox() {
    return this._getJson('fetchEventbox');
  }
  async getPlanets() {
    const res = await this._req(this._gameUrl('ingame', { page: 'planetlist' }));
    const html = await res.text();
    const ids = [...html.matchAll(/planet=([0-9]+)/g)].map((m) => m[1]);
    return [...new Set(ids)];
  }
  async getOverview(planetId) {
    const old = this.planetId; this.planetId = planetId || this.planetId;
    const res = await this._req(this._gameUrl('overview'));
    this.planetId = old;
    const html = await res.text();
    return { html };
  }

  async sendFleet({ origin, target, mission, ships, speed = 10, cargo = {} }) {
    const form = new URLSearchParams();
    form.set('galaxy', target.galaxy || '');
    form.set('system', target.system || '');
    form.set('position', target.position || '');
    form.set('type', target.type || '1');
    form.set('mission', String(mission));
    form.set('speed', String(speed));
    form.set('token', '');
    for (const [k, v] of Object.entries(ships || {})) form.set(`am${k}`, String(v));
    for (const [k, v] of Object.entries(cargo)) form.set(`cargo${k}`, String(v));
    const res = await this._req(this._gameUrl('fleet2', { page: 'fleet2' }), {
      method: 'POST', body: form.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json, text/javascript, */*; q=0.01' },
    });
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return { ok: res.ok, raw: txt.slice(0, 200) }; }
  }

  async close() { this.connected = false; }
}

module.exports = { OGameClient };
