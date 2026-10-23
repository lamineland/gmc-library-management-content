/**
 * Interface-like contract: persistence adapter.
 *
 * JavaScript has no `interface` keyword, so contracts are expressed as abstract
 * base classes whose methods throw {@link NotImplementedError}. Any class that
 * claims to be a `Repository` must override every method below.
 *
 * NOTE: a `get(id)` convenience that throws NotFoundError is intentionally not
 * part of the contract - concrete repositories may add such helpers freely.
 */
import { NotImplementedError } from '../../utils/errors.js';

export class Repository {
  /** @param {object} entity @returns {Promise<object>} the stored entity */
  async save(_entity) {
    throw new NotImplementedError('Repository.save');
  }

  /** @returns {Promise<object|null>} */
  async findById(_id) {
    throw new NotImplementedError('Repository.findById');
  }

  /** @returns {Promise<object[]>} */
  async findAll() {
    throw new NotImplementedError('Repository.findAll');
  }

  /** @param {(entity: object) => boolean} _predicate @returns {Promise<object[]>} */
  async findManyBy(_predicate) {
    throw new NotImplementedError('Repository.findManyBy');
  }

  /** @param {(entity: object) => boolean} _predicate @returns {Promise<object|null>} */
  async findOneBy(_predicate) {
    throw new NotImplementedError('Repository.findOneBy');
  }

  /** @returns {Promise<boolean>} */
  async delete(_id) {
    throw new NotImplementedError('Repository.delete');
  }

  /** @returns {Promise<number>} */
  async count() {
    throw new NotImplementedError('Repository.count');
  }
}
