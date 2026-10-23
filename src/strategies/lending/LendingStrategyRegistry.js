/**
 * Registry that resolves the right LendingStrategy for a loan request.
 *
 * Resolution rules:
 *  1. reference-only books always resolve to the reference strategy
 *  2. otherwise the member's `type` selects the strategy
 *  3. unknown member types fall back to the fallback key ("standard")
 *
 * This keeps LoanService policy-free: it asks the registry, then the strategy.
 */
import { PolicyViolationError, ValidationError } from '../../utils/errors.js';
import { ensure, ensureNonEmptyString, ensureInstance } from '../../utils/validation.js';
import { LendingStrategy } from '../../core/interfaces/LendingStrategy.js';
import { ReferenceOnlyLendingStrategy } from './ReferenceOnlyLendingStrategy.js';

export class LendingStrategyRegistry {
  /** @type {Map<string, LendingStrategy>} */
  #strategies = new Map();

  #fallbackKey;

  #referenceStrategy;

  /**
   * @param {{ strategies?: LendingStrategy[], fallbackKey?: string }} [options]
   */
  constructor({ strategies = [], fallbackKey = 'standard', referenceStrategy = new ReferenceOnlyLendingStrategy() } = {}) {
    this.#fallbackKey = ensureNonEmptyString(fallbackKey, 'fallbackKey');
    this.#referenceStrategy = ensureInstance(referenceStrategy, LendingStrategy, 'referenceStrategy');
    this.#strategies.set(this.#referenceStrategy.key, this.#referenceStrategy);
    for (const strategy of strategies) this.register(strategy);
  }

  register(strategy) {
    ensureInstance(strategy, LendingStrategy, 'strategy');
    this.#strategies.set(strategy.key, strategy);
    return this;
  }

  has(key) {
    return this.#strategies.has(key);
  }

  keys() {
    return [...this.#strategies.keys()];
  }

  /**
   * @param {{ member: { type: string }, book: { isReferenceOnly: boolean } }} context
   * @returns {LendingStrategy}
   */
  resolve({ member, book }) {
    ensure(member, 'member is required to resolve a lending strategy.');
    if (book?.isReferenceOnly) return this.#referenceStrategy;

    const strategy = this.#strategies.get(member.type) ?? this.#strategies.get(this.#fallbackKey);
    if (!strategy) {
      throw new PolicyViolationError(
        `No lending strategy registered for member type "${member.type}" and no usable fallback ("${this.#fallbackKey}").`,
        { memberType: member.type, registered: this.keys() },
      );
    }
    return strategy;
  }

  /** Resolve explicitly by key (useful in admin tooling/tests). */
  get(key) {
    const strategy = this.#strategies.get(key);
    if (!strategy) {
      throw new ValidationError(`No lending strategy registered under key "${key}".`, {
        key,
        registered: this.keys(),
      });
    }
    return strategy;
  }
}
