import * as Notifications from 'expo-notifications';

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const next = await Notifications.requestPermissionsAsync();

  return next.granted;
}

export async function schedulePetReminder(): Promise<string | undefined> {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    return undefined;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your cat is stretching',
      body: 'Someone could use a few scritches.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 24,
    },
  });
}
