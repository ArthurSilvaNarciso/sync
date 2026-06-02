import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Error boundary genérico. Evita "tela branca" quando um filho lança erro em
 * render (ex.: mapa Leaflet no web). Mostra um fallback discreto e segue a vida.
 */
type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Se true, não mostra nada quando falha (útil pra envolver só o mapa) */
  silent?: boolean;
};
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn('[ErrorBoundary] capturado:', error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.silent) return null;
      if (this.props.fallback) return <>{this.props.fallback}</>;
      return (
        <View style={styles.fallback}>
          <Text style={styles.text}>Não foi possível exibir esta seção.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
});
