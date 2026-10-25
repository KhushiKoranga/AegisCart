import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

// A row of choices such as sizes or colours.
// options = [{ key, label, disabled }]
// Use selectedKey for one choice, or selectedKeys (an array) when several can be chosen.
export default function OptionChips({ options, selectedKey, selectedKeys, onSelect }) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = selectedKeys ? selectedKeys.includes(option.key) : option.key === selectedKey;
        return (
          <Pressable
            key={option.key}
            disabled={option.disabled}
            onPress={() => onSelect(option.key)}
            style={[styles.chip, selected && styles.selectedChip, option.disabled && styles.disabledChip]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  selectedChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  disabledChip: { opacity: 0.4 },
  label: { fontSize: 14, color: colors.text },
  selectedLabel: { color: '#FFFFFF', fontWeight: '600' },
});
