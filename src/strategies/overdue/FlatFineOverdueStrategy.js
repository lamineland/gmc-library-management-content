/**
 * Flat per-day fine with an optional cap. The default policy for most libraries.
 */
import { OverduePricingStrategy } from '../../core/interfaces/OverduePricingStrategy.js';
import { roundTo } from '../../utils/number.js';
import {
  ensureNonEmptyString,
  ensureNonNegativeInteger,
  ensurePositiveNumber,
} from '../../utils/validation.js';

export class FlatFineOverdueStrategy extends OverduePricingStrategy {
  #dailyRate;

  #cap;

  #currency;

  constructor({ dailyRate = 0.25, cap = 10, currency = 'USD' } = {}) {
    super();
    this.#dailyRate = ensurePositiveNumber(dailyRate, 'dailyRate');
    this.#cap = ensurePositiveNumber(cap, 'cap');
    this.#currency = ensureNonEmptyString(currency, 'currency');
  }

  get key() {
    return 'flat';
  }

  calculateFee({ daysLate }) {
    ensureNonNegativeInteger(daysLate, 'daysLate');
    const amount = daysLate <= 0 ? 0 : roundTo(Math.min(daysLate * this.#dailyRate, this.#cap));
    return {
      amount,
      currency: this.#currency,
      daysLate,
      policy: this.key,
    };
  }
}
