import React from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { usePremium } from '../../context/PremiumContext';
import styles from './PremiumGate.module.css';

interface FeatureItem {
  text: string;
  icon?: string;
}

interface PremiumGateProps {
  /** Content to render when user has premium access */
  children: React.ReactNode;
  /** Title shown in the locked state */
  featureTitle: string;
  /** Description shown in the locked state */
  featureDescription: string;
  /** List of feature benefits to display */
  features?: FeatureItem[];
  /** Custom CTA text (defaults to "Activate Premium") */
  ctaText?: string;
  /** Custom handler for CTA click */
  onCtaClick?: () => void;
  /** Show a compact version of the gate */
  compact?: boolean;
}

/**
 * PremiumGate wraps premium features and shows a locked state for free users.
 * When the user has premium access, children are rendered normally.
 * Otherwise, a promotional locked view is displayed.
 */
export function PremiumGate({
  children,
  featureTitle,
  featureDescription,
  features = [],
  ctaText = 'Activate Premium',
  onCtaClick,
  compact = false,
}: PremiumGateProps) {
  const { isPremium, openPremiumPage } = usePremium();

  if (isPremium) {
    return <>{children}</>;
  }

  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      openPremiumPage();
    }
  };

  if (compact) {
    return (
      <div className={styles.compactGate}>
        <div className={styles.compactContent}>
          <Icon name="lock" size={20} />
          <span className={styles.compactText}>{featureTitle}</span>
          <Button variant="primary" size="sm" onClick={handleCtaClick}>
            {ctaText}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gate}>
      <div className={styles.gateContent}>
        <div className={styles.iconWrapper}>
          <Icon name="lock" size={48} />
        </div>

        <h2 className={styles.title}>{featureTitle}</h2>
        <p className={styles.description}>{featureDescription}</p>

        {features.length > 0 && (
          <ul className={styles.featureList}>
            {features.map((feature, index) => (
              <li key={index} className={styles.featureItem}>
                <Icon name={feature.icon || 'check'} size={16} />
                <span>{feature.text}</span>
              </li>
            ))}
          </ul>
        )}

        <Button variant="primary" onClick={handleCtaClick}>
          {ctaText}
        </Button>

        <p className={styles.hint}>
          Unlock all premium features with a single purchase
        </p>
      </div>
    </div>
  );
}

/**
 * HOC version of PremiumGate for wrapping entire components
 */
export function withPremiumGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  gateProps: Omit<PremiumGateProps, 'children'>
) {
  return function PremiumGatedComponent(props: P) {
    return (
      <PremiumGate {...gateProps}>
        <WrappedComponent {...props} />
      </PremiumGate>
    );
  };
}
