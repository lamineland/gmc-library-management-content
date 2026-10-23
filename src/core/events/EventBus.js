/**
 * EventBus - the Subject half of the Observer pattern.
 *
 * - `subscribe(eventName, listener)` listens for one event, returns an
 *   unsubscribe function (clean teardown for DI containers/tests).
 * - `attach(observer)` registers any object implementing `update(envelope)`
 *   as a global observer (see core/interfaces/Observer.js).
 * - `publish(eventName, payload)` awaits listeners sequentially so side effects
 *   happen in a deterministic order.
 */
import { ensureFunction, ensureNonEmptyString } from '../../utils/validation.js';

export class EventBus {
  /** @type {Map<string, Set<Function>>} */
  #listeners = new Map();

  /** @type {Set<Function>} */
  #globalListeners = new Set();

  /**
   * @param {string} eventName
   * @param {(envelope: {eventName: string, payload: object, occurredAt: Date}) => any} listener
   * @returns {() => void} unsubscribe
   */
  subscribe(eventName, listener) {
    ensureNonEmptyString(eventName, 'eventName');
    ensureFunction(listener, 'listener');

    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }
    this.#listeners.get(eventName).add(listener);
    return () => this.unsubscribe(eventName, listener);
  }

  /**
   * Listen to every event.
   * @returns {() => void} unsubscribe
   */
  subscribeToAll(listener) {
    ensureFunction(listener, 'listener');
    this.#globalListeners.add(listener);
    return () => this.#globalListeners.delete(listener);
  }

  /**
   * Observer pattern: attach an object exposing `update(envelope)`.
   * @returns {() => void} detach
   */
  attach(observer) {
    if (!observer || typeof observer.update !== 'function') {
      throw new TypeError('observer must implement update(envelope)');
    }
    return this.subscribeToAll((envelope) => observer.update(envelope));
  }

  unsubscribe(eventName, listener) {
    const listeners = this.#listeners.get(eventName);
    if (!listeners) return false;
    const removed = listeners.delete(listener);
    if (listeners.size === 0) this.#listeners.delete(eventName);
    return removed;
  }

  /**
   * @param {string} eventName
   * @param {object} [payload]
   * @returns {Promise<any[]>} listener results
   */
  async publish(eventName, payload = {}) {
    ensureNonEmptyString(eventName, 'eventName');
    const envelope = Object.freeze({
      eventName,
      payload,
      occurredAt: new Date(),
    });

    const listeners = [...(this.#listeners.get(eventName) ?? []), ...this.#globalListeners];
    const results = [];
    for (const listener of listeners) {
      results.push(await listener(envelope));
    }
    return results;
  }

  /** Diagnostic helper - total listeners (specific + global) for an event. */
  listenerCount(eventName) {
    return (this.#listeners.get(eventName)?.size ?? 0) + this.#globalListeners.size;
  }

  clear() {
    this.#listeners.clear();
    this.#globalListeners.clear();
  }
}
