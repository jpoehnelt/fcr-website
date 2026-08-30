/**
 * The single definition of what counts as a valid license plate.
 *
 * This module is deliberately dependency-free and free of any Node or
 * framework imports, so the exact same code runs in three places: the SSR
 * page, the API route, and the browser. Sharing the *function* — rather
 * than restating the rule as an HTML `pattern` attribute and again as a
 * server-side check — is what stops the two sides from drifting apart.
 */

const PLATE_CHARS = "A-Z0-9";
const PLATE_MIN = 2;
const PLATE_MAX = 10;

const PLATE_RE = new RegExp(`^[${PLATE_CHARS}]{${PLATE_MIN},${PLATE_MAX}}$`);

/**
 * Separators a member may reasonably type but that are not part of the
 * plate itself. Stripped before validation; anything else is an error.
 */
const PLATE_SEPARATORS = /[\s\-\u2010-\u2015.]+/g;

/** Longest raw string worth accepting, allowing for typed separators. */
export const PLATE_INPUT_MAXLENGTH = PLATE_MAX + 4;

export const PLATE_RULE_TEXT = `Letters and numbers only — ${PLATE_MIN} to ${PLATE_MAX} characters.`;

/** UniFi accepts a bounded plate list per user; the UI enforces the same cap. */
export const MAX_PLATES_PER_USER = 4;

/**
 * Normalizes a plate for storage: uppercase, with whitespace and
 * separators (dashes, dots) removed. Returns null when the result isn't a
 * plausible plate.
 *
 * Normalizing before validating is what lets a member type "abc-123" and
 * get "ABC123" instead of an error, while the stored value stays strictly
 * alphanumeric — the form the gate cameras report and the only form worth
 * sending to UniFi.
 */
export function normalizePlate(input: string): string | null {
  const plate = input.toUpperCase().replace(PLATE_SEPARATORS, "");
  return PLATE_RE.test(plate) ? plate : null;
}

/**
 * Browser-side check, expressed in terms of the same normalization the
 * server applies, so the two can't disagree about what is valid.
 */
export function describePlateProblem(input: string): string | null {
  if (!input.trim()) return "Enter a license plate.";
  return normalizePlate(input) === null ? PLATE_RULE_TEXT : null;
}
