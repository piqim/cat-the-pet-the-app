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

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'localOnly' | 'error';

type SyncSnapshot = {
  status: SyncStatus;
  lastSyncedAt?: number;
};

const PUSH_DEBOUNCE_MS = 1500;

let initialized = false;
let isApplyingRemote = false;
let isReconciling = false;
let pendingReconcile = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
// Logical clock; the cloud document is the source of truth, so this is rebuilt
// from the remote on every reconcile and need not survive app restarts.
let localRev = 0;

let snapshot: SyncSnapshot = { status: 'idle' };
const listeners = new Set<(snapshot: SyncSnapshot) => void>();
const subscriptions: Array<() => void> = [];

function setSnapshot(next: Partial<SyncSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener(snapshot));
}

export const cloudSyncService = {
  getSnapshot: (): SyncSnapshot => snapshot,

  subscribe: (listener: (snapshot: SyncSnapshot) => void): (() => void) => {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },

  /** Idempotent: wires listeners and runs a first reconcile. Returns teardown. */
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

  /** Force an immediate reconcile (e.g. a user-triggered "Sync now"). */
  syncNow: (): Promise<void> => reconcile(),
};

function handleAppStateChange(state: AppStateStatus): void {
  if (state === 'active') {
    void reconcile();
  }
}

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

// On an Apple ID switch the remote belongs to a DIFFERENT user, so we must not
// merge (that would mix two accounts). Adopt the new account's remote as
// authoritative; if it has no save yet, leave local untouched and wait.
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

async function reconcile(): Promise<void> {
  if (!iCloudKvs.isAvailable()) {
    setSnapshot({ status: 'localOnly' });

    return;
  }

  // Coalesce concurrent calls: remember we need another pass and run it after.
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

// Write merged state into the stores without re-triggering a push. setState
// notifies subscribers synchronously, so clearing the flag right after is safe.
function applyRemote(doc: Parameters<typeof applySaveDocument>[0]): void {
  isApplyingRemote = true;

  try {
    applySaveDocument(doc);
  } finally {
    isApplyingRemote = false;
  }
}

function schedulePush(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
  }

  pushTimer = setTimeout(() => {
    pushTimer = undefined;
    void reconcile();
  }, PUSH_DEBOUNCE_MS);
}
