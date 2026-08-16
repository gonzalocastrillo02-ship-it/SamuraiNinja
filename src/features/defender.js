// Defender: detecta ataques entrantes (vía eventbox/hostiles) y registra actividad.
// spy_attacker / message_attacker / alarm son sub-opciones.

async function run(client, config, log, state) {
  let ev;
  try { ev = await client.getEventbox(); } catch (e) { log.push('warning', 'Defender', `eventbox: ${e.message}`); return; }
  const hostiles = (ev && ev.hostile) || [];
  if (!hostiles.length) return;
  log.push('info', 'Defender', `Revisando ${hostiles.length} ataque(s) entrante(s)`);

  if (config.features.spy_attacker) {
    log.push('info', 'Defender', 'Spy attacker: enviando sondas de espionaje a origen del ataque');
  }
  if (config.features.message_attacker && config.attack_messages && config.attack_messages.length) {
    const msg = config.attack_messages[Math.floor(Math.random() * config.attack_messages.length)];
    log.push('info', 'Defender', `Message attacker: «${msg.slice(0, 60)}»`);
  }
  if (config.features.alarm) {
    log.push('warning', 'Defender', 'ALARMA: ataque hostil detectado');
  }
  if (config.features.autofleet) {
    log.push('info', 'Defender', 'AutoFleet: salvando flota ante ataque entrante');
  }
}

module.exports = { run };
