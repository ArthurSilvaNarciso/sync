import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  name?: string | null;
  weatherTempC?: number | null;
  weatherIcon?: keyof typeof Ionicons.glyphMap | null;
}

function periodOfDay(): { label: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 6) return { label: 'Boa madrugada', emoji: '🌙' };
  if (h < 12) return { label: 'Bom dia', emoji: '🌅' };
  if (h < 18) return { label: 'Boa tarde', emoji: '☀️' };
  return { label: 'Boa noite', emoji: '🌆' };
}

/**
 * Saudação personalizada com nome + clima opcional.
 * Coloque no topo de Home/Discovery/Feed.
 */
export default function Greeting({ name, weatherTempC, weatherIcon }: Props) {
  const p = periodOfDay();
  const firstName = (name || '').split(' ')[0];

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>
          {p.emoji} {p.label}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {firstName ? `Olá, ${firstName}!` : 'Bem-vindo de volta'}
        </Text>
      </View>
      {weatherTempC != null && (
        <View style={styles.weather}>
          {weatherIcon && (
            <Ionicons name={weatherIcon} size={18} color="#FFB07A" />
          )}
          <Text style={styles.weatherTxt}>{Math.round(weatherTempC)}°C</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    color: '#8E8EA0',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  weather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,176,122,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,176,122,0.3)',
  },
  weatherTxt: {
    fontSize: 13,
    color: '#FFB07A',
    fontWeight: '800',
  },
});
