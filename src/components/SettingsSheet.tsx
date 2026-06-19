import { useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { cloudSyncService, SyncStatus } from '../services/cloud/cloudSyncService';
import { useSettingsStore } from '../stores/settingsStore';

type SettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
  onRenameCat: () => void;
};

export function SettingsSheet({ visible, onClose, onRenameCat }: SettingsSheetProps) {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const sync = useSyncExternalStore(cloudSyncService.subscribe, cloudSyncService.getSnapshot);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Settings</Text>

          <ToggleRow
            label="Sound"
            description="Purr and ambient audio"
            value={soundEnabled}
            onValueChange={setSoundEnabled}
          />
          <ToggleRow
            label="Haptics"
            description="Vibration feedback while petting"
            value={hapticsEnabled}
            onValueChange={setHapticsEnabled}
          />
          <ToggleRow
            label="Daily reminders"
            description="A gentle nudge to come pet the cat"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />

          <Pressable
            style={styles.row}
            onPress={() => {
              void cloudSyncService.syncNow();
            }}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>iCloud Sync</Text>
              <Text style={styles.rowDescription}>{describeSync(sync.status, sync.lastSyncedAt)}</Text>
            </View>
            <Text style={[styles.syncValue, sync.status === 'localOnly' && styles.syncValueMuted]}>
              {SYNC_VALUE[sync.status]}
            </Text>
          </Pressable>

          <Pressable style={styles.renameRow} onPress={onRenameCat}>
            <Text style={styles.renameText}>Rename cat</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const SYNC_VALUE: Record<SyncStatus, string> = {
  idle: 'Starting',
  syncing: 'Syncing',
  synced: 'On',
  localOnly: 'This device',
  error: 'Retry',
};

function describeSync(status: SyncStatus, lastSyncedAt?: number): string {
  switch (status) {
    case 'synced':
      return lastSyncedAt
        ? `Backed up to iCloud - last synced ${formatTime(lastSyncedAt)}`
        : 'Progress backs up to your iCloud';
    case 'syncing':
      return 'Backing up your progress';
    case 'localOnly':
      return 'Sign in to iCloud to back up and sync devices';
    case 'error':
      return 'Could not reach iCloud - tap to retry';
    default:
      return 'Preparing iCloud sync';
  }
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e0d2bd', true: '#f2b65a' }}
        thumbColor="#fff8ee"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(40, 28, 18, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff8ee',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  title: {
    color: '#4a3528',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: '#f0e2cf',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    color: '#4a3528',
    fontSize: 17,
    fontWeight: '700',
  },
  rowDescription: {
    color: '#9a7c64',
    fontSize: 13,
    marginTop: 2,
  },
  syncValue: {
    color: '#a85a2a',
    fontSize: 16,
    fontWeight: '800',
  },
  syncValueMuted: {
    color: '#b8a48f',
  },
  renameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  renameText: {
    color: '#4a3528',
    fontSize: 17,
    fontWeight: '700',
  },
  chevron: {
    color: '#b8a48f',
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#4a3528',
    borderRadius: 999,
    marginTop: 12,
    paddingVertical: 14,
  },
  closeText: {
    color: '#fff2df',
    fontSize: 16,
    fontWeight: '800',
  },
});
