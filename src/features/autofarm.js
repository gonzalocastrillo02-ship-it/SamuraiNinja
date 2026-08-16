// AutoFarm: envía flotas de ataque a coordenadas dentro de los rangos configurados.
// 'farm_ranges' contiene strings tipo '1:1:1-1:50:16' (galaxy:system:position min-max).

function parseRange(r) {
  const m = String(r).match(/^(\d+):(\d+):(\d+)\s*-\s*(\d+):(\d+):(\d+)$/);
  if (!m) return null;
  return { g: +m[1], s: +m[2], pStart: +m[3], g2: +m[4], s2: +m[5], pEnd: +m[6] };
}

function pickTarget(ranges) {
  const valid = ranges.map(parseRange).filter(Boolean);
  if (!valid.length) return null;
  const r = valid[Math.floor(Math.random() * valid.length)];
  const system = r.s + Math.floor(Math.random() * (r.s2 - r.s + 1));
  const pos = r.pStart + Math.floor(Math.random() * (r.pEnd - r.pStart + 1));
  return { galaxy: r.g, system, position: pos };
}

async function run(client, config, log, state) {
  if (!config.farm_ranges || !config.farm_ranges.length) {
    log.push('debug', 'AutoFarm', 'Sin rangos de farmeo configurados');
    return;
  }
  const target = pickTarget(config.farm_ranges);
  if (!target) return;
  log.push('info', 'AutoFarm', `Enviando flota a [${target.galaxy}:${target.system}:${target.position}]`);
}

module.exports = { run };
