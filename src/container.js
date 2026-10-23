/**
 * Composition root / dependency-injection container.
 *
 * `createLibrary` builds the whole object graph and wires it together:
 *
 *   utils (clock, idGenerator, logger)
 *        └── EntityFactory ──┐
 *   RepositoryFactory ───────┼──> BookService / MemberService / LoanService
 *   EventBus <───────────────┘         │ publishes domain events
 *        ▲                             ▼
 *   observers (AuditLogger, MemberNotifier, + any custom observer)
 *
 * Every collaborator is passed through constructors, so any piece can be
 * swapped: pass a different `clock` for time travel, `overduePricing` to change
 * fine policy, `lendingStrategies` for new member types, or extra `observers`.
 */
import { EventBus } from './core/events/EventBus.js';
import { EntityFactory } from './factories/EntityFactory.js';
import { RepositoryFactory } from './factories/RepositoryFactory.js';
import { AuditLogger } from './observers/AuditLogger.js';
import { MemberNotifier } from './observers/MemberNotifier.js';
import { BookService } from './services/BookService.js';
import { LoanService } from './services/LoanService.js';
import { MemberService } from './services/MemberService.js';
import { FacultyLendingStrategy } from './strategies/lending/FacultyLendingStrategy.js';
import { LendingStrategyRegistry } from './strategies/lending/LendingStrategyRegistry.js';
import { StandardLendingStrategy } from './strategies/lending/StandardLendingStrategy.js';
import { StudentLendingStrategy } from './strategies/lending/StudentLendingStrategy.js';
import { FlatFineOverdueStrategy } from './strategies/overdue/FlatFineOverdueStrategy.js';
import { AnyFieldSearchStrategy } from './strategies/search/fieldSearchStrategies.js';
import { createSystemClock } from './utils/date.js';
import { createIdGenerator } from './utils/id.js';
import { createLogger } from './utils/logger.js';

/**
 * @param {object} [options]
 * @param {{ now: Function }} [options.clock] injectable clock (tests use createMutableClock)
 * @param {Function} [options.idGenerator] injectable id generator
 * @param {object} [options.logger] injectable logger
 * @param {string} [options.repositoryType] backend registered in RepositoryFactory
 * @param {LendingStrategyRegistry|object[]} [options.lendingStrategies] registry or strategies to register
 * @param {object} [options.overduePricing] OverduePricingStrategy implementation
 * @param {object} [options.searchStrategy] default SearchStrategy for BookService
 * @param {object[]} [options.observers] extra observers attached to the EventBus
 * @returns {object} the wired library facade
 */
export function createLibrary({
  clock = createSystemClock(),
  idGenerator = createIdGenerator('lib'),
  logger = createLogger(),
  repositoryType = 'in-memory',
  lendingStrategies = [
    new StandardLendingStrategy(),
    new StudentLendingStrategy(),
    new FacultyLendingStrategy(),
  ],
  overduePricing = new FlatFineOverdueStrategy(),
  searchStrategy = new AnyFieldSearchStrategy(),
  observers = [],
} = {}) {
  const eventBus = new EventBus();
  const entityFactory = new EntityFactory({ idGenerator, clock });
  const repositories = RepositoryFactory.createSet(repositoryType);

  const lendingStrategyRegistry = Array.isArray(lendingStrategies)
    ? new LendingStrategyRegistry({ strategies: lendingStrategies })
    : lendingStrategies;

  const bookService = new BookService({
    bookRepository: repositories.books,
    entityFactory,
    eventBus,
    searchStrategy,
  });

  const memberService = new MemberService({
    memberRepository: repositories.members,
    entityFactory,
    eventBus,
  });

  const loanService = new LoanService({
    loanRepository: repositories.loans,
    bookRepository: repositories.books,
    memberRepository: repositories.members,
    entityFactory,
    eventBus,
    lendingStrategies: lendingStrategyRegistry,
    overduePricing,
    clock,
    logger: logger.child('loans'),
  });

  // Built-in observers + any caller-supplied ones (Observer pattern).
  const auditLogger = new AuditLogger({ logger: logger.child('audit') });
  const notifier = new MemberNotifier();
  const allObservers = [auditLogger, notifier, ...observers];
  const detachFns = allObservers.map((observer) => eventBus.attach(observer));

  return {
    // infrastructure
    clock,
    logger,
    eventBus,
    entityFactory,
    repositories,
    lendingStrategies: lendingStrategyRegistry,
    overduePricing,
    // services
    bookService,
    memberService,
    loanService,
    // built-in observers
    auditLogger,
    notifier,
    // teardown: detach every observer this container attached
    dispose() {
      detachFns.forEach((detach) => detach());
      eventBus.clear();
    },
  };
}
