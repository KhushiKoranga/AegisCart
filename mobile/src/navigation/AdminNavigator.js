import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminProductFormScreen from '../screens/admin/AdminProductFormScreen';
import AdminVariantsScreen from '../screens/admin/AdminVariantsScreen';
import AdminCategoriesScreen from '../screens/admin/AdminCategoriesScreen';
import AdminInventoryScreen from '../screens/admin/AdminInventoryScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminFlashSalesScreen from '../screens/admin/AdminFlashSalesScreen';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin dashboard' }} />
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} options={{ title: 'Products' }} />
      <Stack.Screen name="AdminProductForm" component={AdminProductFormScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="AdminVariants" component={AdminVariantsScreen} options={{ title: 'Variants and stock' }} />
      <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} options={{ title: 'Categories' }} />
      <Stack.Screen name="AdminInventory" component={AdminInventoryScreen} options={{ title: 'Inventory changes' }} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ title: 'Orders' }} />
      <Stack.Screen name="AdminFlashSales" component={AdminFlashSalesScreen} options={{ title: 'Flash sales' }} />
    </Stack.Navigator>
  );
}
