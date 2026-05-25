import { useRef, useCallback } from 'react';

/**
 * Detecta double tap. Útil pra dar kudos no feed (estilo Instagram).
 *
 * Threshold default 280ms entre taps.
 */
export function useDoubleTap(onDoubleTap: () => void, threshold = 280) {
  const lastTap = useRef(0);

  const onTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < threshold) {
      onDoubleTap();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }, [onDoubleTap, threshold]);

  return onTap;
}

/**
 * Detecta long press. Threshold default 500ms.
 * Retorna handlers pra Pressable.
 */
export function useLongPress(onLongPress: () => void, threshold = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPressIn = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onLongPress();
      timerRef.current = null;
    }, threshold);
  }, [onLongPress, threshold]);

  const onPressOut = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { onPressIn, onPressOut };
}
