import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../constants/theme';
import usePushRegistration from '../hooks/usePushRegistration';

import HomeScreen from '../screens/home/HomeScreen';
import ProductListScreen from '../screens/products/ProductListScreen';
import ProductDetailsScreen from '../screens/products/ProductDetailsScreen';
import WishlistScreen from '../screens/products/WishlistScreen';
import CartScreen from '../screens/cart/CartScreen';
import AddressSelectionScreen from '../screens/checkout/AddressSelectionScreen';
import CheckoutScreen from '../screens/checkout/CheckoutScreen';
import PaymentScreen from '../screens/checkout/PaymentScreen';
import PaymentStatusScreen from '../screens/checkout/PaymentStatusScreen';
import OrderHistoryScreen from '../screens/orders/OrderHistoryScreen';
import OrderDetailsScreen from '../screens/orders/OrderDetailsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import TryOnPhotoScreen from '../screens/virtualTryOn/TryOnPhotoScreen';
import TryOnProcessingScreen from '../screens/virtualTryOn/TryOnProcessingScreen';
import TryOnResultScreen from '../screens/virtualTryOn/TryOnResultScreen';
import TryOnOutfitPickerScreen from '../screens/virtualTryOn/TryOnOutfitPickerScreen';
import TryOnCompareScreen from '../screens/virtualTryOn/TryOnCompareScreen';
import SavedTryOnScreen from '../screens/virtualTryOn/SavedTryOnScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = { Home: '🏠', Shop: '🛍️', 'My Looks': '👗', Cart: '🛒', Profile: '👤' };

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: () => <Text>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shop" component={ProductListScreen} />
      <Tab.Screen name="My Looks" component={SavedTryOnScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function CustomerNavigator() {
  usePushRegistration(true);

  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={CustomerTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="AddressSelection" component={AddressSelectionScreen} options={{ title: 'Delivery address' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="PaymentStatus" component={PaymentStatusScreen} options={{ title: 'Order status', headerBackVisible: false }} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'My orders' }} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{ title: 'Order details' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="TryOnPhoto" component={TryOnPhotoScreen} options={{ title: 'Virtual Try-On' }} />
      <Stack.Screen name="TryOnProcessing" component={TryOnProcessingScreen} options={{ title: 'Creating preview', headerBackVisible: false }} />
      <Stack.Screen name="TryOnResult" component={TryOnResultScreen} options={{ title: 'Your preview' }} />
      <Stack.Screen name="TryOnOutfitPicker" component={TryOnOutfitPickerScreen} options={{ title: 'Choose an outfit' }} />
      <Stack.Screen name="TryOnCompare" component={TryOnCompareScreen} options={{ title: 'Compare outfits' }} />
    </Stack.Navigator>
  );
}
