import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PetScreen } from './src/screens/PetScreen';
import { cloudSyncService } from './src/services/cloud/cloudSyncService';

export default function App() {
  useEffect(() => {
    // Stores hydrate synchronously from MMKV before this runs, so the first
    // reconcile already has the local save in hand.
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
