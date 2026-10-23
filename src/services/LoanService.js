/**
 * Circulation use-cases: borrowing, returning, overdue reporting.
 *
 * LoanService is intentionally policy-free:
 *  - lending rules live in LendingStrategy (resolved via the registry)
 *  - fine calculation lives in OverduePricingStrategy
 *  - every interesting moment is published on the EventBus for observers
 *
 * Everything (repositories, factory, strategies, clock, event bus) is injected,
 * which is what makes the service testable without touching real time or I/O.
 */
import { Events } from '../core/events/events.js';
import { PolicyViolationError } from '../utils/errors.js';
import { addDays } from '../utils/date.js';
import { ensureNonEmptyString } from '../utils/validation.js';

export class LoanService {
  #loans;

  #books;

  #members;

  #entityFactory;

  #eventBus;

  #lendingStrategies;

  #overduePricing;

  #clock;

  #logger;

  /**
   * @param {{
   *   loanRepository: object,
   *   bookRepository: object,
   *   memberRepository: object,
   *   entityFactory: { createLoan: Function },
   *   eventBus: { publish: Function },
   *   lendingStrategies: { resolve: Function },
   *   overduePricing: { calculateFee: Function },
   *   clock: { now: Function },
   *   logger?: { debug: Function, info: Function, warn: Function },
   * }} deps
   */
  constructor({
    loanRepository,
    bookRepository,
    memberRepository,
    entityFactory,
    eventBus,
    lendingStrategies,
    overduePricing,
    clock,
    logger = { debug() {}, info() {}, warn() {} },
  }) {
    this.#loans = loanRepository;
    this.#books = bookRepository;
    this.#members = memberRepository;
    this.#entityFactory = entityFactory;
    this.#eventBus = eventBus;
    this.#lendingStrategies = lendingStrategies;
    this.#overduePricing = overduePricing;
    this.#clock = clock;
    this.#logger = logger;
  }

  /**
   * Check a book out to a member under the applicable lending policy.
   * @returns {Promise<import('../domain/Loan.js').Loan>}
   */
  async borrowBook({ memberId, bookId }) {
    ensureNonEmptyString(memberId, 'memberId');
    ensureNonEmptyString(bookId, 'bookId');

    const member = await this.#members.get(memberId);
    const book = await this.#books.get(bookId);

    if (!book.hasAvailableCopies) {
      throw new PolicyViolationError(
        `No copies of "${book.title}" are currently available.`,
        { bookId: book.id, availableCopies: book.availableCopies },
      );
    }

    const activeLoanCount = (await this.#loans.findActiveByMember(memberId)).length;
    const strategy = this.#lendingStrategies.resolve({ member, book });
    const decision = strategy.evaluate({ member, book, activeLoanCount, clock: this.#clock });

    if (!decision.allowed) {
      this.#logger.warn(`loan denied: ${decision.reason}`);
      throw new PolicyViolationError(decision.reason, {
        memberId,
        bookId,
        policy: decision.policy ?? strategy.key,
      });
    }

    const borrowedAt = this.#clock.now();
    const dueAt = addDays(borrowedAt, strategy.getLoanDurationDays());
    const loan = this.#entityFactory.createLoan({ bookId, memberId, borrowedAt, dueAt });

    book.checkoutCopy();
    await this.#books.save(book);
    await this.#loans.save(loan);

    this.#logger.info(`loan ${loan.id}: "${book.title}" -> ${member.name}, due ${dueAt.toISOString()}`);
    await this.#eventBus.publish(Events.LOAN_CREATED, {
      loan: loan.toJSON(),
      book: book.toJSON(),
      member: member.toJSON(),
      policy: strategy.key,
    });
    return loan;
  }

  /**
   * Return a borrowed copy and settle any overdue fee.
   * @returns {Promise<{ loan: import('../domain/Loan.js').Loan, fee: object }>}
   */
  async returnBook(loanId) {
    ensureNonEmptyString(loanId, 'loanId');

    const loan = await this.#loans.get(loanId);
    if (!loan.isActive) {
      throw new PolicyViolationError(`Loan "${loanId}" has already been returned.`, { loanId });
    }

    const book = await this.#books.get(loan.bookId);
    const member = await this.#members.get(loan.memberId);
    const returnedAt = this.#clock.now();
    const daysLate = loan.daysLate(returnedAt);
    const fee = this.#overduePricing.calculateFee({ loan, book, member, daysLate, returnedAt });

    loan.markReturned(returnedAt);
    book.returnCopy();

    await this.#loans.save(loan);
    await this.#books.save(book);

    await this.#eventBus.publish(Events.LOAN_RETURNED, {
      loan: loan.toJSON(),
      book: book.toJSON(),
      member: member.toJSON(),
      fee,
    });

    if (fee.amount > 0) {
      await this.#eventBus.publish(Events.FEE_CHARGED, {
        loanId: loan.id,
        memberId: member.id,
        fee,
      });
    }

    return { loan, fee };
  }

  async getLoan(loanId) {
    return this.#loans.get(loanId);
  }

  async getMemberLoans(memberId) {
    return this.#loans.findByMember(ensureNonEmptyString(memberId, 'memberId'));
  }

  async getActiveLoans() {
    return this.#loans.findManyBy((loan) => loan.isActive);
  }

  /** Loans past their due date at the clock's current time. */
  async getOverdueLoans() {
    return this.#loans.findOverdue(this.#clock.now());
  }

  /**
   * Emits `loan:overdue` for each overdue loan - lets observers (notices,
   * dashboards) react without polling the repository themselves.
   */
  async reportOverdueLoans() {
    const overdueLoans = await this.getOverdueLoans();
    const now = this.#clock.now();

    for (const loan of overdueLoans) {
      const book = await this.#books.get(loan.bookId);
      const member = await this.#members.get(loan.memberId);
      await this.#eventBus.publish(Events.LOAN_OVERDUE, {
        loan: loan.toJSON(),
        book: book.toJSON(),
        member: member.toJSON(),
        daysLate: loan.daysLate(now),
      });
    }
    return overdueLoans;
  }
}
