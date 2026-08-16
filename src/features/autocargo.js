// AutoCargo: transporta recursos entre planetas propios para redistribuir.

async function run(client, config, log, state) {
  if (!state.planetsLoaded) {
    try { state.planets = await client.getPlanets(); state.planetsLoaded = true; }
    catch (e) { log.push('warning', 'AutoCargo', `planetas: ${e.message}`); return; }
  }
  if (state.planets.length < 2) { log.push('debug', 'AutoCargo', 'Se necesitan 2+ planetas'); return; }
  log.push('debug', 'AutoCargo', `Redistribuyendo entre ${state.planets.length} planetas`);
}

module.exports = { run };
