/**
 * End-to-end walkthrough of the Library Management System.
 * Run with: npm start
 *
 * Demonstrates: Factory (entity/repository creation), Strategy (lending policy,
 * fine calculation, search), Observer (audit log + member notifications) and
 * dependency injection (mutable clock lets us time-travel to create overdue loans).
 */
import {
  createLibrary,
  createLogger,
  createMutableClock,
  LENDING_TYPES,
  MEMBER_TYPES,
  ProgressiveFineOverdueStrategy,
  TitleSearchStrategy,
  Observer,
  errors,
} from '../src/index.js';

const line = (title) => console.log(`\n=== ${title} ===`);

// --- Dependency Injection: deterministic clock + escalating fine policy -----
const clock = createMutableClock('2026-01-01T09:00:00Z');
const library = createLibrary({
  clock,
  logger: createLogger({ level: 'warn' }),
  overduePricing: new ProgressiveFineOverdueStrategy(),
});

// A custom Observer plugged into the EventBus (Observer pattern extension point)
class StatsCollector extends Observer {
  counts = new Map();

  update({ eventName }) {
    this.counts.set(eventName, (this.counts.get(eventName) ?? 0) + 1);
  }
}
const stats = new StatsCollector();
const detachStats = library.eventBus.attach(stats);

try {
  // --- Factory: create catalog -------------------------------------------------
  line('1. Acquiring books (EntityFactory)');
  const dune = await library.bookService.addBook({
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '978-0441013593',
    genre: 'Science Fiction',
    totalCopies: 2,
    publishedYear: 1965,
  });
  const foundation = await library.bookService.addBook({
    title: 'Foundation',
    author: 'Isaac Asimov',
    isbn: '978-0553293357',
    genre: 'Science Fiction',
    totalCopies: 1,
    publishedYear: 1951,
  });
  const encyclopedia = await library.bookService.addBook({
    title: 'Encyclopedia Britannica',
    author: 'Various',
    isbn: '000-0000-00',
    genre: 'Reference',
    lendingType: LENDING_TYPES.REFERENCE,
    totalCopies: 3,
  });
  console.log(`Added: ${dune.title}, ${foundation.title}, ${encyclopedia.title}`);

  // --- Members ---------------------------------------------------------------
  line('2. Registering members');
  const ada = await library.memberService.registerMember({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    type: MEMBER_TYPES.STUDENT,
  });
  const alan = await library.memberService.registerMember({
    name: 'Alan Turing',
    email: 'alan@example.com',
    type: MEMBER_TYPES.FACULTY,
  });
  console.log(`Registered: ${ada.name} (${ada.type}), ${alan.name} (${alan.type})`);

  // --- Strategy: search ------------------------------------------------------
  line('3. Catalog search (SearchStrategy)');
  const byTitle = await library.bookService.searchBooks('foundation', {
    strategy: new TitleSearchStrategy(),
  });
  console.log('title search "foundation":', byTitle.map((b) => b.title).join(', '));
  const any = await library.bookService.searchBooks('frank');
  console.log('any-field search "frank":', any.map((b) => b.title).join(', '));

  // --- Strategy: lending policy ---------------------------------------------
  line('4. Borrowing (LendingStrategy)');
  const loan1 = await library.loanService.borrowBook({ memberId: ada.id, bookId: dune.id });
  console.log(`Ada borrowed "${dune.title}", due ${loan1.dueAt.toISOString().slice(0, 10)} (21-day student policy)`);

  await library.loanService.borrowBook({ memberId: alan.id, bookId: foundation.id });
  console.log('Alan borrowed "Foundation" (60-day faculty policy)');

  try {
    await library.loanService.borrowBook({ memberId: ada.id, bookId: encyclopedia.id });
  } catch (error) {
    if (error instanceof errors.PolicyViolationError) {
      console.log(`Reference book blocked -> ${error.message}`);
    } else {
      throw error;
    }
  }

  // --- Observer: notifications flow automatically ---------------------------
  line('5. Time travel: 40 days later (injected clock)');
  clock.advanceDays(40);

  await library.loanService.reportOverdueLoans();
  console.log(
    'Overdue loans:',
    (await library.loanService.getOverdueLoans()).map((l) => l.id).join(', '),
  );

  const { fee } = await library.loanService.returnBook(loan1.id);
  console.log(`Ada returned "Dune": ${fee.daysLate} day(s) late -> fee ${fee.currency} ${fee.amount.toFixed(2)} (${fee.policy} policy)`);

  // --- Observer: audit + notifications --------------------------------------
  line('6. Observers (EventBus)');
  console.log('Audit trail:');
  for (const record of library.auditLogger.records) {
    console.log(`  - ${record.eventName} @ ${record.occurredAt.toISOString()}`);
  }
  console.log(`Notifications for ${ada.name}:`);
  for (const message of library.notifier.getMessagesForMember(ada.id)) {
    console.log(`  - [${message.eventName}] ${message.message}`);
  }
  console.log('Custom StatsCollector:', [...stats.counts.entries()].map(([k, v]) => `${k}=${v}`).join(', '));

  line('Done');
  console.log('Everything above was assembled by src/container.js (composition root).');
} finally {
  detachStats();
  library.dispose();
}
