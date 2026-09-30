import React from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import { PremiumProvider, usePremium } from '../../settings/context/PremiumContext';

describe('PremiumContext', () => {
  it('reports all features as available inside the provider', () => {
    const { result } = renderHook(() => usePremium(), {
      wrapper: ({ children }) => <PremiumProvider>{children}</PremiumProvider>,
    });
    expect(result.current.isPremium).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('reports all features as available without a provider', () => {
    const { result } = renderHook(() => usePremium());
    expect(result.current.isPremium).toBe(true);
  });

  it('renders children', () => {
    render(
      <PremiumProvider>
        <span>child</span>
      </PremiumProvider>
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});
