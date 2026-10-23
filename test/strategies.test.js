import assert from 'node:assert/strict';
import test from 'node:test';

import { FacultyLendingStrategy } from '../src/strategies/lending/FacultyLendingStrategy.js';
import { LendingStrategyRegistry } from '../src/strategies/lending/LendingStrategyRegistry.js';
import { ReferenceOnlyLendingStrategy } from '../src/strategies/lending/ReferenceOnlyLendingStrategy.js';
import { StandardLendingStrategy } from '../src/strategies/lending/StandardLendingStrategy.js';
import { StudentLendingStrategy } from '../src/strategies/lending/StudentLendingStrategy.js';
import { FlatFineOverdueStrategy } from '../src/strategies/overdue/FlatFineOverdueStrategy.js';
import {
  AuthorSearchStrategy,
  IsbnSearchStrategy,
  TitleSearchStrategy,
  AnyFieldSearchStrategy,
} from '../src/strategies/search/fieldSearchStrategies.js';
import { LENDING_TYPES } from '../src/domain/Book.js';
import { MEMBER_STATUS, MEMBER_TYPES } from '../src/domain/Member.js';
import { createMutableClock } from '../src/utils/date.js';
import { createIdGenerator } from '../src/utils/id.js';
import { EntityFactory } from '../src/factories/EntityFactory.js';

function fixture() {
  const clock = createMutableClock('2026-01-01T00:00:00Z');
  const factory = new EntityFactory({ idGenerator: createIdGenerator('s'), clock });
  return { clock, factory };
}

test('lending strategies expose distinct policy parameters', () => {
  assert.equal(new StandardLendingStrategy().getLoanDurationDays(), 14);
  assert.equal(new StudentLendingStrategy().getLoanDurationDays(), 21);
  assert.equal(new FacultyLendingStrategy().getLoanDurationDays(), 60);
  assert.equal(new FacultyLendingStrategy().getMaxActiveLoans(), 20);
  assert.equal(new ReferenceOnlyLendingStrategy().getMaxActiveLoans(), 0);
});

test('BaseLendingStrategy.evaluate enforces account standing and loan limits', () => {
  const strategy = new StandardLendingStrategy();
  const member = { name: 'Ada', isActive: true };

  assert.equal(strategy.evaluate({ member, activeLoanCount: 0 }).allowed, true);
  assert.equal(strategy.evaluate({ member, activeLoanCount: 5 }).allowed, false);

  const suspended = { name: 'Ada', isActive: false };
  const decision = strategy.evaluate({ member: suspended, activeLoanCount: 0 });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /not an active member/);
});

test('LendingStrategyRegistry resolves by member type with fallback', () => {
  const registry = new LendingStrategyRegistry({
    strategies: [new StandardLendingStrategy(), new StudentLendingStrategy(), new FacultyLendingStrategy()],
  });

  assert.equal(registry.resolve({ member: { type: MEMBER_TYPES.STUDENT } }).key, 'student');
  assert.equal(registry.resolve({ member: { type: MEMBER_TYPES.FACULTY } }).key, 'faculty');
  assert.equal(registry.resolve({ member: { type: 'unknown-type' } }).key, 'standard');
});

test('LendingStrategyRegistry overrides with the reference strategy for reference books', () => {
  const registry = new LendingStrategyRegistry({
    strategies: [new StandardLendingStrategy(), new StudentLendingStrategy()],
  });
  const { factory } = fixture();
  const referenceBook = factory.createBook({
    title: 'Encyclopedia',
    author: 'Various',
    isbn: '000',
    lendingType: LENDING_TYPES.REFERENCE,
  });

  const strategy = registry.resolve({ member: { type: MEMBER_TYPES.STUDENT }, book: referenceBook });
  assert.ok(strategy instanceof ReferenceOnlyLendingStrategy);
  assert.equal(strategy.evaluate({ book: referenceBook }).allowed, false);
});

test('FlatFineOverdueStrategy calculates capped fees and zero for on-time returns', () => {
  const pricing = new FlatFineOverdueStrategy({ dailyRate: 0.5, cap: 3, currency: 'EUR' });

  assert.equal(pricing.calculateFee({ daysLate: 0 }).amount, 0);
  assert.equal(pricing.calculateFee({ daysLate: 2 }).amount, 1);
  assert.equal(pricing.calculateFee({ daysLate: 100 }).amount, 3);
  assert.equal(pricing.calculateFee({ daysLate: 2 }).currency, 'EUR');
});

test('search strategies match on their fields', () => {
  const book = {
    title: 'The Hitchhiker’s Guide to the Galaxy',
    author: 'Douglas Adams',
    isbn: '978-0345391803',
    genre: 'Sci-Fi Comedy',
  };

  assert.equal(new TitleSearchStrategy().matches(book, 'hitchhiker'), true);
  assert.equal(new TitleSearchStrategy().matches(book, 'galaxy guide'), false);
  assert.equal(new AuthorSearchStrategy().matches(book, 'adams'), true);
  assert.equal(new AuthorSearchStrategy().matches(book, 'asimov'), false);
  assert.equal(new IsbnSearchStrategy().matches(book, '978-0345391803'), true);
  assert.equal(new IsbnSearchStrategy().matches(book, '0345391803'), false);
  assert.equal(new AnyFieldSearchStrategy().matches(book, 'comedy'), true);
  assert.equal(new AnyFieldSearchStrategy().matches(book, ''), false);
});

test('contracts throw NotImplementedError when not implemented', async () => {
  const { OverduePricingStrategy } = await import(
    '../src/core/interfaces/OverduePricingStrategy.js'
  );
  const { SearchStrategy } = await import('../src/core/interfaces/SearchStrategy.js');
  assert.throws(() => new OverduePricingStrategy().calculateFee({}), /must be implemented/);
  assert.throws(() => new SearchStrategy().matches({}, 'q'), /must be implemented/);
});

test('entities keep their invariants (Book/Loan lifecycle)', () => {
  const { factory } = fixture();
  const book = factory.createBook({ title: 'Dune', author: 'Herbert', isbn: '1', totalCopies: 1 });

  book.checkoutCopy();
  assert.equal(book.hasAvailableCopies, false);
  assert.throws(() => book.checkoutCopy(), /No copies/);

  book.returnCopy();
  assert.throws(() => book.returnCopy(), /all 1 copies are already/);

  const loan = factory.createLoan({
    bookId: book.id,
    memberId: 'm1',
    dueAt: new Date('2026-01-11T00:00:00Z'),
  });
  assert.equal(loan.isOverdue(new Date('2026-01-10T00:00:00Z')), false);
  assert.equal(loan.isOverdue(new Date('2026-01-12T00:00:00Z')), true);
  assert.equal(loan.daysLate(new Date('2026-01-12T12:00:00Z')), 2); // started days
  loan.markReturned(new Date('2026-01-12T12:00:00Z'));
  assert.equal(loan.isOverdue(new Date('2026-02-01T00:00:00Z')), false);
  assert.equal(loan.status, 'returned');
});

test('Member lifecycle methods flip status', () => {
  const { factory } = fixture();
  const member = factory.createMember({ name: 'Ada', email: 'ada@example.com' });
  assert.equal(member.status, MEMBER_STATUS.ACTIVE);
  member.suspend();
  assert.equal(member.isActive, false);
  member.reinstate();
  assert.equal(member.isActive, true);
});

