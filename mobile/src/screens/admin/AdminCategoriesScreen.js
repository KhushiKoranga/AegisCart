import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { createCategory, deleteCategory, listCategories } from '../../services/adminService';
import Button from '../../components/Button';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';
import TextField from '../../components/TextField';

export default function AdminCategoriesScreen() {
  const { data: categories, loading, error, reload } = useApi(() => listCategories());
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  async function run(action) {
    setMessage('');
    try {
      await action();
      reload();
    } catch (actionError) {
      setMessage(actionError.message);
    }
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <FlatList
      style={commonStyles.screen}
      contentContainerStyle={commonStyles.content}
      data={categories}
      keyExtractor={(category) => String(category.id)}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <TextField label="New category" value={name} onChangeText={setName} autoCapitalize="words" />
          <Button title="Add category" onPress={() => run(async () => { await createCategory(name); setName(''); })} />
          <ErrorMessage message={message} />
        </View>
      }
      renderItem={({ item }) => (
        <View style={[commonStyles.card, commonStyles.spaceBetween]}>
          <Text style={commonStyles.subtitle}>{item.name}</Text>
          <Text style={{ color: 'red' }} onPress={() => run(() => deleteCategory(item.id))}>Delete</Text>
        </View>
      )}
    />
  );
}
