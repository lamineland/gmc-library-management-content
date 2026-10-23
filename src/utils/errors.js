/**
 * Typed error hierarchy for the library domain.
 *
 * Every error carries a stable `code` so callers (and tests) can branch on the
 * failure kind without resorting to string matching on messages.
 */

export class DomainError extends Error {
  constructor(message, code = 'DOMAIN_ERROR', details = undefined) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }
}

/** Input failed validation before any state was mutated. */
export class ValidationError extends DomainError {
  constructor(message, details = undefined) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/** A required entity could not be located in a repository. */
export class NotFoundError extends DomainError {
  constructor(resource = 'Resource', id = undefined) {
    super(`${resource} with id "${id}" was not found.`, 'NOT_FOUND', { resource, id });
  }
}

/** A business rule / policy (lending limits, reference books, ...) rejected the operation. */
export class PolicyViolationError extends DomainError {
  constructor(message, details = undefined) {
    super(message, 'POLICY_VIOLATION', details);
  }
}

/** A concrete class did not implement an interface-like contract method. */
export class NotImplementedError extends DomainError {
  constructor(contractMethod = 'method') {
    super(
      `${contractMethod}() must be implemented by the concrete class.`,
      'NOT_IMPLEMENTED',
      { contractMethod },
    );
  }
}
