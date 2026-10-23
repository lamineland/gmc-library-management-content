/**
 * Small, reusable guard helpers used by entities, factories and services.
 * They throw {@link ValidationError} so invalid state never enters the system.
 */

import { ValidationError } from './errors.js';

export function ensure(condition, message, details = undefined) {
  if (!condition) {
    throw new ValidationError(message, details);
  }
  return true;
}

export function ensureNonEmptyString(value, field) {
  ensure(
    typeof value === 'string' && value.trim().length > 0,
    `"${field}" must be a non-empty string.`,
    { field, value },
  );
  return value.trim();
}

export function ensurePositiveInteger(value, field) {
  ensure(
    Number.isInteger(value) && value > 0,
    `"${field}" must be a positive integer.`,
    { field, value },
  );
  return value;
}

export function ensureNonNegativeInteger(value, field) {
  ensure(
    Number.isInteger(value) && value >= 0,
    `"${field}" must be a non-negative integer.`,
    { field, value },
  );
  return value;
}

export function ensurePositiveNumber(value, field) {
  ensure(
    typeof value === 'number' && Number.isFinite(value) && value > 0,
    `"${field}" must be a positive number.`,
    { field, value },
  );
  return value;
}

export function ensureOneOf(value, allowedValues, field) {
  ensure(
    allowedValues.includes(value),
    `"${field}" must be one of: ${allowedValues.join(', ')}.`,
    { field, value, allowedValues },
  );
  return value;
}

export function ensureInstance(value, ExpectedType, field) {
  ensure(
    value instanceof ExpectedType,
    `"${field}" must be an instance of ${ExpectedType.name}.`,
    { field, expected: ExpectedType.name },
  );
  return value;
}

export function ensureDate(value, field) {
  ensure(
    value instanceof Date && !Number.isNaN(value.getTime()),
    `"${field}" must be a valid Date.`,
    { field, value },
  );
  return value;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ensureEmail(value, field = 'email') {
  const email = ensureNonEmptyString(value, field);
  ensure(EMAIL_PATTERN.test(email), `"${field}" must be a valid email address.`, {
    field,
    value,
  });
  return email.toLowerCase();
}

export function ensureFunction(value, field) {
  ensure(typeof value === 'function', `"${field}" must be a function.`, { field });
  return value;
}
