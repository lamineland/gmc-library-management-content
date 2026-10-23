/**
 * Loan entity - the association between a member and a book copy over time.
 */
import { startedDaysBetween } from '../utils/date.js';
import {
  ensure,
  ensureDate,
  ensureNonEmptyString,
  ensureOneOf,
} from '../utils/validation.js';
import { ValidationError } from '../utils/errors.js';

export const LOAN_STATUS = Object.freeze({
  ACTIVE: 'active',
  RETURNED: 'returned',
});

export class Loan {
  constructor({
    id,
    bookId,
    memberId,
    borrowedAt,
    dueAt,
    returnedAt = null,
    status = LOAN_STATUS.ACTIVE,
  }) {
    this.id = ensureNonEmptyString(id, 'id');
    this.bookId = ensureNonEmptyString(bookId, 'bookId');
    this.memberId = ensureNonEmptyString(memberId, 'memberId');
    this.borrowedAt = ensureDate(borrowedAt, 'borrowedAt');
    this.dueAt = ensureDate(dueAt, 'dueAt');

    ensure(
      this.dueAt.getTime() >= this.borrowedAt.getTime(),
      '"dueAt" cannot be before "borrowedAt".',
      { borrowedAt, dueAt },
    );

    if (returnedAt !== null) {
      ensureDate(returnedAt, 'returnedAt');
    }
    this.returnedAt = returnedAt;
    this.status = ensureOneOf(status, Object.values(LOAN_STATUS), 'status');
  }

  get isActive() {
    return this.status === LOAN_STATUS.ACTIVE;
  }

  get isReturned() {
    return this.status === LOAN_STATUS.RETURNED;
  }

  /** @param {Date} now */
  isOverdue(now = new Date()) {
    return this.isActive && new Date(now).getTime() > this.dueAt.getTime();
  }

  /**
   * Billable late days (each started day counts once).
   * @param {Date} now
   */
  daysLate(now = new Date()) {
    if (!this.isOverdue(now)) return 0;
    return startedDaysBetween(this.dueAt, now);
  }

  markReturned(at = new Date()) {
    if (this.isReturned) {
      throw new ValidationError(`Loan "${this.id}" has already been returned.`, {
        loanId: this.id,
      });
    }
    this.returnedAt = ensureDate(at, 'at');
    this.status = LOAN_STATUS.RETURNED;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      bookId: this.bookId,
      memberId: this.memberId,
      borrowedAt: this.borrowedAt,
      dueAt: this.dueAt,
      returnedAt: this.returnedAt,
      status: this.status,
    };
  }
}
