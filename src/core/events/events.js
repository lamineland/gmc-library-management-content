/**
 * Canonical domain event names. Keeping them in one place prevents typos and
 * makes it obvious which events the system can emit.
 */
export const Events = Object.freeze({
  BOOK_ADDED: 'book:added',
  BOOK_UPDATED: 'book:updated',
  MEMBER_REGISTERED: 'member:registered',
  MEMBER_UPDATED: 'member:updated',
  LOAN_CREATED: 'loan:created',
  LOAN_RETURNED: 'loan:returned',
  LOAN_OVERDUE: 'loan:overdue',
  FEE_CHARGED: 'fee:charged',
});
