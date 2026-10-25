import React, { useEffect } from 'react';
import { FlatList, Text, View } from 'react-native';
import { colors, commonStyles } from '../../constants/theme';
import useApi from '../../hooks/useApi';
import { listNotifications, markNotificationsRead } from '../../services/profileService';
import { formatDate } from '../../utils/format';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingView from '../../components/LoadingView';

export default function NotificationsScreen() {
  const { data: notifications, loading, error, reload } = useApi(() => listNotifications());

  // Opening the screen marks everything as read (the list shown still has the unread marks).
  useEffect(() => { markNotificationsRead().catch(() => {}); }, []);

  if (loading) return <LoadingView />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  return (
    <FlatList
      style={commonStyles.screen}
      contentContainerStyle={commonStyles.content}
      data={notifications}
      keyExtractor={(notification) => String(notification.id)}
      ListEmptyComponent={<EmptyState message="No notifications yet." />}
      renderItem={({ item }) => (
        <View style={[commonStyles.card, !item.isRead && { borderColor: colors.accent, borderWidth: 2 }]}>
          <Text style={commonStyles.subtitle}>{item.title}</Text>
          <Text style={commonStyles.bodyText}>{item.body}</Text>
          <Text style={commonStyles.mutedText}>{formatDate(item.createdAt)}</Text>
        </View>
      )}
    />
  );
}
