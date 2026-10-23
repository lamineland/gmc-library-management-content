/**
 * Patron use-cases: registration, lookup, account standing.
 */
import { Events } from '../core/events/events.js';
import { PolicyViolationError } from '../utils/errors.js';
import { ensureNonEmptyString, ensureOneOf } from '../utils/validation.js';
import { MEMBER_TYPES } from '../domain/Member.js';

export class MemberService {
  #members;

  #entityFactory;

  #eventBus;

  /**
   * @param {{
   *   memberRepository: object,
   *   entityFactory: { createMember: Function },
   *   eventBus: { publish: Function },
   * }} deps
   */
  constructor({ memberRepository, entityFactory, eventBus }) {
    this.#members = memberRepository;
    this.#entityFactory = entityFactory;
    this.#eventBus = eventBus;
  }

  /** @returns {Promise<import('../domain/Member.js').Member>} */
  async registerMember(input) {
    const member = this.#entityFactory.createMember(input);

    const duplicate = await this.#members.findByEmail(member.email);
    if (duplicate) {
      throw new PolicyViolationError(
        `A member with email "${member.email}" is already registered.`,
        { email: member.email, existingId: duplicate.id },
      );
    }

    await this.#members.save(member);
    await this.#eventBus.publish(Events.MEMBER_REGISTERED, { member: member.toJSON() });
    return member;
  }

  async getMember(memberId) {
    return this.#members.get(memberId);
  }

  async listMembers({ type } = {}) {
    if (type === undefined) return this.#members.findAll();
    ensureOneOf(type, Object.values(MEMBER_TYPES), 'type');
    return this.#members.findByType(type);
  }

  async suspendMember(memberId) {
    return this.#updateStatus(memberId, (member) => member.suspend());
  }

  async reinstateMember(memberId) {
    return this.#updateStatus(memberId, (member) => member.reinstate());
  }

  async #updateStatus(memberId, apply) {
    ensureNonEmptyString(memberId, 'memberId');
    const member = await this.#members.get(memberId);
    apply(member);
    await this.#members.save(member);
    await this.#eventBus.publish(Events.MEMBER_UPDATED, { member: member.toJSON() });
    return member;
  }
}
