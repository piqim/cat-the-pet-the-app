/**
 * @file iCloudKvs
 * @module services/cloud/iCloudKvs
 *
 * Thin, swappable abstraction over Apple's NSUbiquitousKeyValueStore via
 * @nauverse/expo-cloud-settings. All methods are crash-safe and degrade to
 * no-ops when iCloud is unavailable.
 *
 * Edge cases:
 * - Android: all methods no-op (isAvailable → false, getItem → null).
 * - iOS without signed-in iCloud: isAvailable → false.
 * - Native exceptions are caught and swallowed — cloud failure must never crash gameplay.
 * - KVS does not sync in the iOS Simulator; test on a physical device.
 * - KVS limits: 1 MB total, 1024 keys, 1 MB per key.
 *
 * Usage:
 *   if (iCloudKvs.isAvailable()) {
 *     iCloudKvs.setItem('save-doc-v1', json);
 *   }
 */

import { Platform } from 'react-native';

import {
  addChangeListener as nativeAddChangeListener,
  getAllKeys as nativeGetAllKeys,
  getString as nativeGetString,
  isAvailable as nativeIsAvailable,
  remove as nativeRemove,
  setString as nativeSetString,
} from '@nauverse/expo-cloud-settings';

/** Why the KVS reported a change event. */
export type CloudKvsChangeReason =
  | 'serverChange'
  | 'initialSync'
  | 'quotaViolation'
  | 'accountChange';

/** Payload from addChangeListener when iCloud KVS changes. */
export type CloudKvsChangeEvent = {
  readonly changedKeys: ReadonlyArray<string>;
  readonly reason: CloudKvsChangeReason;
};

/** Handle returned by addChangeListener; call remove() to unsubscribe. */
export type CloudKvsSubscription = {
  remove: () => void;
};

/**
 * Interface for the cloud key-value store. Implemented by {@link iCloudKvs}.
 */
export type CloudKvs = {
  isAvailable: () => boolean;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  getAllKeys: () => string[];
  addChangeListener: (callback: (event: CloudKvsChangeEvent) => void) => CloudKvsSubscription;
};

/** No-op subscription returned on non-iOS platforms. */
const NOOP_SUBSCRIPTION: CloudKvsSubscription = { remove: () => undefined };

const isIos = Platform.OS === 'ios';

/**
 * Default CloudKvs implementation backed by iCloud on iOS.
 */
export const iCloudKvs: CloudKvs = {
  isAvailable: () => {
    if (!isIos) {
      return false;
    }

    try {
      return nativeIsAvailable();
    } catch {
      return false;
    }
  },
  getItem: (key) => {
    if (!isIos) {
      return null;
    }

    try {
      return nativeGetString(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    if (!isIos) {
      return;
    }

    try {
      nativeSetString(key, value);
    } catch {
      // Swallow: a failed cloud write must never break local gameplay.
    }
  },
  removeItem: (key) => {
    if (!isIos) {
      return;
    }

    try {
      nativeRemove(key);
    } catch {
      // Swallow.
    }
  },
  getAllKeys: () => {
    if (!isIos) {
      return [];
    }

    try {
      return nativeGetAllKeys();
    } catch {
      return [];
    }
  },
  addChangeListener: (callback) => {
    if (!isIos) {
      return NOOP_SUBSCRIPTION;
    }

    try {
      const subscription = nativeAddChangeListener((event) => {
        callback({
          changedKeys: event.changedKeys,
          reason: event.reason as CloudKvsChangeReason,
        });
      });

      return { remove: () => subscription.remove() };
    } catch {
      return NOOP_SUBSCRIPTION;
    }
  },
};
