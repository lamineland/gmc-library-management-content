/**
 * Reusable base for configurable lending policies (Template-style reuse):
 * subclasses only supply their defaults; the decision logic lives here once.
 */
import { LendingStrategy } from '../../core/interfaces/LendingStrategy.js';
import { ensurePositiveInteger } from '../../utils/validation.js';

export class BaseLendingStrategy extends LendingStrategy {
  #key;

  #durationDays;

  #maxActiveLoans;

  constructor({ key, durationDays, maxActiveLoans }) {
    super();
    this.#key = key;
    this.#durationDays = ensurePositiveInteger(durationDays, 'durationDays');
    this.#maxActiveLoans = ensurePositiveInteger(maxActiveLoans, 'maxActiveLoans');
  }

  get key() {
    return this.#key;
  }

  getLoanDurationDays() {
    return this.#durationDays;
  }

  getMaxActiveLoans() {
    return this.#maxActiveLoans;
  }

  /**
   * Shared policy checks: account standing + concurrent loan limit.
   * Subclasses may override to add extra rules (and call super.evaluate first).
   */
  evaluate({ member, activeLoanCount }) {
    if (!member.isActive) {
      return {
        allowed: false,
        policy: this.key,
        reason: `Member "${member.name}" is not an active member.`,
      };
    }
    if (activeLoanCount >= this.#maxActiveLoans) {
      return {
        allowed: false,
        policy: this.key,
        reason: `Member "${member.name}" already has ${activeLoanCount} active loan(s); the "${this.key}" policy allows ${this.#maxActiveLoans}.`,
      };
    }
    return {
      allowed: true,
      policy: this.key,
      reason: `Loan approved under the "${this.key}" policy (${this.#durationDays} day(s)).`,
    };
  }
}
