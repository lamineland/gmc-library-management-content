/**
 * Catalog use-cases: acquire books, grow collections, look titles up.
 *
 * All collaborators arrive through the constructor (dependency injection), so
 * this service is trivially unit-testable with fakes.
 */
import { Events } from '../core/events/events.js';
import { NotFoundError, PolicyViolationError } from '../utils/errors.js';
import { ensureNonEmptyString, ensurePositiveInteger } from '../utils/validation.js';
import { AnyFieldSearchStrategy } from '../strategies/search/fieldSearchStrategies.js';

export class BookService {
  #books;

  #entityFactory;

  #eventBus;

  #searchStrategy;

  /**
   * @param {{
   *   bookRepository: object,
   *   entityFactory: { createBook: Function },
   *   eventBus: { publish: Function },
   *   searchStrategy?: { matches: Function },
   * }} deps
   */
  constructor({ bookRepository, entityFactory, eventBus, searchStrategy = new AnyFieldSearchStrategy() }) {
    this.#books = bookRepository;
    this.#entityFactory = entityFactory;
    this.#eventBus = eventBus;
    this.#searchStrategy = searchStrategy;
  }

  /** @returns {Promise<import('../domain/Book.js').Book>} */
  async addBook(input) {
    const book = this.#entityFactory.createBook(input);

    const duplicate = await this.#books.findByIsbn(book.isbn);
    if (duplicate) {
      throw new PolicyViolationError(
        `A book with ISBN "${book.isbn}" already exists ("${duplicate.title}").`,
        { isbn: book.isbn, existingId: duplicate.id },
      );
    }

    await this.#books.save(book);
    await this.#eventBus.publish(Events.BOOK_ADDED, { book: book.toJSON() });
    return book;
  }

  /** Donate/acquire additional copies of an existing title. */
  async addCopies(bookId, count) {
    ensureNonEmptyString(bookId, 'bookId');
    ensurePositiveInteger(count, 'count');

    const book = await this.#books.get(bookId);
    book.addCopies(count);
    await this.#books.save(book);
    await this.#eventBus.publish(Events.BOOK_UPDATED, { book: book.toJSON() });
    return book;
  }

  async getBook(bookId) {
    return this.#books.get(bookId);
  }

  async findBookByIsbn(isbn) {
    const book = await this.#books.findByIsbn(ensureNonEmptyString(isbn, 'isbn'));
    if (!book) throw new NotFoundError('Book (by ISBN)', isbn);
    return book;
  }

  async listBooks() {
    return this.#books.findAll();
  }

  /**
   * @param {string} query
   * @param {{ strategy?: { matches: Function } }} [options] one-off strategy override
   */
  async searchBooks(query, { strategy } = {}) {
    const matcher = strategy ?? this.#searchStrategy;
    return this.#books.findManyBy((book) => matcher.matches(book, query));
  }

  /** Exposes the injected default strategy (for UI hints/debugging). */
  get searchStrategy() {
    return this.#searchStrategy;
  }
}
