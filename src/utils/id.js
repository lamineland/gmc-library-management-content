/**
 * Injectable id generation. Keeping this outside of the domain makes entities
 * deterministic to test and easy to swap for a UUID/ULID/database-sequence based
 * generator without touching services.
 */

import { randomUUID } from 'node:crypto';

/**
 * @param {string} prefix global prefix, e.g. "lib"
 * @returns {(kind?: string) => string} generator producing ids like `lib-book_0001_a1b2c3d4`
 */
export function createIdGenerator(prefix = 'id') {
  let sequence = 0;
  return function generateId(kind = 'entity') {
    sequence += 1;
    return `${prefix}-${kind}_${String(sequence).padStart(4, '0')}_${randomUUID().slice(0, 8)}`;
  };
}
