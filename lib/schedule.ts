import { ScheduledSession } from './types';

/**
 * Returns the next occurrence date for a session.
 * For one-time sessions this is just scheduled_at.
 * For recurring sessions it advances the base date by the recurrence interval
 * until we find a date strictly in the future.
 */
export function nextOccurrence(session: ScheduledSession, from: Date = new Date()): Date {
  const base = new Date(session.scheduled_at);
  if (!session.is_recurring) return base;

  const rule = (session.recurrence_rule ?? '').toUpperCase();

  if (base > from) return base;

  if (rule.includes('DAILY')) {
    const next = new Date(base);
    while (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }

  if (rule.includes('WEEKLY')) {
    const next = new Date(base);
    while (next <= from) next.setDate(next.getDate() + 7);
    return next;
  }

  return base;
}

export function isUpcoming(session: ScheduledSession, from: Date = new Date()): boolean {
  return nextOccurrence(session, from) > from;
}
