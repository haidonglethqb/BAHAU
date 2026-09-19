'use client';

import React, { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Shell } from './Shell';

export function AppLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Landing page and login page have their own standalone full-page layouts
  const isPublicStandalonePage = pathname === '/' || pathname === '/login';

  if (isPublicStandalonePage) {
    return <div className="min-h-screen bg-canvas text-ink">{children}</div>;
  }

  return <Shell>{children}</Shell>;
}
