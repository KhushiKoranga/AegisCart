import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AdminLoginScreen from '../screens/auth/AdminLoginScreen';
import CustomerNavigator from './CustomerNavigator';
import AdminNavigator from './AdminNavigator';

const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
      <AuthStack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ title: 'Admin login' }} />
    </AuthStack.Navigator>
  );
}

// Decides which part of the app to show. The backend still checks the role on every admin request,
// this only controls what the screen shows.
export default function RootNavigator() {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer>
      {!user ? <AuthNavigator /> : isAdmin ? <AdminNavigator /> : <CustomerNavigator />}
    </NavigationContainer>
  );
}
