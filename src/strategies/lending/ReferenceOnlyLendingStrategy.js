/**
 * Policy for reference-only titles: nothing ever leaves the building.
 * Used as a book-level override (see LendingStrategyRegistry#resolve).
 */
import { LendingStrategy } from '../../core/interfaces/LendingStrategy.js';

export class ReferenceOnlyLendingStrategy extends LendingStrategy {
  get key() {
    return 'reference';
  }

  getLoanDurationDays() {
    return 0;
  }

  getMaxActiveLoans() {
    return 0;
  }

  evaluate({ book }) {
    return {
      allowed: false,
      policy: this.key,
      reason: `"${book.title}" is a reference-only title and cannot be checked out.`,
    };
  }
}
