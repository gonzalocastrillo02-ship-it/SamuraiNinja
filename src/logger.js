// Buffer de logs por instancia. runner.js lo drena en cada heartbeat.

class LogBuffer {
  constructor(max = 200) {
    this.max = max;
    this.items = [];
  }
  push(level, category, message) {
    const l = ['debug', 'info', 'warning', 'error'].includes(level) ? level : 'info';
    this.items.push({ level: l, category: String(category || 'Core'), message: String(message).slice(0, 500) });
    if (this.items.length > this.max) this.items = this.items.slice(-this.max);
  }
  drain() {
    const out = this.items;
    this.items = [];
    return out;
  }
}

module.exports = { LogBuffer };
