/**
 * Date helpers plus the Clock abstraction.
 *
 * Services never call `new Date()` directly - they ask an injected Clock for the
 * current time. Tests inject a mutable clock to simulate overdue loans without
 * waiting in real time.
 */

export const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** @returns {{ now(): Date }} production clock backed by the system time */
export function createSystemClock() {
  return {
    now: () => new Date(),
  };
}

/**
 * Deterministic clock for tests and demos.
 * @param {Date|string|number} [start]
 */
export function createMutableClock(start = Date.now()) {
  let current = new Date(start);
  return {
    now: () => new Date(current),
    setNow(date) {
      current = new Date(date);
      return this;
    },
    advanceDays(days) {
      current = new Date(current.getTime() + days * DAY_IN_MS);
      return this;
    },
  };
}

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * DAY_IN_MS);
}

/** Whole calendar days from `from` to `to` (truncated toward zero). */
export function daysBetween(from, to) {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / DAY_IN_MS);
}

/** Started days between two dates: 1 hour past due counts as 1 billable day. */
export function startedDaysBetween(from, to) {
  const delta = new Date(to).getTime() - new Date(from).getTime();
  return delta <= 0 ? 0 : Math.ceil(delta / DAY_IN_MS);
}

export function isAfter(a, b) {
  return new Date(a).getTime() > new Date(b).getTime();
}
