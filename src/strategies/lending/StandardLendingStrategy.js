import { BaseLendingStrategy } from './BaseLendingStrategy.js';

/** Default policy: 14 days, up to 5 concurrent loans. */
export class StandardLendingStrategy extends BaseLendingStrategy {
  constructor(options = {}) {
    super({ key: 'standard', durationDays: 14, maxActiveLoans: 5, ...options });
  }
}
