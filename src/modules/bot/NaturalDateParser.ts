/**
 * Parses natural language dates into JavaScript Date instances.
 * @author noexdev
 * @version 1.0.0
 */
import * as chrono from 'chrono-node';

/**
 * Parses a natural language date string into a JavaScript Date.
 *
 * @param input - Natural language text that may contain a date expression.
 * @returns The parsed date or null when no valid date can be inferred.
 */
export function parseNaturalDate(input?: string): Date | null {
  if (!input?.trim()) return null;
  return (
    chrono.es.parseDate(input, new Date(), { forwardDate: true }) ??
    chrono.parseDate(input, new Date(), { forwardDate: true }) ??
    null
  );
}
