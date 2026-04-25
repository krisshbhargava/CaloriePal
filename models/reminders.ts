export type ReminderPreferences = {
  enabled: boolean;
  phoneNumber: string;
  timezone: string;
  lastActivityAt: string | null;
  lastSentAt: string | null;
  lastSentSlotKey: string | null;
  lastSentLocalDate: string | null;
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabled: false,
  phoneNumber: '',
  timezone: 'UTC',
  lastActivityAt: null,
  lastSentAt: null,
  lastSentSlotKey: null,
  lastSentLocalDate: null,
};

export const REMINDER_SLOTS = [
  { key: 'lunch', label: 'lunch', hour: 11, minute: 30 },
  { key: 'afternoon', label: 'the afternoon', hour: 15, minute: 30 },
  { key: 'dinner', label: 'dinner', hour: 18, minute: 0 },
] as const;

export const REMINDER_INACTIVITY_MS = 2 * 60 * 60 * 1000;
export const REMINDER_MATCH_WINDOW_MINUTES = 20;

export function getResolvedTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function normalizePhoneNumber(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) return '';
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export function isValidE164PhoneNumber(input: string): boolean {
  return /^\+[1-9]\d{9,14}$/.test(input);
}

export function getLocalDateKey(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(date);
}

export function getLocalHourMinute(date: Date, timeZone: string): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');

  return { hour, minute };
}

export function getCurrentReminderSlot(
  date: Date,
  timeZone: string,
  windowMinutes = REMINDER_MATCH_WINDOW_MINUTES
): (typeof REMINDER_SLOTS)[number] | null {
  const local = getLocalHourMinute(date, timeZone);
  const currentMinutes = local.hour * 60 + local.minute;

  return (
    REMINDER_SLOTS.find((slot) => {
      const slotMinutes = slot.hour * 60 + slot.minute;
      return Math.abs(currentMinutes - slotMinutes) <= windowMinutes;
    }) ?? null
  );
}

export function hasBeenInactive(lastActivityAt: string | null, now: Date, minMs = REMINDER_INACTIVITY_MS): boolean {
  if (!lastActivityAt) return true;
  const lastActivityMs = Date.parse(lastActivityAt);
  if (!Number.isFinite(lastActivityMs)) return true;
  return now.getTime() - lastActivityMs >= minMs;
}

export function buildReminderMessage(remainingCalories: number, remainingProtein: number, slotLabel: string): string {
  if (remainingCalories > 0 && remainingProtein > 0) {
    return `Quick check-in before ${slotLabel}: you have ${remainingCalories} calories left and ${remainingProtein}g of protein to go today.`;
  }

  if (remainingProtein > 0) {
    return `Quick check-in before ${slotLabel}: you still have ${remainingProtein}g of protein to go today.`;
  }

  return `Quick check-in before ${slotLabel}: you have ${remainingCalories} calories left for today.`;
}
