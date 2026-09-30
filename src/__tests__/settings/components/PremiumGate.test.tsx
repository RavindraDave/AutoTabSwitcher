import React from 'react';
import { render, screen } from '@testing-library/react';
import { PremiumGate } from '../../../settings/components/common/PremiumGate';

describe('PremiumGate', () => {
  it('always renders its children', () => {
    render(
      <PremiumGate featureTitle="Anything">
        <div>Feature content</div>
      </PremiumGate>
    );
    expect(screen.getByText('Feature content')).toBeInTheDocument();
  });
});
