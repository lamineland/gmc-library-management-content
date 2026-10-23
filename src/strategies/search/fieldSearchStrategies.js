/**
 * Field-matching search strategies (Strategy pattern).
 *
 * `FieldSearchStrategy` is the reusable engine: pick fields + match mode and you
 * have a new search strategy. The concrete classes below are one-liners.
 */
import { SearchStrategy } from '../../core/interfaces/SearchStrategy.js';
import { ensure, ensureNonEmptyString, ensureOneOf } from '../../utils/validation.js';

export const MATCH_MODES = Object.freeze({
  CONTAINS: 'contains',
  EXACT: 'exact',
  PREFIX: 'prefix',
});

export class FieldSearchStrategy extends SearchStrategy {
  #key;

  #fields;

  #matchMode;

  #label;

  constructor({ key, fields, matchMode = MATCH_MODES.CONTAINS, label }) {
    super();
    this.#key = ensureNonEmptyString(key, 'key');
    ensure(Array.isArray(fields) && fields.length > 0, '"fields" must be a non-empty array.');
    this.#fields = fields.map((field) => ensureNonEmptyString(field, 'field'));
    this.#matchMode = ensureOneOf(matchMode, Object.values(MATCH_MODES), 'matchMode');
    this.#label = label ?? `${this.#fields.join('/')} ${this.#matchMode} match`;
  }

  get key() {
    return this.#key;
  }

  describe() {
    return this.#label;
  }

  matches(book, query) {
    const needle = String(query ?? '').trim().toLowerCase();
    if (needle.length === 0) return false;

    return this.#fields.some((field) => {
      const value = String(book[field] ?? '').trim().toLowerCase();
      if (this.#matchMode === MATCH_MODES.EXACT) return value === needle;
      if (this.#matchMode === MATCH_MODES.PREFIX) return value.startsWith(needle);
      return value.includes(needle);
    });
  }
}

export class TitleSearchStrategy extends FieldSearchStrategy {
  constructor(options = {}) {
    super({ key: 'title', fields: ['title'], label: 'title contains query', ...options });
  }
}

export class AuthorSearchStrategy extends FieldSearchStrategy {
  constructor(options = {}) {
    super({ key: 'author', fields: ['author'], label: 'author contains query', ...options });
  }
}

export class IsbnSearchStrategy extends FieldSearchStrategy {
  constructor(options = {}) {
    super({
      key: 'isbn',
      fields: ['isbn'],
      matchMode: MATCH_MODES.EXACT,
      label: 'exact ISBN match',
      ...options,
    });
  }
}

export class GenreSearchStrategy extends FieldSearchStrategy {
  constructor(options = {}) {
    super({ key: 'genre', fields: ['genre'], label: 'genre contains query', ...options });
  }
}

/** Fallback strategy used by BookService: search any indexed field. */
export class AnyFieldSearchStrategy extends FieldSearchStrategy {
  constructor(options = {}) {
    super({
      key: 'any',
      fields: ['title', 'author', 'isbn', 'genre'],
      label: 'any of title/author/isbn/genre contains query',
      ...options,
    });
  }
}
