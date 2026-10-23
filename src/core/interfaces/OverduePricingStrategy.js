/**
 * Interface-like contract for overdue fee calculation (Strategy pattern).
 *
 * Context passed to `calculateFee`:
 *   { loan, book, member, daysLate, returnedAt }
 */
import { NotImplementedError } from '../../utils/errors.js';

export class OverduePricingStrategy {
  /** Stable key used for logging/auditing, e.g. "flat". */
  get key() {
    throw new NotImplementedError('OverduePricingStrategy.key');
  }

  /**
   * @returns {{ amount: number, currency: string, daysLate: number, policy: string }}
   */
  calculateFee(_context) {
    throw new NotImplementedError('OverduePricingStrategy.calculateFee');
  }
}
