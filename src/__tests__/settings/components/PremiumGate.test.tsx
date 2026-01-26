/**
 * Tests for PremiumGate component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PremiumGate, withPremiumGate } from '../../../settings/components/common/PremiumGate';
import { PremiumProvider } from '../../../settings/context/PremiumContext';
import { resetMockStorage } from '../setup';

// Wrapper with PremiumProvider
function renderWithPremium(ui: React.ReactElement, isPremium = false) {
  if (isPremium) {
    resetMockStorage({ premiumEnabled: true, licenseKey: 'TEST-KEY' });
  } else {
    resetMockStorage();
  }

  return render(
    <PremiumProvider>
      {ui}
    </PremiumProvider>
  );
}

describe('PremiumGate', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  describe('Premium user', () => {
    it('should render children when user is premium', async () => {
      renderWithPremium(
        <PremiumGate
          featureTitle="Premium Feature"
          featureDescription="This is a premium feature"
        >
          <div data-testid="premium-content">Premium Content</div>
        </PremiumGate>,
        true
      );

      // Wait for premium status to load
      await screen.findByTestId('premium-content');
      expect(screen.getByTestId('premium-content')).toBeInTheDocument();
    });

    it('should not show locked state for premium users', async () => {
      renderWithPremium(
        <PremiumGate
          featureTitle="Premium Feature"
          featureDescription="This is a premium feature"
        >
          <div>Premium Content</div>
        </PremiumGate>,
        true
      );

      await screen.findByText('Premium Content');
      expect(screen.queryByText('Activate Premium')).not.toBeInTheDocument();
    });
  });

  describe('Free user', () => {
    it('should show locked state with title and description', async () => {
      renderWithPremium(
        <PremiumGate
          featureTitle="Session Management"
          featureDescription="Save and restore browser sessions"
        >
          <div>Premium Content</div>
        </PremiumGate>,
        false
      );

      await screen.findByText('Session Management');
      expect(screen.getByText('Save and restore browser sessions')).toBeInTheDocument();
      expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
    });

    it('should show feature list when provided', async () => {
      const features = [
        { text: 'Feature 1' },
        { text: 'Feature 2', icon: 'star' },
      ];

      renderWithPremium(
        <PremiumGate
          featureTitle="Premium Feature"
          featureDescription="Description"
          features={features}
        >
          <div>Premium Content</div>
        </PremiumGate>,
        false
      );

      await screen.findByText('Premium Feature');
      expect(screen.getByText('Feature 1')).toBeInTheDocument();
      expect(screen.getByText('Feature 2')).toBeInTheDocument();
    });

    it('should show default CTA button', async () => {
      renderWithPremium(
        <PremiumGate
          featureTitle="Premium Feature"
          featureDescription="Description"
        >
          <div>Premium Content</div>
        </PremiumGate>,
        false
      );

      await screen.findByText('Premium Feature');
      expect(screen.getByRole('button', { name: 'Activate Premium' })).toBeInTheDocument();
    });

    it('should show custom CTA text', async () => {
      renderWithPremium(
        <PremiumGate
          featureTitle="Premium Feature"
          featureDescription="Description"
          ctaText="Upgrade Now"
        >
          <div>Premium Content</div>
        </PremiumGate>,
        false
      );

      await screen.findByText('Premium Feature');
      expect(screen.getByRole('button', { name: 'Upgrade Now' })).toBeInTheDocument();
    });

    it('should call custom onCtaClick handler', async () => {
      const handleCtaClick = jest.fn();

      renderWithPremium(
        <PremiumGate
          featureTitle="Premium Feature"
          featureDescription="Description"
          onCtaClick={handleCtaClick}
        >
          <div>Premium Content</div>
        </PremiumGate>,
        false
      );

      await screen.findByText('Premium Feature');
      fireEvent.click(screen.getByRole('button', { name: 'Activate Premium' }));

      expect(handleCtaClick).toHaveBeenCalledTimes(1);
    });

    it('should render compact version when compact prop is true', async () => {
      renderWithPremium(
        <PremiumGate
          featureTitle="Premium Feature"
          featureDescription="Description"
          compact
        >
          <div>Premium Content</div>
        </PremiumGate>,
        false
      );

      await screen.findByText('Premium Feature');
      // In compact mode, description should not be visible
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });
  });
});

describe('withPremiumGate HOC', () => {
  function TestComponent({ message }: { message: string }) {
    return <div data-testid="test-component">{message}</div>;
  }

  beforeEach(() => {
    resetMockStorage();
  });

  it('should wrap component with premium gate', async () => {
    const GatedComponent = withPremiumGate(TestComponent, {
      featureTitle: 'Premium Feature',
      featureDescription: 'Description',
    });

    renderWithPremium(<GatedComponent message="Hello" />, false);

    await screen.findByText('Premium Feature');
    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('should render wrapped component for premium users', async () => {
    const GatedComponent = withPremiumGate(TestComponent, {
      featureTitle: 'Premium Feature',
      featureDescription: 'Description',
    });

    renderWithPremium(<GatedComponent message="Hello Premium" />, true);

    await screen.findByTestId('test-component');
    expect(screen.getByText('Hello Premium')).toBeInTheDocument();
  });
});
