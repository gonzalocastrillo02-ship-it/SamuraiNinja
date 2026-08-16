// SamuraiNinja runner — pull/heartbeat con la función botRunner de Base44.
// Sin dependencias: usa fetch global (Node >= 18).

const fs = require('fs');
const path = require('path');
const { Bot } = require('./src/bot');
const { mapJobToConfig } = require('./src/config');

function loadEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const ENV = loadEnv();
const API_URL = ENV.API_URL || process.env.API_URL;
const RUNNER_API_KEY = ENV.RUNNER_API_KEY || process.env.RUNNER_API_KEY;
const PULL_INTERVAL = parseInt(ENV.PULL_INTERVAL || process.env.PULL_INTERVAL || '10', 10);
const TICK_INTERVAL = parseInt(ENV.TICK_INTERVAL || process.env.TICK_INTERVAL || '30', 10);

if (!API_URL || !RUNNER_API_KEY) {
  console.error('Falta API_URL o RUNNER_API_KEY en .env');
  process.exit(1);
}

const bots = new Map();

async function apiCall(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-runner-key': RUNNER_API_KEY },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function startBot(job) {
  const config = mapJobToConfig(job);
  const bot = new Bot(config, { tickInterval: TICK_INTERVAL });
  bots.set(job.id, bot);
  bot.start().catch((e) => bot.log.push('error', 'Core', `start: ${e.message}`));
}

async function stopBot(id) {
  const bot = bots.get(id);
  if (!bot) return;
  await bot.stop();
  try { await apiCall({ instance_id: id, status: 'stopped', logs: bot.log.drain() }); }
  catch (e) { /* ignore */ }
  bots.delete(id);
}

async function flushLogs() {
  for (const [id, bot] of bots) {
    const logs = bot.log.drain();
    const payload = { instance_id: id, logs };
    if (bot.running && bot.client.connected) payload.status = 'running';
    try { await apiCall(payload); } catch (e) { /* reintento próximo ciclo */ }
  }
}

async function mainLoop() {
  console.log(`SamuraiNinja runner iniciado · pull cada ${PULL_INTERVAL}s · tick cada ${TICK_INTERVAL}s`);
  while (true) {
    try {
      const { jobs } = await apiCall({ action: 'pull' });
      const activeIds = new Set((jobs || []).map((j) => j.id));
      for (const job of jobs || []) {
        if (!bots.has(job.id)) {
          console.log(`Arrancando instancia ${job.alias || job.id}`);
          await startBot(job);
        }
      }
      for (const id of [...bots.keys()]) {
        if (!activeIds.has(id)) {
          console.log(`Deteniendo instancia ${id}`);
          await stopBot(id);
        }
      }
      await flushLogs();
    } catch (e) {
      console.error('mainLoop error:', e.message);
    }
    await new Promise((r) => setTimeout(r, PULL_INTERVAL * 1000));
  }
}

mainLoop().catch((e) => { console.error(e); process.exit(1); });
