/**
 * Escalating fine: cheap for the first days, punitive afterwards.
 * Example defaults: $0.10/day for the first 7 days, then $0.50/day, capped at $25.
 */
import { OverduePricingStrategy } from '../../core/interfaces/OverduePricingStrategy.js';
import { roundTo } from '../../utils/number.js';
import {
  ensure,
  ensureNonEmptyString,
  ensureNonNegativeInteger,
  ensurePositiveNumber,
} from '../../utils/validation.js';

export class ProgressiveFineOverdueStrategy extends OverduePricingStrategy {
  #dailyRate;

  #escalatingDailyRate;

  #escalationAfterDays;

  #cap;

  #currency;

  constructor({
    dailyRate = 0.1,
    escalatingDailyRate = 0.5,
    escalationAfterDays = 7,
    cap = 25,
    currency = 'USD',
  } = {}) {
    super();
    this.#dailyRate = ensurePositiveNumber(dailyRate, 'dailyRate');
    this.#escalatingDailyRate = ensurePositiveNumber(escalatingDailyRate, 'escalatingDailyRate');
    this.#escalationAfterDays = ensureNonNegativeInteger(escalationAfterDays, 'escalationAfterDays');
    this.#cap = ensurePositiveNumber(cap, 'cap');
    this.#currency = ensureNonEmptyString(currency, 'currency');
    ensure(this.#cap > 0, '"cap" must be greater than zero.');
  }

  get key() {
    return 'progressive';
  }

  calculateFee({ daysLate }) {
    ensureNonNegativeInteger(daysLate, 'daysLate');
    if (daysLate <= 0) {
      return { amount: 0, currency: this.#currency, daysLate: 0, policy: this.key };
    }

    const firstPhaseDays = Math.min(daysLate, this.#escalationAfterDays);
    const secondPhaseDays = Math.max(0, daysLate - this.#escalationAfterDays);
    const raw =
      firstPhaseDays * this.#dailyRate + secondPhaseDays * this.#escalatingDailyRate;
    const amount = roundTo(Math.min(raw, this.#cap));

    return {
      amount,
      currency: this.#currency,
      daysLate,
      policy: this.key,
    };
  }
}
