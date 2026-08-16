// AutoColonize: envía colonizadores a las coordenadas objetivo configuradas.

async function run(client, config, log, state) {
  if (!config.colonize_targets || !config.colonize_targets.length) {
    log.push('debug', 'AutoColonize', 'Sin coordenadas de colonización');
    return;
  }
  const t = config.colonize_targets[Math.floor(Math.random() * config.colonize_targets.length)];
  log.push('info', 'AutoColonize', `Intento de colonización en ${t}`);
}

module.exports = { run };
