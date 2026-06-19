/**
 * @file App
 * @module App
 *
 * Application entry point. Sets up gesture-handler root, boots iCloud sync,
 * and renders the main PetScreen.
 *
 * Edge cases:
 * - cloudSyncService.init is idempotent; teardown runs on unmount.
 * - MMKV stores hydrate synchronously before init's first reconcile.
 * - react-native-gesture-handler must be imported first (side effect).
 *
 * Usage:
 *   Registered as main in package.json → expo/AppEntry.
 */

import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PetScreen } from './src/screens/PetScreen';
import { cloudSyncService } from './src/services/cloud/cloudSyncService';

/** Root application component. */
export default function App() {
  useEffect(() => {
    const teardown = cloudSyncService.init();

    return teardown;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PetScreen />
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}
