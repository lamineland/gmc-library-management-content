/**
 * Book entity - the aggregate root of the catalog.
 * Entities enforce their own invariants; factories only supply identity/time.
 */
import { PolicyViolationError, ValidationError } from '../utils/errors.js';
import {
  ensure,
  ensureNonEmptyString,
  ensureNonNegativeInteger,
  ensureOneOf,
  ensurePositiveInteger,
} from '../utils/validation.js';

export const LENDING_TYPES = Object.freeze({
  CIRCULATING: 'circulating',
  REFERENCE: 'reference',
});

export class Book {
  constructor({
    id,
    title,
    author,
    isbn,
    genre = 'General',
    publishedYear = null,
    lendingType = LENDING_TYPES.CIRCULATING,
    totalCopies = 1,
    availableCopies = totalCopies,
    createdAt = new Date(),
  }) {
    this.id = ensureNonEmptyString(id, 'id');
    this.title = ensureNonEmptyString(title, 'title');
    this.author = ensureNonEmptyString(author, 'author');
    this.isbn = ensureNonEmptyString(isbn, 'isbn');
    this.genre = ensureNonEmptyString(genre, 'genre');
    this.lendingType = ensureOneOf(lendingType, Object.values(LENDING_TYPES), 'lendingType');

    this.totalCopies = ensurePositiveInteger(totalCopies, 'totalCopies');
    ensureNonNegativeInteger(availableCopies, 'availableCopies');
    if (availableCopies > totalCopies) {
      throw new ValidationError(
        `"availableCopies" (${availableCopies}) cannot exceed "totalCopies" (${totalCopies}).`,
        { field: 'availableCopies', availableCopies, totalCopies },
      );
    }
    this.availableCopies = availableCopies;

    if (publishedYear !== null) {
      ensurePositiveInteger(publishedYear, 'publishedYear');
    }
    this.publishedYear = publishedYear;
    this.createdAt = createdAt;
  }

  get isReferenceOnly() {
    return this.lendingType === LENDING_TYPES.REFERENCE;
  }

  get hasAvailableCopies() {
    return this.availableCopies > 0;
  }

  /** Decrements stock when a copy leaves the building. */
  checkoutCopy() {
    if (this.availableCopies <= 0) {
      throw new PolicyViolationError(`No copies of "${this.title}" are available for checkout.`, {
        bookId: this.id,
        availableCopies: this.availableCopies,
      });
    }
    this.availableCopies -= 1;
    return this;
  }

  /** Increments stock when a copy comes back. */
  returnCopy() {
    if (this.availableCopies >= this.totalCopies) {
      throw new PolicyViolationError(
        `Cannot return a copy of "${this.title}": all ${this.totalCopies} copies are already in the library.`,
        { bookId: this.id, availableCopies: this.availableCopies },
      );
    }
    this.availableCopies += 1;
    return this;
  }

  /** Grows the collection (donations/acquisitions). */
  addCopies(count) {
    const copies = ensurePositiveInteger(count, 'count');
    this.totalCopies += copies;
    this.availableCopies += copies;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      author: this.author,
      isbn: this.isbn,
      genre: this.genre,
      publishedYear: this.publishedYear,
      lendingType: this.lendingType,
      totalCopies: this.totalCopies,
      availableCopies: this.availableCopies,
      createdAt: this.createdAt,
    };
  }
}
