import { BaseLendingStrategy } from './BaseLendingStrategy.js';

/** Student policy: shorter loans but a higher concurrent limit for coursework. */
export class StudentLendingStrategy extends BaseLendingStrategy {
  constructor(options = {}) {
    super({ key: 'student', durationDays: 21, maxActiveLoans: 8, ...options });
  }
}
