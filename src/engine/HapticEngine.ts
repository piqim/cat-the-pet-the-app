/**
 * @file HapticEngine
 * @module engine/HapticEngine
 *
 * Zone-aware haptic feedback via expo-haptics. Each pet zone maps to a
 * distinct impact style; the eyes zone triggers an error notification pattern.
 *
 * Edge cases:
 * - All calls are no-ops when haptics are disabled via setEnabled(false).
 * - expo-haptics has no continuous engine — stop() is a no-op placeholder
 *   for a future CoreHaptics implementation.
 * - Haptic calls are async but callers need not await them.
 * - Simulator does not produce haptic feedback; test on a physical device.
 *
 * Usage:
 *   expoHapticEngine.setEnabled(hapticsEnabled);
 *   void expoHapticEngine.playPattern('chin');
 */

import * as Haptics from 'expo-haptics';

/** Haptic patterns mapped from pet zone IDs in PetScreen. */
export type HapticPattern = 'paw' | 'chest' | 'chin' | 'forehead' | 'ear' | 'annoyed';

/** Public interface for the haptic engine. */
export type HapticEngine = {
  setEnabled: (enabled: boolean) => void;
  playPattern: (pattern: HapticPattern) => Promise<void>;
  stop: () => Promise<void>;
};

let hapticsEnabled = true;

/**
 * Singleton haptic engine using expo-haptics impact and notification APIs.
 */
export const expoHapticEngine: HapticEngine = {
  /**
   * Enables or disables all haptic output.
   *
   * @param enabled - Master toggle (from settingsStore).
   */
  setEnabled(enabled) {
    hapticsEnabled = enabled;
  },

  /**
   * Plays a zone-specific haptic pattern.
   *
   * @param pattern - Zone-derived pattern name.
   * - `annoyed` → error notification (eyes zone).
   * - `chin` / `chest` → heavy impact.
   * - `forehead` → medium impact.
   * - `ear` / `paw` → light impact.
   */
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

  /**
   * Stops any ongoing haptic feedback. Currently a no-op because expo-haptics
   * only fires discrete impulses. Reserved for a future CoreHaptics engine.
   */
  async stop() {
    // expo-haptics has no continuous engine to stop.
  },
};
