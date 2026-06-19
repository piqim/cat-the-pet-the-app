import { Platform } from 'react-native';

import {
  addChangeListener as nativeAddChangeListener,
  getAllKeys as nativeGetAllKeys,
  getString as nativeGetString,
  isAvailable as nativeIsAvailable,
  remove as nativeRemove,
  setString as nativeSetString,
} from '@nauverse/expo-cloud-settings';

export type CloudKvsChangeReason =
  | 'serverChange'
  | 'initialSync'
  | 'quotaViolation'
  | 'accountChange';

export type CloudKvsChangeEvent = {
  readonly changedKeys: ReadonlyArray<string>;
  readonly reason: CloudKvsChangeReason;
};

export type CloudKvsSubscription = {
  remove: () => void;
};

/**
 * Thin, swappable abstraction over the iCloud Key-Value Store. All methods are
 * crash-safe: on a platform without iCloud (Android, or iOS without a signed-in
 * account) they degrade to no-ops so the app keeps running on local MMKV.
 */
export type CloudKvs = {
  isAvailable: () => boolean;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  getAllKeys: () => string[];
  addChangeListener: (callback: (event: CloudKvsChangeEvent) => void) => CloudKvsSubscription;
};

const NOOP_SUBSCRIPTION: CloudKvsSubscription = { remove: () => undefined };

const isIos = Platform.OS === 'ios';

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
