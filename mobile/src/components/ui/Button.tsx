import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  Animated,
  Easing,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, fontSize, spacing } from '../../theme';

const ACCENT = '#FF6B35';
const ACCENT_DARK = '#FF4500';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  icon,
  iconPosition = 'right',
  size = 'md',
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const animatePress = (toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const heights = { sm: 44, md: 52, lg: 58 };
  const fontSizes = { sm: 14, md: 15, lg: 16 };
  const height = heights[size];
  const textSize = fontSizes[size];

  const Icon = icon ? (
    <Ionicons
      name={icon}
      size={size === 'sm' ? 16 : 18}
      color={
        variant === 'outline'
          ? ACCENT
          : variant === 'ghost'
          ? ACCENT
          : '#fff'
      }
    />
  ) : null;

  const content = (
    <View style={styles.contentRow}>
      {iconPosition === 'left' && Icon}
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? ACCENT : '#fff'}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            { fontSize: textSize },
            variant === 'outline' && { color: ACCENT },
            variant === 'ghost' && { color: ACCENT },
          ]}
        >
          {title}
        </Text>
      )}
      {iconPosition === 'right' && Icon}
    </View>
  );

  if (variant === 'primary') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={() => animatePress(0.97)}
          onPressOut={() => animatePress(1)}
          disabled={isDisabled}
          style={[
            styles.shadow,
            isDisabled && styles.disabled,
          ]}
        >
          <LinearGradient
            colors={isDisabled ? ['#3A3A50', '#2A2A3A'] : [ACCENT, ACCENT_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.button, { height }]}
          >
            {content}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animatePress(0.97)}
        onPressOut={() => animatePress(1)}
        disabled={isDisabled}
        style={[
          styles.button,
          { height },
          variant === 'secondary' && styles.secondary,
          variant === 'outline' && styles.outline,
          variant === 'ghost' && styles.ghost,
          isDisabled && styles.disabled,
        ]}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shadow: {
    borderRadius: 14,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
