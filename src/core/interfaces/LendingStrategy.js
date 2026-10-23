/**
 * Interface-like contract for lending policies (Strategy pattern).
 *
 * A strategy decides *whether* a loan may happen and *for how long*, keeping
 * policy rules out of the LoanService. Context passed to `evaluate`:
 *   { member, book, activeLoanCount, clock }
 */
import { NotImplementedError } from '../../utils/errors.js';

export class LendingStrategy {
  /** Stable key used by the registry, e.g. "standard". */
  get key() {
    throw new NotImplementedError('LendingStrategy.key');
  }

  /** @returns {number} loan duration in days */
  getLoanDurationDays() {
    throw new NotImplementedError('LendingStrategy.getLoanDurationDays');
  }

  /** @returns {number} maximum concurrent loans for a member under this policy */
  getMaxActiveLoans() {
    throw new NotImplementedError('LendingStrategy.getMaxActiveLoans');
  }

  /**
   * @param {{ member: object, book: object, activeLoanCount: number, clock: object }} _context
   * @returns {{ allowed: boolean, reason: string, policy?: string }}
   */
  evaluate(_context) {
    throw new NotImplementedError('LendingStrategy.evaluate');
  }
}
