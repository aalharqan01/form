import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { View, type ViewStyle } from 'react-native';

/**
 * Hosts a sheet's exit animation outside the modal. A closing modal keeps its
 * focus trap, which would pull focus away from whatever the user taps or
 * types into next; this layer has no trap and lets pointer events through.
 */
export function ExitLayer({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  const style = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
  } as unknown as ViewStyle;
  return createPortal(
    <View pointerEvents="none" style={style}>
      {children}
    </View>,
    document.body,
  );
}
