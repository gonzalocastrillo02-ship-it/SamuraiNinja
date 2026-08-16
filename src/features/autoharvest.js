// AutoHarvest: envía recicladores a escombros.

async function run(client, config, log, state) {
  let ev;
  try { ev = await client.getEventbox(); } catch { return; }
  const debris = ev && ev.debris;
  if (debris && debris.length) log.push('info', 'AutoHarvest', `${debris.length} campo(s) de escombros detectado(s)`);
  else log.push('debug', 'AutoHarvest', 'Sin escombros para cosechar');
}

module.exports = { run };
