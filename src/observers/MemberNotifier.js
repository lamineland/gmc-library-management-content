/**
 * Observer: turns domain events into member-facing notifications.
 * Demonstrates how observers translate internal events into other contexts
 * without the services knowing anything about notifications.
 */
import { Events } from '../core/events/events.js';
import { Observer } from '../core/interfaces/Observer.js';

export class MemberNotifier extends Observer {
  /** @type {Map<string, { eventName: string, message: string, at: Date }[]>} */
  #messages = new Map();

  update({ eventName, payload, occurredAt }) {
    const route = {
      [Events.LOAN_CREATED]: () =>
        this.#notify(
          payload.member.id,
          eventName,
          `You borrowed "${payload.book.title}". It is due on ${formatDate(payload.loan.dueAt)}.`,
          occurredAt,
        ),
      [Events.LOAN_RETURNED]: () =>
        this.#notify(
          payload.member.id,
          eventName,
          `Thank you for returning "${payload.book.title}".` +
            (payload.fee.amount > 0 ? ` Overdue fee: ${formatFee(payload.fee)}.` : ''),
          occurredAt,
        ),
      [Events.LOAN_OVERDUE]: () =>
        this.#notify(
          payload.member.id,
          eventName,
          `"${payload.book.title}" is ${payload.daysLate} day(s) overdue. Please return it as soon as possible.`,
          occurredAt,
        ),
      [Events.FEE_CHARGED]: () =>
        this.#notify(
          payload.memberId,
          eventName,
          `An overdue fee of ${formatFee(payload.fee)} has been charged.`,
          occurredAt,
        ),
    }[eventName];

    return route ? route() : undefined;
  }

  #notify(memberId, eventName, message, at) {
    if (!this.#messages.has(memberId)) this.#messages.set(memberId, []);
    const entry = { eventName, message, at };
    this.#messages.get(memberId).push(entry);
    return entry;
  }

  getMessagesForMember(memberId) {
    return [...(this.#messages.get(memberId) ?? [])];
  }

  getAllMessages() {
    return [...this.#messages.entries()].flatMap(([memberId, messages]) =>
      messages.map((entry) => ({ memberId, ...entry })),
    );
  }

  clear() {
    this.#messages.clear();
  }
}

function formatDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatFee({ amount, currency }) {
  return `${currency} ${amount.toFixed(2)}`;
}
