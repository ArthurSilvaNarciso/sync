import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TextStyle, StyleProp } from 'react-native';

interface Props {
  value: number;
  format?: (n: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}

/**
 * Anima a contagem de um número de valor anterior até o novo valor.
 * Usa Animated.timing pra interpolar o valor exibido.
 *
 * Útil pra contadores de stats (km, kcal, points, etc) ficarem
 * mais "vivos" e menos abruptos.
 */
export const AnimatedNumber: React.FC<Props> = ({ value, format, style, duration = 500 }) => {
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const listener = anim.addListener(({ value: v }) => {
      setDisplay(v);
    });
    return () => anim.removeListener(listener);
  }, [anim]);

  useEffect(() => {
    if (value === prevValue.current) return;
    Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();
    prevValue.current = value;
  }, [value, duration, anim]);

  const out = format ? format(display) : display.toFixed(0);
  return <Text style={style}>{out}</Text>;
};
