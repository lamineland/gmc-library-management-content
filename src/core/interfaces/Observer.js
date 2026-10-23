/**
 * Interface-like contract for event observers (Observer pattern).
 *
 * Observers are attached to the EventBus and receive every published envelope:
 *   { eventName, payload, occurredAt }
 */
import { NotImplementedError } from '../../utils/errors.js';

export class Observer {
  /** @param {{ eventName: string, payload: object, occurredAt: Date }} _envelope */
  update(_envelope) {
    throw new NotImplementedError('Observer.update');
  }
}
