import { StyleSheet } from 'react-native';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';

export const colors = {
  primary: '#1F3A5F',
  accent: '#0F8B8D',
  background: '#F5F6F8',
  card: '#FFFFFF',
  text: '#1B1F27',
  muted: '#6B7280',
  border: '#DDE1E7',
  danger: '#C0392B',
  success: '#2E7D4F',
  warning: '#B7791F',
};

export const spacing = { small: 8, medium: 16, large: 24 };

// Styles reused by many screens.
export const commonStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.medium, gap: spacing.medium },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: spacing.medium,
    borderWidth: 1, borderColor: colors.border, gap: spacing.small,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  bodyText: { fontSize: 14, color: colors.text },
  mutedText: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.small },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
