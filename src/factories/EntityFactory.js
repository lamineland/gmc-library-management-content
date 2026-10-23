/**
 * Factory pattern: the single place where domain entities come to life.
 *
 * Responsibilities:
 *  - assign identity via the injected id generator
 *  - stamp creation time via the injected clock
 *  - delegate invariant checks to the entity constructors
 *
 * Because identity/clock are injected, tests can use deterministic ids and time.
 */
import { Book, LENDING_TYPES } from '../domain/Book.js';
import { Loan } from '../domain/Loan.js';
import { Member, MEMBER_TYPES } from '../domain/Member.js';
import { ensureDate, ensureFunction, ensureInstance } from '../utils/validation.js';

export class EntityFactory {
  #generateId;

  #clock;

  /**
   * @param {{ idGenerator: (kind?: string) => string, clock: { now(): Date } }} deps
   */
  constructor({ idGenerator, clock }) {
    ensureFunction(idGenerator, 'idGenerator');
    ensureInstance(clock, Object, 'clock');
    this.#generateId = idGenerator;
    this.#clock = clock;
  }

  /**
   * @param {object} data
   * @returns {Book}
   */
  createBook({
    title,
    author,
    isbn,
    genre = 'General',
    publishedYear = null,
    lendingType = LENDING_TYPES.CIRCULATING,
    totalCopies = 1,
    availableCopies = totalCopies,
  } = {}) {
    return new Book({
      id: this.#generateId('book'),
      title,
      author,
      isbn,
      genre,
      publishedYear,
      lendingType,
      totalCopies,
      availableCopies,
      createdAt: this.#clock.now(),
    });
  }

  /**
   * @param {object} data
   * @returns {Member}
   */
  createMember({ name, email, type = MEMBER_TYPES.STANDARD } = {}) {
    return new Member({
      id: this.#generateId('member'),
      name,
      email,
      type,
      joinedAt: this.#clock.now(),
    });
  }

  /**
   * @param {{ bookId: string, memberId: string, borrowedAt?: Date, dueAt: Date }} data
   * @returns {Loan}
   */
  createLoan({ bookId, memberId, borrowedAt = this.#clock.now(), dueAt }) {
    ensureDate(borrowedAt, 'borrowedAt');
    ensureDate(dueAt, 'dueAt');
    return new Loan({
      id: this.#generateId('loan'),
      bookId,
      memberId,
      borrowedAt,
      dueAt,
    });
  }
}
