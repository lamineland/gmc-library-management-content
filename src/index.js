/**
 * Public API surface of the Library Management System.
 * Consumers should import from here (or run `createLibrary` directly).
 */

// Composition root (dependency injection)
export { createLibrary } from './container.js';

// Domain
export { Book, LENDING_TYPES } from './domain/Book.js';
export { Member, MEMBER_TYPES, MEMBER_STATUS } from './domain/Member.js';
export { Loan, LOAN_STATUS } from './domain/Loan.js';

// Core abstractions & events
export { Repository } from './core/interfaces/Repository.js';
export { LendingStrategy } from './core/interfaces/LendingStrategy.js';
export { OverduePricingStrategy } from './core/interfaces/OverduePricingStrategy.js';
export { SearchStrategy } from './core/interfaces/SearchStrategy.js';
export { Observer } from './core/interfaces/Observer.js';
export { EventBus } from './core/events/EventBus.js';
export { Events } from './core/events/events.js';

// Factories
export { EntityFactory } from './factories/EntityFactory.js';
export { RepositoryFactory } from './factories/RepositoryFactory.js';

// Repositories
export { InMemoryRepository } from './repositories/InMemoryRepository.js';
export { InMemoryBookRepository } from './repositories/InMemoryBookRepository.js';
export { InMemoryMemberRepository } from './repositories/InMemoryMemberRepository.js';
export { InMemoryLoanRepository } from './repositories/InMemoryLoanRepository.js';

// Strategies
export { BaseLendingStrategy } from './strategies/lending/BaseLendingStrategy.js';
export { StandardLendingStrategy } from './strategies/lending/StandardLendingStrategy.js';
export { StudentLendingStrategy } from './strategies/lending/StudentLendingStrategy.js';
export { FacultyLendingStrategy } from './strategies/lending/FacultyLendingStrategy.js';
export { ReferenceOnlyLendingStrategy } from './strategies/lending/ReferenceOnlyLendingStrategy.js';
export { LendingStrategyRegistry } from './strategies/lending/LendingStrategyRegistry.js';
export { FlatFineOverdueStrategy } from './strategies/overdue/FlatFineOverdueStrategy.js';
export { ProgressiveFineOverdueStrategy } from './strategies/overdue/ProgressiveFineOverdueStrategy.js';
export {
  FieldSearchStrategy,
  MATCH_MODES,
  TitleSearchStrategy,
  AuthorSearchStrategy,
  IsbnSearchStrategy,
  GenreSearchStrategy,
  AnyFieldSearchStrategy,
} from './strategies/search/fieldSearchStrategies.js';

// Services
export { BookService } from './services/BookService.js';
export { MemberService } from './services/MemberService.js';
export { LoanService } from './services/LoanService.js';

// Observers
export { AuditLogger } from './observers/AuditLogger.js';
export { MemberNotifier } from './observers/MemberNotifier.js';

// Reusable utilities
export * as errors from './utils/errors.js';
export * as validation from './utils/validation.js';
export { createIdGenerator } from './utils/id.js';
export {
  createSystemClock,
  createMutableClock,
  addDays,
  daysBetween,
  startedDaysBetween,
  DAY_IN_MS,
} from './utils/date.js';
export { createLogger, createMemorySink } from './utils/logger.js';
export { roundTo, clamp } from './utils/number.js';
