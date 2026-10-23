import assert from 'node:assert/strict';
import test from 'node:test';

import { EventBus } from '../src/core/events/EventBus.js';
import { Events } from '../src/core/events/events.js';

test('EventBus delivers events to subscribed listeners', async () => {
  const bus = new EventBus();
  const received = [];
  bus.subscribe(Events.BOOK_ADDED, (envelope) => received.push(envelope));

  await bus.publish(Events.BOOK_ADDED, { book: { id: 'b1' } });
  await bus.publish(Events.LOAN_CREATED, { loan: { id: 'l1' } });

  assert.equal(received.length, 1);
  assert.equal(received[0].eventName, Events.BOOK_ADDED);
  assert.equal(received[0].payload.book.id, 'b1');
  assert.ok(received[0].occurredAt instanceof Date);
});

test('EventBus awaits async listeners in order', async () => {
  const bus = new EventBus();
  const order = [];
  bus.subscribe('x', async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    order.push('first');
  });
  bus.subscribe('x', () => {
    order.push('second');
  });

  await bus.publish('x');
  assert.deepEqual(order, ['first', 'second']);
});

test('EventBus supports global observers via attach (Observer pattern)', async () => {
  const bus = new EventBus();
  const seen = [];
  const observer = {
    update(envelope) {
      seen.push(envelope.eventName);
    },
  };

  const detach = bus.attach(observer);
  await bus.publish(Events.BOOK_ADDED);
  await bus.publish(Events.MEMBER_REGISTERED);
  detach();
  await bus.publish(Events.BOOK_ADDED);

  assert.deepEqual(seen, [Events.BOOK_ADDED, Events.MEMBER_REGISTERED]);
});

test('EventBus.attach rejects objects without update()', () => {
  const bus = new EventBus();
  assert.throws(() => bus.attach({}), TypeError);
  assert.throws(() => bus.attach(null), TypeError);
});

test('EventBus.unsubscribe stops delivery and cleans up', async () => {
  const bus = new EventBus();
  let calls = 0;
  const listener = () => {
    calls += 1;
  };

  bus.subscribe('y', listener);
  assert.equal(bus.listenerCount('y'), 1);

  assert.equal(bus.unsubscribe('y', listener), true);
  await bus.publish('y');
  assert.equal(calls, 0);
  assert.equal(bus.listenerCount('y'), 0);
});

test('EventBus validates arguments', async () => {
  const bus = new EventBus();
  assert.throws(() => bus.subscribe('', () => {}), /non-empty string/);
  assert.throws(() => bus.subscribe('z', 'not-a-function'), /must be a function/);
  await assert.rejects(() => bus.publish('   '), /non-empty string/);
});

test('publishing freezes the envelope payload reference for observers', async () => {
  const bus = new EventBus();
  let envelope = null;
  bus.subscribeToAll((env) => {
    envelope = env;
  });

  await bus.publish('w', { a: 1 });
  assert.ok(Object.isFrozen(envelope));
});
