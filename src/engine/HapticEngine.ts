import * as Haptics from 'expo-haptics';

export type HapticPattern = 'paw' | 'chest' | 'chin' | 'forehead' | 'ear' | 'annoyed';

export type HapticEngine = {
  setEnabled: (enabled: boolean) => void;
  playPattern: (pattern: HapticPattern) => Promise<void>;
  stop: () => Promise<void>;
};

let hapticsEnabled = true;

export const expoHapticEngine: HapticEngine = {
  setEnabled(enabled) {
    hapticsEnabled = enabled;
  },
  async playPattern(pattern) {
    if (!hapticsEnabled) {
      return;
    }

    switch (pattern) {
      case 'annoyed':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'chin':
      case 'chest':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'forehead':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'ear':
      case 'paw':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  },
  async stop() {
    // expo-haptics has no continuous engine to stop. A CoreHaptics implementation can override this.
  },
};
