import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PetScreen } from './src/screens/PetScreen';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PetScreen />
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}
