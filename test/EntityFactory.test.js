import assert from 'node:assert/strict';
import test from 'node:test';

import { EntityFactory } from '../src/factories/EntityFactory.js';
import { RepositoryFactory } from '../src/factories/RepositoryFactory.js';
import { Book, LENDING_TYPES } from '../src/domain/Book.js';
import { Member, MEMBER_TYPES } from '../src/domain/Member.js';
import { Loan } from '../src/domain/Loan.js';
import { ValidationError } from '../src/utils/errors.js';
import { createMutableClock } from '../src/utils/date.js';
import { createIdGenerator } from '../src/utils/id.js';

function setup() {
  const clock = createMutableClock('2026-01-01T09:00:00Z');
  const entityFactory = new EntityFactory({
    idGenerator: createIdGenerator('test'),
    clock,
  });
  return { clock, entityFactory };
}

test('EntityFactory.createBook produces a validated Book with id and timestamp', () => {
  const { clock, entityFactory } = setup();
  const book = entityFactory.createBook({
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '978-0441013593',
    totalCopies: 3,
  });

  assert.ok(book instanceof Book);
  assert.match(book.id, /^test-book_/);
  assert.equal(book.availableCopies, 3);
  assert.equal(book.lendingType, LENDING_TYPES.CIRCULATING);
  assert.equal(book.createdAt.getTime(), clock.now().getTime());
});

test('EntityFactory.createBook rejects invalid input via entity invariants', () => {
  const { entityFactory } = setup();
  assert.throws(
    () => entityFactory.createBook({ title: '', author: 'A', isbn: '1' }),
    ValidationError,
  );
  assert.throws(
    () => entityFactory.createBook({ title: 'T', author: 'A', isbn: '1', totalCopies: 0 }),
    ValidationError,
  );
  assert.throws(
    () =>
      entityFactory.createBook({
        title: 'T',
        author: 'A',
        isbn: '1',
        totalCopies: 1,
        availableCopies: 5,
      }),
    /cannot exceed/,
  );
});

test('EntityFactory.createMember validates emails and assigns type', () => {
  const { entityFactory } = setup();
  const member = entityFactory.createMember({ name: 'Ada', email: 'Ada@Example.com' });

  assert.ok(member instanceof Member);
  assert.equal(member.email, 'ada@example.com');
  assert.equal(member.type, MEMBER_TYPES.STANDARD);

  assert.throws(
    () => entityFactory.createMember({ name: 'Ada', email: 'not-an-email' }),
    ValidationError,
  );
  assert.throws(
    () => entityFactory.createMember({ name: 'Ada', email: 'a@b.co', type: 'robot' }),
    /must be one of/,
  );
});

test('EntityFactory.createLoan requires a due date and enforces chronology', () => {
  const { clock, entityFactory } = setup();
  const loan = entityFactory.createLoan({
    bookId: 'b1',
    memberId: 'm1',
    dueAt: new Date('2026-01-15T09:00:00Z'),
  });

  assert.ok(loan instanceof Loan);
  assert.equal(loan.borrowedAt.getTime(), clock.now().getTime());
  assert.equal(loan.isActive, true);

  assert.throws(() => entityFactory.createLoan({ bookId: 'b1', memberId: 'm1' }), /dueAt/);
  assert.throws(
    () =>
      entityFactory.createLoan({
        bookId: 'b1',
        memberId: 'm1',
        dueAt: new Date('2025-12-01T00:00:00Z'),
      }),
    /cannot be before/,
  );
});

test('RepositoryFactory.createSet builds a wired in-memory persistence set', async () => {
  const repos = RepositoryFactory.createSet('in-memory');
  assert.ok(repos.books && repos.members && repos.loans);
  assert.equal(await repos.books.count(), 0);
});

test('RepositoryFactory rejects unknown backends and supports registration', () => {
  assert.throws(() => RepositoryFactory.createSet('sqlite'), /Unknown repository type/);
  assert.ok(RepositoryFactory.supportedTypes().includes('in-memory'));

  RepositoryFactory.register('fake', () => ({ books: 1, members: 2, loans: 3 }));
  assert.deepEqual(RepositoryFactory.createSet('fake'), { books: 1, members: 2, loans: 3 });
});
