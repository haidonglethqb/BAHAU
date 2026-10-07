'use client';

import React, { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Shell } from './Shell';

export function AppLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Landing page, login page, and public document verification have standalone full-page layouts
  const isPublicStandalonePage = pathname === '/' || pathname === '/login' || pathname?.startsWith('/verify');

  if (isPublicStandalonePage) {
    return <div className="min-h-screen bg-canvas text-ink">{children}</div>;
  }

  return <Shell>{children}</Shell>;
}
