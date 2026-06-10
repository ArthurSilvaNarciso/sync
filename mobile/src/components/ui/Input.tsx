import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, fontSize, spacing } from '../../theme';

// WEB: remove o outline de foco do navegador (a "borda branca" extra) e o
// fundo branco/amarelo do autofill — eles ignoram o CSS do React Native.
// Injetado uma única vez no <head>.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const STYLE_ID = 'sync-input-web-fix';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      input, textarea, select { outline: none !important; box-shadow: none; }
      input:focus, textarea:focus { outline: none !important; }
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-text-fill-color: #F0F0FF !important;
        caret-color: #F0F0FF !important;
        -webkit-box-shadow: 0 0 0px 1000px #20202E inset !important;
        box-shadow: 0 0 0px 1000px #20202E inset !important;
        transition: background-color 9999s ease-in-out 0s;
      }
    `;
    document.head.appendChild(style);
  }
}

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export default function Input({
  label,
  error,
  isPassword,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.focused,
          error && styles.errorBorder,
        ]}
      >
        <TextInput
          style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : null]}
          placeholderTextColor={colors.secondaryText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: spacing.md,
  },
  focused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  errorBorder: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: fontSize.md,
    color: '#F0F0FF',
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
