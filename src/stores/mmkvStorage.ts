/**
 * @file mmkvStorage
 * @module stores/mmkvStorage
 *
 * Bridges Zustand's `persist` middleware to a single MMKV instance. All stores
 * share one MMKV database (`cat-the-pet-storage`) but use separate keys
 * (`progress-v2`, `cosmetics-v1`, `settings-v1`).
 *
 * Edge cases:
 * - MMKV is synchronous — hydration completes before the first React render.
 * - `getItem` returns `null` for missing keys (Zustand expects null, not undefined).
 * - Data is wiped on app uninstall; iCloud sync is the reinstall recovery path.
 *
 * Usage:
 *   storage: createJSONStorage(() => zustandMmkvStorage)
 */

import { createMMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

/** Shared MMKV instance for all Zustand persisted stores. */
const storage = createMMKV({
  id: 'cat-the-pet-storage',
});

/**
 * Zustand-compatible storage adapter backed by MMKV.
 * Passed to `createJSONStorage(() => zustandMmkvStorage)` in each store.
 */
export const zustandMmkvStorage: StateStorage = {
  /**
   * Reads a persisted store slice by its storage key.
   *
   * @param name - Zustand persist key (e.g. `'progress-v2'`).
   * @returns JSON string, or `null` if the key does not exist.
   */
  getItem: (name) => storage.getString(name) ?? null,

  /**
   * Writes a persisted store slice.
   *
   * @param name - Zustand persist key.
   * @param value - Serialized JSON string.
   */
  setItem: (name, value) => {
    storage.set(name, value);
  },

  /**
   * Removes a persisted store slice (e.g. on store reset).
   *
   * @param name - Zustand persist key to delete.
   */
  removeItem: (name) => {
    storage.remove(name);
  },
};
