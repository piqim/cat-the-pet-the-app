/**
 * @file settingsStore
 * @module stores/settingsStore
 *
 * User preferences: sound, haptics, and daily notification toggles. Persisted
 * to MMKV and included in the iCloud save document (latest-wins on merge).
 *
 * Edge cases:
 * - Defaults are all `true` on first launch.
 * - Toggling notifications does not request permission — that happens in
 *   notificationService when scheduling is first attempted.
 * - Settings changes trigger a debounced iCloud push via cloudSyncService.
 *
 * Usage:
 *   const sound = useSettingsStore(s => s.soundEnabled);
 *   useSettingsStore.getState().setSoundEnabled(false);
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandMmkvStorage } from './mmkvStorage';

/**
 * Settings store state and actions.
 *
 * @property soundEnabled - Master toggle for purr and ambient audio.
 * @property hapticsEnabled - Master toggle for petting vibration feedback.
 * @property notificationsEnabled - Whether daily pet reminders are scheduled.
 */
export type SettingsState = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
  setHapticsEnabled: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
};

/** Persisted user settings. MMKV key: `settings-v1`. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      notificationsEnabled: true,
      setSoundEnabled: (value) => set({ soundEnabled: value }),
      setHapticsEnabled: (value) => set({ hapticsEnabled: value }),
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
    }),
    {
      name: 'settings-v1',
      storage: createJSONStorage(() => zustandMmkvStorage),
    },
  ),
);
