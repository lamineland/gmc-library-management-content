/** Loan persistence with loan-lifecycle lookups. */
import { InMemoryRepository } from './InMemoryRepository.js';

export class InMemoryLoanRepository extends InMemoryRepository {
  constructor(options = {}) {
    super({ entityLabel: 'Loan', ...options });
  }

  findActiveByMember(memberId) {
    return this.findManyBy((loan) => loan.isActive && loan.memberId === memberId);
  }

  findActiveByBook(bookId) {
    return this.findManyBy((loan) => loan.isActive && loan.bookId === bookId);
  }

  findOverdue(now = new Date()) {
    return this.findManyBy((loan) => loan.isOverdue(now));
  }

  findByMember(memberId) {
    return this.findManyBy((loan) => loan.memberId === memberId);
  }
}
