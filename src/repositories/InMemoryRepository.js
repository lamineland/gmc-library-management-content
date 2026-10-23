/**
 * Generic in-memory Repository implementation.
 *
 * Reusable for any entity exposing an `id` field. Domain-specific lookups live
 * in the thin subclasses below - this class stays storage-only (and could be
 * swapped for a SQL/ORM adapter implementing the same contract).
 */
import { Repository } from '../core/interfaces/Repository.js';
import { NotFoundError } from '../utils/errors.js';
import { ensure, ensureFunction, ensureNonEmptyString } from '../utils/validation.js';

export class InMemoryRepository extends Repository {
  /** @type {Map<string, object>} */
  #entities = new Map();

  #entityLabel;

  constructor({ entityLabel = 'Entity' } = {}) {
    super();
    this.#entityLabel = entityLabel;
  }

  get entityLabel() {
    return this.#entityLabel;
  }

  /** Upserts by `entity.id` and returns the stored instance. */
  async save(entity) {
    ensure(entity && typeof entity === 'object', 'entity must be an object.', { entity });
    ensureNonEmptyString(entity.id, 'entity.id');
    this.#entities.set(entity.id, entity);
    return entity;
  }

  async findById(id) {
    return this.#entities.get(ensureNonEmptyString(id, 'id')) ?? null;
  }

  /** Like `findById` but throws {@link NotFoundError} when missing. */
  async get(id) {
    const entity = await this.findById(id);
    if (!entity) throw new NotFoundError(this.#entityLabel, id);
    return entity;
  }

  async findAll() {
    return [...this.#entities.values()];
  }

  async findManyBy(predicate) {
    ensureFunction(predicate, 'predicate');
    return (await this.findAll()).filter((entity) => predicate(entity));
  }

  async findOneBy(predicate) {
    return (await this.findManyBy(predicate))[0] ?? null;
  }

  async delete(id) {
    return this.#entities.delete(ensureNonEmptyString(id, 'id'));
  }

  async count() {
    return this.#entities.size;
  }
}
