import * as Notifications from 'expo-notifications';

import { TUNING } from '../data/tuning';

const REMINDER_IDENTIFIER = 'daily-pet-reminder';

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

function isWithinQuietHours(hour: number): boolean {
  const QUIET_HOURS_START: number = TUNING.QUIET_HOURS_START;
  const QUIET_HOURS_END: number = TUNING.QUIET_HOURS_END;

  if (QUIET_HOURS_START === QUIET_HOURS_END) {
    return false;
  }

  // Quiet window wraps past midnight (e.g. 22 -> 8).
  if (QUIET_HOURS_START > QUIET_HOURS_END) {
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
  }

  return hour >= QUIET_HOURS_START && hour < QUIET_HOURS_END;
}

function pickReminderMessage(): { title: string; body: string } {
  const index = Math.floor(Math.random() * REMINDER_MESSAGES.length);

  return REMINDER_MESSAGES[index];
}

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

export async function cancelDailyPetReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => undefined);
}

/**
 * Schedules a single light-hearted daily reminder, keeping it out of quiet hours.
 * Re-running cancels the previous schedule first so we never stack duplicates.
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
