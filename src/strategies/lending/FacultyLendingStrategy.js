import { BaseLendingStrategy } from './BaseLendingStrategy.js';

/** Faculty policy: long research loans with a generous limit. */
export class FacultyLendingStrategy extends BaseLendingStrategy {
  constructor(options = {}) {
    super({ key: 'faculty', durationDays: 60, maxActiveLoans: 20, ...options });
  }
}
