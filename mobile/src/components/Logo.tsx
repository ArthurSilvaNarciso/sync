// Logo oficial Sync — símbolo de infinito (∞) em variações de cor.
// Substitui o antigo raio laranja.
//
// Uso:
//   <Logo size={48} color="#4A0E2C" />            (default - roxo escuro)
//   <Logo size={32} color="#fff" />               (versão branca para hero)
//   <Logo size={64} variant="filled" />            (com fundo gradient)
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

interface LogoProps {
  size?: number;
  color?: string;
  variant?: 'plain' | 'filled';
}

// Path do logo: infinito estilizado com loops abertos formando "S+C"
const INFINITY_PATH =
  'M30 50 Q30 30 50 30 Q65 30 70 40 L75 50 Q80 60 90 60 Q105 60 105 75 Q105 90 90 90 Q75 90 65 80 L60 70 Q55 60 45 60 Q30 60 30 75';

// Versão mais elaborada baseada no logo enviado (infinito girado)
const INFINITY_PATH_V2 =
  'M 25 50 C 25 30, 45 25, 60 35 C 70 42, 75 50, 85 50 C 100 50, 110 65, 95 80 C 80 92, 65 80, 55 70 C 47 62, 40 60, 30 65 C 15 70, 15 85, 30 90';

export default function Logo({ size = 48, color = '#4A0E2C', variant = 'plain' }: LogoProps) {
  if (variant === 'filled') {
    return (
      <LinearGradient
        colors={['#4A0E2C', '#2A0518']}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#4A0E2C',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <InfinitySvg size={size * 0.6} color="#fff" />
      </LinearGradient>
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <InfinitySvg size={size} color={color} />
    </View>
  );
}

function InfinitySvg({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Defs>
        <SvgGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="1" stopColor={color} stopOpacity="0.85" />
        </SvgGradient>
      </Defs>
      {/* Loop esquerdo */}
      <Path
        d="M 35 60 C 35 38, 65 38, 65 60 C 65 82, 95 82, 95 60 C 95 38, 65 38, 65 60 C 65 82, 35 82, 35 60 Z"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// Wordmark "SYNC" pra usar ao lado da logo
export function LogoWithText({
  size = 48,
  color = '#4A0E2C',
  textColor = '#fff',
}: {
  size?: number;
  color?: string;
  textColor?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.18 }}>
      <Logo size={size} variant="filled" />
      <View>
        <Svg width={size * 2.6} height={size * 0.7} viewBox="0 0 130 35">
          <Path
            d="M5 22 Q5 26 10 26 L18 26 Q23 26 23 22 Q23 18 18 18 L12 18 Q7 18 7 14 Q7 10 12 10 L20 10 Q25 10 25 14"
            stroke={textColor}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* texto SYNC simplificado como caminho — alternativa: usar Text com fonte custom */}
        </Svg>
      </View>
    </View>
  );
}
