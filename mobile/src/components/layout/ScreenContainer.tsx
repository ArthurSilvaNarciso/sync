import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  maxWidth?: number;
}

// Container global: mobile full-width, web centralizado com maxWidth.
export default function ScreenContainer({
  children,
  style,
  noPadding,
  maxWidth = 520,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.safe, style]}>
      <View style={styles.centeringWrap}>
        <View
          style={[
            styles.container,
            { maxWidth: Platform.OS === 'web' ? maxWidth : undefined },
            noPadding && { paddingHorizontal: 0 },
          ]}
        >
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  centeringWrap: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
});
