# Library Management System

A modular Library Management System for Node.js, built entirely with **ES modules**, zero runtime dependencies, and a strong focus on **modularity, reusability and testability**.

## Quick start

```bash
npm start        # run the end-to-end demo (examples/demo.js)
npm test         # run the unit/integration tests (node --test)
```

Requires Node.js >= 18.

## Design overview

```
src/
├── index.js                 # public API surface
├── container.js             # composition root - dependency injection wiring
├── core/
│   ├── interfaces/          # interface-like contracts (abstract classes)
│   │   ├── Repository.js            # persistence contract
│   │   ├── LendingStrategy.js       # loan policy contract (Strategy)
│   │   ├── OverduePricingStrategy.js# fine calculation contract (Strategy)
│   │   ├── SearchStrategy.js        # catalog search contract (Strategy)
│   │   └── Observer.js              # event observer contract (Observer)
│   └── events/              # EventBus (Subject) + canonical event names
├── domain/                  # Book, Member, Loan entities + enums
├── factories/               # EntityFactory, RepositoryFactory (Factory)
├── repositories/            # generic InMemoryRepository + specialized repos
├── strategies/
│   ├── lending/             # Standard / Student / Faculty / ReferenceOnly + registry
│   ├── overdue/             # FlatFine / ProgressiveFine pricing
│   └── search/              # reusable field-based search strategies
├── services/                # BookService, MemberService, LoanService
├── observers/               # AuditLogger, MemberNotifier
└── utils/                   # errors, validation, id, date/clock, logger, number
```

## Design patterns

| Pattern | Where | Why |
| --- | --- | --- |
| **Factory** | `EntityFactory`, `RepositoryFactory` | Single place to build validated entities & pick a persistence backend; identity/time are injected so creation is deterministic in tests. |
| **Strategy** | `LendingStrategy`, `OverduePricingStrategy`, `SearchStrategy` | Loan rules, fine math and search matching are swappable algorithms. `LoanService` stays policy-free. |
| **Observer** | `EventBus` + `AuditLogger`, `MemberNotifier`, custom observers | Services publish domain events (`loan:created`, `fee:charged`, ...); any number of observers react without coupling to the services. |
| **Registry** | `LendingStrategyRegistry`, `RepositoryFactory` | Map keys (member type / backend name) to implementations with sensible fallback. |
| **Composition Root** | `src/container.js` | All wiring lives in one file; the rest of the code only knows its contracts. |

## Interface-like abstractions

JavaScript has no `interface` keyword, so contracts are abstract base classes in
`src/core/interfaces/` whose methods throw `NotImplementedError`. Concrete
implementations extend them (e.g. `FlatFineOverdueStrategy extends
OverduePricingStrategy`), which also gives editor tooling and `instanceof`
checks something to work with.

## Dependency injection

Every service receives its collaborators via the constructor. `createLibrary()`
wires the graph and lets you swap any part:

```js
import { createLibrary, createMutableClock, ProgressiveFineOverdueStrategy } from './src/index.js';

const clock = createMutableClock('2026-01-01T09:00:00Z');
const library = createLibrary({
  clock,                                             // time travel in tests
  overduePricing: new ProgressiveFineOverdueStrategy(), // swap fine policy
  repositoryType: 'in-memory',                       // or a registered backend
});

const book = await library.bookService.addBook({ title: 'Dune', author: 'Frank Herbert', isbn: '111' });
const member = await library.memberService.registerMember({ name: 'Ada', email: 'ada@example.com' });
const loan = await library.loanService.borrowBook({ memberId: member.id, bookId: book.id });

clock.advanceDays(30);
const { fee } = await library.loanService.returnBook(loan.id);
```

## Extending the system

* **New lending policy** - extend `BaseLendingStrategy` (or `LendingStrategy`),
  then pass it to `createLibrary({ lendingStrategies: [...] })`.
* **New fine model** - implement `OverduePricingStrategy.calculateFee()` and
  inject it as `overduePricing`.
* **New search mode** - use `FieldSearchStrategy` with your fields/match mode, or
  implement `SearchStrategy`.
* **New observer** - implement `Observer.update(envelope)` and pass it via
  `observers: [...]` (or `eventBus.attach(observer)`).
* **New persistence backend** - implement the `Repository` contract and
  `RepositoryFactory.register('sqlite', ...)`.

## Testing

Tests use Node's built-in runner (`node --test`) and cover the event bus,
repositories, factories, strategies and the full loan lifecycle (borrow limits,
reference-only books, overdue fees, observers). The mutable clock and injected
logger (`createMemorySink`) keep tests fast and silent.

```bash
npm test
```

## Notes & assumptions

* Persistence is in-memory (per-process) by design; the `Repository` contract is
  the seam where a database adapter would plug in.
* Late days are billed per *started* day (1 hour late counts as 1 day).
* Fees are returned as `{ amount, currency, daysLate, policy }`; no payment
  processing is included.
