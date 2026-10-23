/**
 * Interface-like contract for catalog lookup strategies (Strategy pattern).
 *
 * A strategy answers "does this book match the given query?". Services combine
 * it with repository queries, so new matchers (fuzzy, year range, tags) can be
 * added without changing service code.
 */
import { NotImplementedError } from '../../utils/errors.js';

export class SearchStrategy {
  /** Stable key, e.g. "title". */
  get key() {
    throw new NotImplementedError('SearchStrategy.key');
  }

  /** Human readable description shown in UIs/logs. */
  describe() {
    throw new NotImplementedError('SearchStrategy.describe');
  }

  /**
   * @param {object} _book
   * @param {string} _query
   * @returns {boolean}
   */
  matches(_book, _query) {
    throw new NotImplementedError('SearchStrategy.matches');
  }
}
