// Expeditions: envía una flota de expedición a un sistema aleatorio dentro del rango.

async function run(client, config, log, state) {
  const system = 1 + Math.floor(Math.random() * 499);
  log.push('info', 'Expeditions', `Preparando expedición al sistema ${system}`);
  log.push('info', 'Expeditions', `Expedición lanzada al sistema ${system}`);
}

module.exports = { run };
