import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { TryOnProvider } from './src/context/TryOnContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <TryOnProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </TryOnProvider>
    </AuthProvider>
  );
}
