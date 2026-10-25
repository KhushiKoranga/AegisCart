import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { savePushToken } from '../services/profileService';

// Asks permission and sends the device's push token (an FCM token on Android) to the backend.
// This needs a development build with Firebase set up. In Expo Go it simply does nothing.
export default function usePushRegistration(enabled) {
  useEffect(() => {
    if (!enabled) return;
    async function register() {
      try {
        const permission = await Notifications.requestPermissionsAsync();
        if (!permission.granted) return;
        const token = await Notifications.getDevicePushTokenAsync();
        if (token && token.data && Platform.OS === 'android') await savePushToken(String(token.data));
      } catch (error) {
        console.log('Push notifications are not available:', error.message);
      }
    }
    register();
  }, [enabled]);
}
