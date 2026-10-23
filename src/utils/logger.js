/**
 * Minimal injectable logger. The default sink is `console`, but tests can pass a
 * capture sink ({ debug, info, warn, error }) to assert on log output silently.
 */

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40, silent: 100 });

const DEFAULT_SINK = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

/**
 * @param {{ level?: string, sink?: object, name?: string }} [options]
 */
export function createLogger({ level = 'info', sink = DEFAULT_SINK, name = 'library' } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;

  const logAt = (severity, message, ...rest) => {
    if (LEVELS[severity] < threshold) return;
    const emit = sink[severity] ?? sink.info ?? (() => {});
    emit(`[${name}] ${severity.toUpperCase()} ${message}`, ...rest);
  };

  return {
    name,
    level: LEVELS[severityKey(threshold)],
    debug: (message, ...rest) => logAt('debug', message, ...rest),
    info: (message, ...rest) => logAt('info', message, ...rest),
    warn: (message, ...rest) => logAt('warn', message, ...rest),
    error: (message, ...rest) => logAt('error', message, ...rest),
    child: (childName) => createLogger({ level, sink, name: `${name}:${childName}` }),
  };
}

function severityKey(threshold) {
  return Object.keys(LEVELS).find((key) => LEVELS[key] === threshold) ?? 'info';
}

/** Sink that records everything instead of printing - handy in tests. */
export function createMemorySink() {
  const records = [];
  const capture = (severity) => (...args) => records.push({ severity, args });
  return {
    records,
    debug: capture('debug'),
    info: capture('info'),
    warn: capture('warn'),
    error: capture('error'),
  };
}
