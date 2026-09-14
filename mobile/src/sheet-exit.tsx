import type { ReactNode } from 'react';

/** Native modals dismiss on their own; nothing is drawn while a sheet exits. */
export function ExitLayer(_props: { children: ReactNode }) {
  return null;
}
