import React from 'react';

/**
 * Every feature is free, so nothing is gated. This wrapper simply renders its
 * children; the extra props are accepted so existing call sites keep working.
 */
interface PremiumGateProps {
  children: React.ReactNode;
  [prop: string]: unknown;
}

export function PremiumGate({ children }: PremiumGateProps) {
  return <>{children}</>;
}
