/**
 * Factory + Registry pattern for persistence backends.
 *
 * Backends self-register on module load. Adding e.g. a SQLite backend later is a
 * matter of `RepositoryFactory.register('sqlite', ...)` - no service code changes.
 *
 * `createSet` returns `{ books, members, loans }` so the composition root can
 * wire the whole persistence layer in one call.
 */
import { InMemoryBookRepository } from '../repositories/InMemoryBookRepository.js';
import { InMemoryLoanRepository } from '../repositories/InMemoryLoanRepository.js';
import { InMemoryMemberRepository } from '../repositories/InMemoryMemberRepository.js';
import { ValidationError } from '../utils/errors.js';
import { ensureFunction, ensureNonEmptyString } from '../utils/validation.js';

export class RepositoryFactory {
  /** @type {Map<string, (options: object) => object>} */
  static #registry = new Map();

  /**
   * @param {string} type backend identifier, e.g. "in-memory"
   * @param {(options: object) => { books: object, members: object, loans: object }} createSet
   */
  static register(type, createSet) {
    ensureNonEmptyString(type, 'type');
    ensureFunction(createSet, 'createSet');
    this.#registry.set(type, createSet);
    return this;
  }

  /**
   * @param {string} [type]
   * @param {object} [options]
   * @returns {{ books: object, members: object, loans: object }}
   */
  static createSet(type = 'in-memory', options = {}) {
    const create = this.#registry.get(type);
    if (!create) {
      throw new ValidationError(
        `Unknown repository type "${type}". Registered types: ${this.supportedTypes().join(', ')}`,
        { type, supported: this.supportedTypes() },
      );
    }
    return create(options);
  }

  static supportedTypes() {
    return [...this.#registry.keys()];
  }
}

RepositoryFactory.register('in-memory', (options = {}) => ({
  books: new InMemoryBookRepository(options),
  members: new InMemoryMemberRepository(options),
  loans: new InMemoryLoanRepository(options),
}));
