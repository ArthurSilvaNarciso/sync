import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, fontSize, spacing } from '../../theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  selected: {
    backgroundColor: 'rgba(255,107,53,0.20)',
    borderColor: '#FF6B35',
  },
  text: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  selectedText: {
    color: '#FF9A5C',
    fontWeight: '700',
  },
});
