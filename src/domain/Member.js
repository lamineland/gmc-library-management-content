/**
 * Member entity - a library patron. `type` selects the LendingStrategy used by
 * the LoanService (see strategies/lending/LendingStrategyRegistry.js).
 */
import {
  ensureEmail,
  ensureNonEmptyString,
  ensureOneOf,
} from '../utils/validation.js';

export const MEMBER_TYPES = Object.freeze({
  STANDARD: 'standard',
  STUDENT: 'student',
  FACULTY: 'faculty',
});

export const MEMBER_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
});

export class Member {
  constructor({
    id,
    name,
    email,
    type = MEMBER_TYPES.STANDARD,
    status = MEMBER_STATUS.ACTIVE,
    joinedAt = new Date(),
  }) {
    this.id = ensureNonEmptyString(id, 'id');
    this.name = ensureNonEmptyString(name, 'name');
    this.email = ensureEmail(email, 'email');
    this.type = ensureOneOf(type, Object.values(MEMBER_TYPES), 'type');
    this.status = ensureOneOf(status, Object.values(MEMBER_STATUS), 'status');
    this.joinedAt = joinedAt;
  }

  get isActive() {
    return this.status === MEMBER_STATUS.ACTIVE;
  }

  suspend() {
    this.status = MEMBER_STATUS.SUSPENDED;
    return this;
  }

  reinstate() {
    this.status = MEMBER_STATUS.ACTIVE;
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      type: this.type,
      status: this.status,
      joinedAt: this.joinedAt,
    };
  }
}
