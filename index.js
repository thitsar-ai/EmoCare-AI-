import 'react-native-reanimated';
import { registerRootComponent } from 'expo';

import LaunchGate from './components/launch/LaunchGate';

// Lazy-load App so Expo Go shows our dark splash while the main bundle parses.
registerRootComponent(LaunchGate);
