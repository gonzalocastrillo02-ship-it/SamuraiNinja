// Mapea el job (payload de BotInstance desde el panel) a la config interna del bot.

function mapJobToConfig(job) {
  const f = job.features || {};
  return {
    id: job.id,
    alias: job.alias || 'TBot',
    universe: job.universe || '',
    server: job.server || '',
    username: job.username || '',
    password: job.password || '',
    language: (job.language || 'es').toLowerCase(),
    fingerprint: job.fingerprint || '',
    user_agent: job.user_agent || '',
    timezone: job.timezone || 'Europe/Madrid',
    screen: job.screen || '1920x1080',
    proxy: job.proxy || null,
    features: {
      defender: !!f.defender_enabled,
      autofleet: !!f.autofleet_enabled,
      message_attacker: !!f.message_attacker_enabled,
      spy_attacker: !!f.spy_attacker_enabled,
      alarm: !!f.alarm_enabled,
      expeditions: !!f.expeditions_enabled,
      autocargo: !!f.autocargo_enabled,
      autorepatriate: !!f.autorepatriate_enabled,
      automine: !!f.automine_enabled,
      autoresearch: !!f.autoresearch_enabled,
      autofarm: !!f.autofarm_enabled,
      autoharvest: !!f.autoharvest_enabled,
      autocolonize: !!f.autocolonize_enabled,
      sleep_mode: !!f.sleep_mode_enabled,
      auto_fleet_save: !!f.auto_fleet_save_enabled,
    },
    sleep_start: job.sleep_start || '23:15',
    sleep_end: job.sleep_end || '07:05',
    attack_messages: job.attack_messages || [],
    colonize_targets: job.colonize_targets || [],
    farm_ranges: job.farm_ranges || [],
  };
}

module.exports = { mapJobToConfig };
