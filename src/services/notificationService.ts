/**
 * @file notificationService
 * @module services/notificationService
 *
 * Local daily pet reminders via expo-notifications. Schedules a single
 * repeating notification at TUNING.REMINDER_HOUR, respecting quiet hours.
 *
 * Edge cases:
 * - Permission denied → scheduleDailyPetReminder returns undefined silently.
 * - `canAskAgain: false` → no re-prompt; user must enable in Settings app.
 * - Re-scheduling cancels the previous notification first (no duplicates).
 * - If REMINDER_HOUR falls inside quiet hours, no notification is scheduled.
 * - Quiet hours wrapping midnight (22→8) handled by isWithinQuietHours.
 * - Foreground notifications show banner but play no sound.
 *
 * Usage:
 *   await scheduleDailyPetReminder();
 *   await cancelDailyPetReminder();
 */

import * as Notifications from 'expo-notifications';

import { TUNING } from '../data/tuning';

/** Stable identifier so we can cancel/reschedule without stacking duplicates. */
const REMINDER_IDENTIFIER = 'daily-pet-reminder';

/** Pool of reminder copy; one is picked at random each schedule. */
const REMINDER_MESSAGES: { title: string; body: string }[] = [
  { title: 'Someone misses you', body: 'Your cat has been loafing by the door. A few scritches?' },
  { title: 'Stretch break', body: 'The cat did a big stretch and looked at your phone meaningfully.' },
  { title: 'Purr request pending', body: 'Tap in for a quick chin scratch and keep the streak alive.' },
  { title: 'Cozy hours', body: 'Perfect time for some gentle ear rubs.' },
  { title: 'Tiny reminder', body: 'A warm little cat is waiting to be appreciated.' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Tests whether a local hour falls inside the configured quiet window.
 *
 * @param hour - Local hour (0–23).
 * @returns True if notifications should be suppressed at this hour.
 */
function isWithinQuietHours(hour: number): boolean {
  const QUIET_HOURS_START: number = TUNING.QUIET_HOURS_START;
  const QUIET_HOURS_END: number = TUNING.QUIET_HOURS_END;

  if (QUIET_HOURS_START === QUIET_HOURS_END) {
    return false;
  }

  if (QUIET_HOURS_START > QUIET_HOURS_END) {
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
  }

  return hour >= QUIET_HOURS_START && hour < QUIET_HOURS_END;
}

/**
 * Picks a random reminder message from the pool.
 *
 * @returns Title and body for the notification content.
 */
function pickReminderMessage(): { title: string; body: string } {
  const index = Math.floor(Math.random() * REMINDER_MESSAGES.length);

  return REMINDER_MESSAGES[index];
}

/**
 * Requests notification permission if not already granted.
 *
 * @returns True if permission is granted (or was already granted).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  if (!current.canAskAgain) {
    return false;
  }

  const next = await Notifications.requestPermissionsAsync();

  return next.granted;
}

/**
 * Cancels the scheduled daily pet reminder. Safe to call when none exists.
 */
export async function cancelDailyPetReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => undefined);
}

/**
 * Schedules a single daily pet reminder at TUNING.REMINDER_HOUR.
 * Cancels any existing schedule first. Skips if permission denied or
 * the reminder hour falls inside quiet hours.
 *
 * @returns Notification identifier on success, undefined if skipped.
 */
export async function scheduleDailyPetReminder(): Promise<string | undefined> {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    return undefined;
  }

  if (isWithinQuietHours(TUNING.REMINDER_HOUR)) {
    return undefined;
  }

  await cancelDailyPetReminder();

  const message = pickReminderMessage();

  return Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: message.title,
      body: message.body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: TUNING.REMINDER_HOUR,
      minute: TUNING.REMINDER_MINUTE,
    },
  });
}
