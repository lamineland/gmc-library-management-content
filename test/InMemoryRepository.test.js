import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryBookRepository } from '../src/repositories/InMemoryBookRepository.js';
import { InMemoryRepository } from '../src/repositories/InMemoryRepository.js';
import { NotFoundError } from '../src/utils/errors.js';
import { createMutableClock } from '../src/utils/date.js';
import { createIdGenerator } from '../src/utils/id.js';
import { EntityFactory } from '../src/factories/EntityFactory.js';

function setup() {
  const clock = createMutableClock('2026-01-01T09:00:00Z');
  const entityFactory = new EntityFactory({
    idGenerator: createIdGenerator('test'),
    clock,
  });
  const repo = new InMemoryBookRepository();
  return { clock, entityFactory, repo };
}

test('InMemoryRepository saves, retrieves and counts entities', async () => {
  const { entityFactory, repo } = setup();
  const book = entityFactory.createBook({ title: 'Dune', author: 'Frank Herbert', isbn: '111' });

  await repo.save(book);
  assert.equal(await repo.count(), 1);
  assert.equal(await repo.findById(book.id), book);
  assert.equal((await repo.findAll()).length, 1);
});

test('InMemoryRepository.get throws NotFoundError for unknown ids', async () => {
  const { repo } = setup();
  await assert.rejects(() => repo.get('missing'), NotFoundError);
  assert.equal(await repo.findById('missing'), null);
});

test('InMemoryRepository upserts by id', async () => {
  const { entityFactory, repo } = setup();
  const book = entityFactory.createBook({ title: 'Dune', author: 'Frank Herbert', isbn: '111' });
  await repo.save(book);

  book.addCopies(3);
  await repo.save(book);

  assert.equal(await repo.count(), 1);
  assert.equal((await repo.findById(book.id)).totalCopies, 4);
});

test('InMemoryRepository filters with findManyBy / findOneBy', async () => {
  const { entityFactory, repo } = setup();
  const dune = entityFactory.createBook({ title: 'Dune', author: 'Frank Herbert', isbn: '111' });
  const foundation = entityFactory.createBook({ title: 'Foundation', author: 'Asimov', isbn: '222' });
  await repo.save(dune);
  await repo.save(foundation);

  const byAsimov = await repo.findManyBy((b) => b.author === 'Asimov');
  assert.deepEqual(byAsimov.map((b) => b.id), [foundation.id]);

  const single = await repo.findOneBy((b) => b.title === 'Dune');
  assert.equal(single.id, dune.id);
});

test('InMemoryRepository.delete removes entities', async () => {
  const { entityFactory, repo } = setup();
  const book = entityFactory.createBook({ title: 'Dune', author: 'Frank Herbert', isbn: '111' });
  await repo.save(book);

  assert.equal(await repo.delete(book.id), true);
  assert.equal(await repo.delete(book.id), false);
  assert.equal(await repo.count(), 0);
});

test('specialized repositories expose domain queries', async () => {
  const { entityFactory, repo } = setup();
  const book = entityFactory.createBook({
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '111',
    genre: 'Sci-Fi',
    totalCopies: 2,
  });
  book.checkoutCopy();
  await repo.save(book);

  assert.equal((await repo.findByIsbn('111')).id, book.id);
  assert.equal((await repo.findByGenre('sci-fi'))[0].id, book.id);
  // 1 of 2 copies still on shelf
  assert.equal((await repo.findAvailable()).length, 1);

  book.checkoutCopy();
  assert.deepEqual(await repo.findAvailable(), []);
});

test('the base contract rejects classes that skip implementation', async () => {
  const bare = new InMemoryRepository({ entityLabel: 'Thing' });
  assert.equal(bare.entityLabel, 'Thing');
  // The interface itself is abstract:
  const { Repository } = await import('../src/core/interfaces/Repository.js');
  await assert.rejects(() => new Repository().save({ id: 'x' }), /must be implemented/);
});
