'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from './components/auth-provider';
import { I18nProvider } from './components/i18n';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  );
}
