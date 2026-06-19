/**
 * @file cloudSyncService
 * @module services/cloud/cloudSyncService
 *
 * Orchestrates iCloud KVS sync: pull → merge → push. MMKV remains the local
 * source of truth; iCloud is the backup and cross-device mirror.
 *
 * Sync triggers:
 * - App launch (init → reconcile)
 * - App foreground (AppState → active)
 * - iCloud serverChange / initialSync events
 * - Debounced store mutations (1.5s after last local change)
 * - Manual: Settings "iCloud Sync" row or syncNow()
 *
 * Edge cases:
 * - iCloud unavailable → status 'localOnly', app runs on MMKV only.
 * - accountChange → adopt new Apple ID's remote (no cross-account merge).
 * - quotaViolation → status 'error'.
 * - isApplyingRemote guard prevents push loops during remote apply.
 * - Concurrent reconcile calls coalesce via pendingReconcile flag.
 *
 * Manual verification (requires physical device, signed-in iCloud):
 * 1. Reinstall recovery: earn progress, delete app, reinstall → data restored.
 * 2. Fresh device: second device same Apple ID → progress appears.
 * 3. Offline divergence: airplane mode both, A earns + B buys, reconnect →
 *    both earnings and purchase survive merge.
 * 4. Live update: earn on A → B reflects within seconds.
 * 5. iCloud off: app works locally; Settings shows "This device".
 * 6. Apple ID switch: new account's save adopted, not merged with old.
 *
 * Automated merge tests: __tests__/mergeSave.test.ts.
 *
 * Usage:
 *   useEffect(() => cloudSyncService.init(), []);
 *   const sync = useSyncExternalStore(cloudSyncService.subscribe, cloudSyncService.getSnapshot);
 */

import { AppState, AppStateStatus } from 'react-native';

import { useCosmeticsStore } from '../../stores/cosmeticsStore';
import { useProgressStore } from '../../stores/progressStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { CloudKvsChangeEvent, iCloudKvs } from './iCloudKvs';
import { mergeSave } from './mergeSave';
import {
  applySaveDocument,
  composeSaveDocument,
  parseSaveDocument,
  SAVE_DOC_KEY,
  serializeSaveDocument,
} from './saveDocument';

/** Current iCloud sync state shown in Settings. */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'localOnly' | 'error';

/** Snapshot exposed to React via subscribe/getSnapshot. */
type SyncSnapshot = {
  status: SyncStatus;
  lastSyncedAt?: number;
};

/** Debounce window before pushing local changes to iCloud. */
const PUSH_DEBOUNCE_MS = 1500;

let initialized = false;
let isApplyingRemote = false;
let isReconciling = false;
let pendingReconcile = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let localRev = 0;

let snapshot: SyncSnapshot = { status: 'idle' };
const listeners = new Set<(snapshot: SyncSnapshot) => void>();
const subscriptions: Array<() => void> = [];

/**
 * Notifies all subscribers of a snapshot change.
 *
 * @param next - Partial fields to merge into the current snapshot.
 */
function setSnapshot(next: Partial<SyncSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener(snapshot));
}

/**
 * Singleton cloud sync service. Initialize once from App.tsx.
 */
export const cloudSyncService = {
  /** Returns the current sync snapshot (for useSyncExternalStore). */
  getSnapshot: (): SyncSnapshot => snapshot,

  /**
   * Subscribes to snapshot changes.
   *
   * @param listener - Callback invoked on every snapshot update.
   * @returns Unsubscribe function.
   */
  subscribe: (listener: (snapshot: SyncSnapshot) => void): (() => void) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },

  /**
   * Wires listeners and runs the first reconcile. Idempotent.
   *
   * @returns Teardown function (same as teardown).
   */
  init: (): (() => void) => {
    if (initialized) {
      return cloudSyncService.teardown;
    }

    initialized = true;

    if (!iCloudKvs.isAvailable()) {
      setSnapshot({ status: 'localOnly' });
    }

    const cloudSubscription = iCloudKvs.addChangeListener(handleCloudChange);
    subscriptions.push(() => cloudSubscription.remove());

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    subscriptions.push(() => appStateSubscription.remove());

    const onStoreChange = () => {
      if (isApplyingRemote || !iCloudKvs.isAvailable()) {
        return;
      }

      schedulePush();
    };

    subscriptions.push(useProgressStore.subscribe(onStoreChange));
    subscriptions.push(useCosmeticsStore.subscribe(onStoreChange));
    subscriptions.push(useSettingsStore.subscribe(onStoreChange));

    void reconcile();

    return cloudSyncService.teardown;
  },

  /** Removes all listeners and clears debounce timer. */
  teardown: (): void => {
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = undefined;
    }

    while (subscriptions.length > 0) {
      const unsubscribe = subscriptions.pop();
      unsubscribe?.();
    }

    initialized = false;
  },

  /** Forces an immediate pull-merge-push cycle. */
  syncNow: (): Promise<void> => reconcile(),
};

/**
 * Re-syncs when the app returns to the foreground.
 *
 * @param state - New AppState value.
 */
function handleAppStateChange(state: AppStateStatus): void {
  if (state === 'active') {
    void reconcile();
  }
}

/**
 * Handles iCloud KVS change events from another device or account switch.
 *
 * @param event - Change event with reason and affected keys.
 */
function handleCloudChange(event: CloudKvsChangeEvent): void {
  if (event.reason === 'accountChange') {
    handleAccountChange();

    return;
  }

  if (event.reason === 'quotaViolation') {
    setSnapshot({ status: 'error' });

    return;
  }

  const affectsSaveDoc =
    event.changedKeys.length === 0 || event.changedKeys.includes(SAVE_DOC_KEY);

  if (affectsSaveDoc) {
    void reconcile();
  }
}

/**
 * On Apple ID switch, adopt the new account's remote without merging
 * across accounts. If the new account has no save, leave local untouched.
 */
function handleAccountChange(): void {
  if (!iCloudKvs.isAvailable()) {
    setSnapshot({ status: 'localOnly' });

    return;
  }

  const remote = parseSaveDocument(iCloudKvs.getItem(SAVE_DOC_KEY));

  if (!remote) {
    return;
  }

  applyRemote(remote);
  localRev = remote.rev;
  setSnapshot({ status: 'synced', lastSyncedAt: Date.now() });
}

/**
 * Core sync loop: pull remote, merge with local, apply, push.
 * Coalesces concurrent calls via pendingReconcile.
 */
async function reconcile(): Promise<void> {
  if (!iCloudKvs.isAvailable()) {
    setSnapshot({ status: 'localOnly' });

    return;
  }

  if (isReconciling) {
    pendingReconcile = true;

    return;
  }

  isReconciling = true;
  setSnapshot({ status: 'syncing' });

  try {
    const remote = parseSaveDocument(iCloudKvs.getItem(SAVE_DOC_KEY));
    const local = composeSaveDocument(localRev);

    const merged = remote
      ? mergeSave(local, remote)
      : { ...local, rev: localRev + 1, updatedAt: Date.now() };

    applyRemote(merged);
    localRev = merged.rev;

    iCloudKvs.setItem(SAVE_DOC_KEY, serializeSaveDocument(merged));
    setSnapshot({ status: 'synced', lastSyncedAt: Date.now() });
  } catch {
    setSnapshot({ status: 'error' });
  } finally {
    isReconciling = false;

    if (pendingReconcile) {
      pendingReconcile = false;
      void reconcile();
    }
  }
}

/**
 * Applies a document to stores without triggering a debounced push.
 *
 * @param doc - Merged or remote save document.
 */
function applyRemote(doc: Parameters<typeof applySaveDocument>[0]): void {
  isApplyingRemote = true;

  try {
    applySaveDocument(doc);
  } finally {
    isApplyingRemote = false;
  }
}

/** Schedules a debounced reconcile after local store mutations. */
function schedulePush(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
  }

  pushTimer = setTimeout(() => {
    pushTimer = undefined;
    void reconcile();
  }, PUSH_DEBOUNCE_MS);
}
