/** Member persistence with patron-specific lookups. */
import { InMemoryRepository } from './InMemoryRepository.js';

export class InMemoryMemberRepository extends InMemoryRepository {
  constructor(options = {}) {
    super({ entityLabel: 'Member', ...options });
  }

  findByEmail(email) {
    return this.findOneBy((member) => member.email === String(email).toLowerCase());
  }

  findByType(type) {
    return this.findManyBy((member) => member.type === type);
  }
}
