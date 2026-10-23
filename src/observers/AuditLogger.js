/**
 * Observer: keeps an in-memory audit trail of every domain event.
 * In production this could flush to a database/log file instead.
 */
import { Observer } from '../core/interfaces/Observer.js';

export class AuditLogger extends Observer {
  #logger;

  /** @type {{ eventName: string, occurredAt: Date, payload: object }[]} */
  #records = [];

  constructor({ logger = { debug() {}, info() {} } } = {}) {
    super();
    this.#logger = logger;
  }

  update(envelope) {
    this.#records.push({
      eventName: envelope.eventName,
      occurredAt: envelope.occurredAt,
      payload: envelope.payload,
    });
    this.#logger.info(`[audit] ${envelope.eventName}`);
    return true;
  }

  get records() {
    return [...this.#records];
  }

  countFor(eventName) {
    return this.#records.filter((record) => record.eventName === eventName).length;
  }

  clear() {
    this.#records = [];
  }
}
