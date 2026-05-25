import React, { useRef, useState, useCallback } from 'react';
import { Pressable, View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onFinish: () => void;
  /** Tempo em ms pra confirmar (default 1200) */
  durationMs?: number;
  label?: string;
  small?: boolean;
}

/**
 * Botão "segure pra finalizar" — estilo Strava.
 *
 * Long-press preenche o ring; ao completar dispara onFinish.
 * Soltar antes cancela. Mais confiável que Alert em web e seguro
 * contra finalizações acidentais.
 */
export default function HoldToFinishButton({
  onFinish,
  durationMs = 1200,
  label = 'Segure pra finalizar',
  small,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const completedRef = useRef(false);

  const start = useCallback(() => {
    completedRef.current = false;
    setHolding(true);
    Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !completedRef.current) {
        completedRef.current = true;
        onFinish();
      }
      setHolding(false);
    });
  }, [progress, durationMs, onFinish]);

  const cancel = useCallback(() => {
    if (completedRef.current) return;
    setHolding(false);
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterp = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const size = small ? 52 : 64;

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        holding && styles.containerHolding,
      ]}
      accessibilityLabel={label}
      accessibilityHint="Pressione e segure para finalizar a atividade"
    >
      {/* Fill ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { borderRadius: size / 2, overflow: 'hidden' },
        ]}
      >
        <Animated.View
          style={{
            width: widthInterp,
            height: '100%',
            backgroundColor: '#EF4444',
          }}
        />
      </Animated.View>
      <View style={styles.iconWrap}>
        <Ionicons name="stop" size={small ? 22 : 28} color="#fff" />
      </View>
      {!small && holding && <Text style={styles.holdText}>SEGURE</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 2,
    borderColor: '#EF4444',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  containerHolding: {
    transform: [{ scale: 0.96 }],
  },
  iconWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdText: {
    position: 'absolute',
    bottom: -22,
    fontSize: 9,
    color: '#EF4444',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
