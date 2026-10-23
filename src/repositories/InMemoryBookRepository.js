/** Book persistence with catalog-specific lookups. */
import { InMemoryRepository } from './InMemoryRepository.js';

export class InMemoryBookRepository extends InMemoryRepository {
  constructor(options = {}) {
    super({ entityLabel: 'Book', ...options });
  }

  findByIsbn(isbn) {
    return this.findOneBy((book) => book.isbn === isbn);
  }

  findByGenre(genre) {
    return this.findManyBy((book) => book.genre.toLowerCase() === String(genre).toLowerCase());
  }

  findAvailable() {
    return this.findManyBy((book) => book.hasAvailableCopies);
  }
}
