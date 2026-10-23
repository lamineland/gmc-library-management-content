/** Numeric helpers shared by fee/pricing strategies. */

export function roundTo(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
