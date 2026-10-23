import assert from 'node:assert/strict';
import test from 'node:test';

import { createLibrary } from '../src/container.js';
import { Events } from '../src/core/events/events.js';
import { LENDING_TYPES } from '../src/domain/Book.js';
import { MEMBER_TYPES } from '../src/domain/Member.js';
import { FlatFineOverdueStrategy } from '../src/strategies/overdue/FlatFineOverdueStrategy.js';
import { ProgressiveFineOverdueStrategy } from '../src/strategies/overdue/ProgressiveFineOverdueStrategy.js';
import { PolicyViolationError, NotFoundError } from '../src/utils/errors.js';
import { createMutableClock } from '../src/utils/date.js';
import { createIdGenerator } from '../src/utils/id.js';
import { createLogger, createMemorySink } from '../src/utils/logger.js';

async function setup({ overduePricing = new FlatFineOverdueStrategy({ dailyRate: 1, cap: 50 }) } = {}) {
  const clock = createMutableClock('2026-01-01T09:00:00Z');
  const library = createLibrary({
    clock,
    idGenerator: createIdGenerator('t'),
    logger: createLogger({ level: 'silent', sink: createMemorySink() }),
    overduePricing,
  });

  const book = await library.bookService.addBook({
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '978-0441013593',
    totalCopies: 2,
  });
  const referenceBook = await library.bookService.addBook({
    title: 'Encyclopedia Britannica',
    author: 'Various',
    isbn: '000-0',
    lendingType: LENDING_TYPES.REFERENCE,
    totalCopies: 5,
  });
  const member = await library.memberService.registerMember({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    type: MEMBER_TYPES.STANDARD,
  });

  return { library, clock, book, referenceBook, member };
}

test('borrowBook creates a loan, decrements stock and publishes loan:created', async () => {
  const { library, clock, book, member } = await setup();
  const events = [];
  library.eventBus.subscribe(Events.LOAN_CREATED, (env) => events.push(env));

  const loan = await library.loanService.borrowBook({ memberId: member.id, bookId: book.id });

  assert.equal(loan.isActive, true);
  assert.equal(loan.borrowedAt.getTime(), clock.now().getTime());
  assert.equal((await library.bookService.getBook(book.id)).availableCopies, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].payload.policy, 'standard');
});

test('due date follows the lending strategy duration', async () => {
  const { library, clock, book, member } = await setup();
  const loan = await library.loanService.borrowBook({ memberId: member.id, bookId: book.id });

  // standard policy = 14 days
  const expected = new Date(clock.now().getTime() + 14 * 24 * 60 * 60 * 1000);
  assert.equal(loan.dueAt.getTime(), expected.getTime());
});

test('borrowBook rejects reference-only titles via the registry override', async () => {
  const { library, referenceBook, member } = await setup();
  await assert.rejects(
    () => library.loanService.borrowBook({ memberId: member.id, bookId: referenceBook.id }),
    (error) => {
      assert.ok(error instanceof PolicyViolationError);
      assert.match(error.message, /reference-only/);
      return true;
    },
  );
});

test('borrowBook rejects suspended members', async () => {
  const { library, book, member } = await setup();
  await library.memberService.suspendMember(member.id);

  await assert.rejects(
    () => library.loanService.borrowBook({ memberId: member.id, bookId: book.id }),
    /not an active member/,
  );
});

test('borrowBook rejects when no copies are available', async () => {
  const { library, book } = await setup();
  const other = await library.memberService.registerMember({
    name: 'Grace Hopper',
    email: 'grace@example.com',
  });

  await library.loanService.borrowBook({ memberId: other.id, bookId: book.id });
  await library.loanService.borrowBook({ memberId: other.id, bookId: book.id });

  const third = await library.memberService.registerMember({
    name: 'Alan Turing',
    email: 'alan@example.com',
  });
  await assert.rejects(
    () => library.loanService.borrowBook({ memberId: third.id, bookId: book.id }),
    /No copies/,
  );
});

test('lending policy caps the number of active loans', async () => {
  const { library, book, member } = await setup();
  for (let i = 0; i < 5; i += 1) {
    const extra = await library.bookService.addBook({
      title: `Volume ${i}`,
      author: 'A',
      isbn: `isbn-${i}`,
    });
    await library.loanService.borrowBook({ memberId: member.id, bookId: extra.id });
  }

  // "book" (Dune) still has copies available -> the policy limit is what rejects
  await assert.rejects(
    () => library.loanService.borrowBook({ memberId: member.id, bookId: book.id }),
    /already has 5 active loan/,
  );
});

test('returnBook on time charges no fee and restores stock', async () => {
  const { library, clock, book, member } = await setup();
  const loan = await library.loanService.borrowBook({ memberId: member.id, bookId: book.id });

  clock.advanceDays(10);
  const { fee } = await library.loanService.returnBook(loan.id);

  assert.equal(fee.amount, 0);
  assert.equal(loan.isReturned, true);
  assert.equal((await library.bookService.getBook(book.id)).availableCopies, 2);
});

test('returnBook late applies the injected pricing strategy and emits fee:charged', async () => {
  const { library, clock, book, member } = await setup();
  const fees = [];
  library.eventBus.subscribe(Events.FEE_CHARGED, (env) => fees.push(env.payload));

  const loan = await library.loanService.borrowBook({ memberId: member.id, bookId: book.id });
  clock.advanceDays(20); // 14-day loan -> 6 days late, flat $1/day
  const { fee } = await library.loanService.returnBook(loan.id);

  assert.equal(fee.daysLate, 6);
  assert.equal(fee.amount, 6);
  assert.equal(fee.policy, 'flat');
  assert.equal(fees.length, 1);
});

test('progressive pricing strategy escalates after the threshold', async () => {
  const pricing = new ProgressiveFineOverdueStrategy({
    dailyRate: 0.1,
    escalatingDailyRate: 0.5,
    escalationAfterDays: 7,
    cap: 25,
  });
  const { library, clock, book, member } = await setup({ overduePricing: pricing });

  const loan = await library.loanService.borrowBook({ memberId: member.id, bookId: book.id });
  clock.advanceDays(14 + 10); // 10 days late -> 7*0.1 + 3*0.5 = 2.2
  const { fee } = await library.loanService.returnBook(loan.id);

  assert.equal(fee.policy, 'progressive');
  assert.equal(fee.amount, 2.2);
});

test('returning twice is a policy violation', async () => {
  const { library, book, member } = await setup();
  const loan = await library.loanService.borrowBook({ memberId: member.id, bookId: book.id });
  await library.loanService.returnBook(loan.id);

  await assert.rejects(() => library.loanService.returnBook(loan.id), PolicyViolationError);
});

test('reportOverdueLoans publishes loan:overdue for each late loan', async () => {
  const { library, clock, book, member } = await setup();
  const overdueEvents = [];
  library.eventBus.subscribe(Events.LOAN_OVERDUE, (env) => overdueEvents.push(env.payload));

  await library.loanService.borrowBook({ memberId: member.id, bookId: book.id });
  clock.advanceDays(30);

  const overdue = await library.loanService.reportOverdueLoans();
  assert.equal(overdue.length, 1);
  assert.equal(overdueEvents.length, 1);
  assert.equal(overdueEvents[0].daysLate, 16);
  assert.equal(overdueEvents[0].member.id, member.id);
});

test('built-in observers receive events (audit + notifications)', async () => {
  const { library, clock, book, member } = await setup();
  const loan = await library.loanService.borrowBook({ memberId: member.id, bookId: book.id });
  clock.advanceDays(20);
  await library.loanService.returnBook(loan.id);

  assert.equal(library.auditLogger.countFor(Events.LOAN_CREATED), 1);
  assert.equal(library.auditLogger.countFor(Events.LOAN_RETURNED), 1);

  const messages = library.notifier.getMessagesForMember(member.id);
  assert.ok(messages.some((m) => m.eventName === Events.LOAN_CREATED));
  assert.ok(messages.some((m) => m.eventName === Events.LOAN_RETURNED));
  assert.ok(messages.some((m) => /Overdue fee/.test(m.message)));
});

test('services surface NotFoundError for unknown entities', async () => {
  const { library } = await setup();
  await assert.rejects(
    () => library.loanService.borrowBook({ memberId: 'ghost', bookId: 'ghost' }),
    NotFoundError,
  );
  await assert.rejects(() => library.bookService.getBook('ghost'), NotFoundError);
});

