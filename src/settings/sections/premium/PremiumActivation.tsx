import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Icon } from '../../components/common/Icon';
import { usePremium } from '../../context/PremiumContext';
import { useToast } from '../../context/ToastContext';
import styles from './PremiumActivation.module.css';

// Payment/license server configuration
const LICENSE_API_URL = 'https://api.r2dsolutions.com/license';

interface LicenseInfo {
  key: string;
  email?: string;
  activatedAt: number;
  expiresAt?: number;
  type: 'lifetime' | 'subscription';
}

function PremiumActivation() {
  const { isPremium, licenseKey, activateLicense, deactivateLicense, checkPremiumStatus } = usePremium();
  const { showToast } = useToast();

  const [manualKey, setManualKey] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);

  // Load license info
  useEffect(() => {
    const loadLicenseInfo = async () => {
      try {
        const result = await chrome.storage.local.get('licenseInfo');
        if (result.licenseInfo) {
          setLicenseInfo(result.licenseInfo);
        }
      } catch (error) {
        console.error('Failed to load license info:', error);
      }
    };
    loadLicenseInfo();
  }, [isPremium]);

  // Listen for payment completion messages from external sources
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin for security
      if (event.origin !== 'https://extensions.r2dsolutions.com') return;

      if (event.data?.type === 'LICENSE_ACTIVATED') {
        const { licenseKey: key, email, type } = event.data;
        await handleSeamlessActivation(key, email, type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle seamless activation from payment completion
  const handleSeamlessActivation = async (key: string, email?: string, type: 'lifetime' | 'subscription' = 'lifetime') => {
    setIsActivating(true);
    try {
      const success = await activateLicense(key);
      if (success) {
        const info: LicenseInfo = {
          key,
          email,
          activatedAt: Date.now(),
          type,
        };
        await chrome.storage.local.set({ licenseInfo: info });
        setLicenseInfo(info);
        showToast('Premium activated successfully!', 'success');
      }
    } catch (error) {
      console.error('Seamless activation failed:', error);
      showToast('Activation failed. Please try manual activation.', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  // Validate license key format
  const validateKey = (key: string): string | null => {
    if (!key.trim()) return 'License key is required';
    // Basic format validation (adjust pattern based on your key format)
    const keyPattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    if (!keyPattern.test(key.trim())) {
      return 'Invalid key format. Expected: XXXX-XXXX-XXXX-XXXX';
    }
    return null;
  };

  // Handle manual key activation
  const handleManualActivation = async () => {
    const error = validateKey(manualKey);
    if (error) {
      setKeyError(error);
      return;
    }

    setIsActivating(true);
    setKeyError(null);

    try {
      // Optional: Validate key with server
      const isValid = await validateWithServer(manualKey.trim().toUpperCase());

      if (!isValid) {
        setKeyError('Invalid or expired license key');
        showToast('Invalid license key', 'error');
        return;
      }

      const success = await activateLicense(manualKey.trim().toUpperCase());
      if (success) {
        const info: LicenseInfo = {
          key: manualKey.trim().toUpperCase(),
          activatedAt: Date.now(),
          type: 'lifetime',
        };
        await chrome.storage.local.set({ licenseInfo: info });
        setLicenseInfo(info);
        setManualKey('');
        showToast('Premium activated successfully!', 'success');
      } else {
        setKeyError('Failed to activate license');
        showToast('Activation failed', 'error');
      }
    } catch (error) {
      console.error('Manual activation failed:', error);
      setKeyError('Activation failed. Please check your connection.');
      showToast('Activation failed', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  // Validate key with server (optional - can work offline too)
  const validateWithServer = async (key: string): Promise<boolean> => {
    try {
      const response = await fetch(`${LICENSE_API_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, extensionId: chrome.runtime.id }),
      });

      if (!response.ok) {
        // If server is unreachable, allow offline activation
        console.warn('License server unreachable, allowing offline activation');
        return true;
      }

      const data = await response.json();
      return data.valid === true;
    } catch {
      // Network error - allow offline activation
      console.warn('Network error, allowing offline activation');
      return true;
    }
  };

  // Handle deactivation
  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      await deactivateLicense();
      await chrome.storage.local.remove('licenseInfo');
      setLicenseInfo(null);
      showToast('License deactivated', 'success');
      setShowDeactivateModal(false);
    } catch (error) {
      console.error('Deactivation failed:', error);
      showToast('Failed to deactivate license', 'error');
    } finally {
      setIsDeactivating(false);
    }
  };

  // Open purchase page
  const handlePurchase = () => {
    chrome.tabs.create({ url: 'https://extensions.r2dsolutions.com/autotab/premium' });
  };

  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Mask license key for display
  const maskKey = (key: string): string => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '-****-****-' + key.substring(key.length - 4);
  };

  if (isPremium) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Premium Status</h1>
          <p className={styles.description}>
            Your premium license is active
          </p>
        </div>

        <div className={styles.activeBanner}>
          <div className={styles.activeBannerIcon}>
            <Icon name="check" size={32} />
          </div>
          <div className={styles.activeBannerContent}>
            <h2>Premium Active</h2>
            <p>Thank you for supporting Auto Tab Switcher!</p>
          </div>
        </div>

        <Card
          title="License Information"
          icon={<Icon name="info" size={20} />}
        >
          <div className={styles.licenseInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>License Key</span>
              <span className={styles.infoValue}>
                {licenseInfo ? maskKey(licenseInfo.key) : maskKey(licenseKey || '')}
              </span>
            </div>
            {licenseInfo?.email && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{licenseInfo.email}</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>License Type</span>
              <span className={styles.infoValue}>
                {licenseInfo?.type === 'subscription' ? 'Subscription' : 'Lifetime'}
              </span>
            </div>
            {licenseInfo?.activatedAt && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Activated</span>
                <span className={styles.infoValue}>{formatDate(licenseInfo.activatedAt)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card
          title="Manage License"
          icon={<Icon name="settings" size={20} />}
        >
          <div className={styles.manageSection}>
            <p className={styles.manageHint}>
              Deactivating your license will remove premium features from this browser.
              You can reactivate on another device using the same license key.
            </p>
            <Button
              variant="danger"
              onClick={() => setShowDeactivateModal(true)}
            >
              Deactivate License
            </Button>
          </div>
        </Card>

        {/* Deactivate Confirmation Modal */}
        <Modal
          isOpen={showDeactivateModal}
          onClose={() => setShowDeactivateModal(false)}
          title="Deactivate License"
        >
          <div className={styles.modalContent}>
            <p className={styles.modalWarning}>
              Are you sure you want to deactivate your premium license?
              You will lose access to all premium features.
            </p>
            <p className={styles.modalHint}>
              You can reactivate anytime using your license key.
            </p>
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setShowDeactivateModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeactivate}
                isLoading={isDeactivating}
              >
                Deactivate
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Activate Premium</h1>
        <p className={styles.description}>
          Unlock all premium features with a license key
        </p>
      </div>

      {/* Premium benefits banner */}
      <div className={styles.benefitsBanner}>
        <h2 className={styles.benefitsTitle}>
          <Icon name="sparkles" size={24} />
          Premium Features
        </h2>
        <div className={styles.benefitsGrid}>
          <div className={styles.benefitItem}>
            <Icon name="folder" size={20} />
            <span>Session Management</span>
          </div>
          <div className={styles.benefitItem}>
            <Icon name="refresh" size={20} />
            <span>Smart Refresh</span>
          </div>
          <div className={styles.benefitItem}>
            <Icon name="skip" size={20} />
            <span>Skip Rules</span>
          </div>
          <div className={styles.benefitItem}>
            <Icon name="download" size={20} />
            <span>Backup & Sync</span>
          </div>
        </div>
      </div>

      {/* Purchase option */}
      <Card
        title="Get Premium"
        description="Purchase a license to unlock all features"
        icon={<Icon name="sparkles" size={20} />}
      >
        <div className={styles.purchaseSection}>
          <div className={styles.priceTag}>
            <span className={styles.price}>$9.99</span>
            <span className={styles.priceLabel}>One-time payment</span>
          </div>
          <Button variant="primary" onClick={handlePurchase}>
            Purchase Premium
          </Button>
          <p className={styles.purchaseHint}>
            After purchase, your license will be activated automatically.
          </p>
        </div>
      </Card>

      {/* Manual activation */}
      <Card
        title="Already Have a License?"
        description="Enter your license key to activate premium"
        icon={<Icon name="keyboard" size={20} />}
      >
        <div className={styles.activationForm}>
          <Input
            label="License Key"
            value={manualKey}
            onChange={(value) => {
              setManualKey(value.toUpperCase());
              setKeyError(null);
            }}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            error={keyError || undefined}
          />
          <Button
            variant="primary"
            onClick={handleManualActivation}
            isLoading={isActivating}
            disabled={!manualKey.trim()}
          >
            Activate License
          </Button>
        </div>
      </Card>

      {/* Help section */}
      <Card
        title="Need Help?"
        icon={<Icon name="info" size={20} />}
      >
        <div className={styles.helpContent}>
          <div className={styles.helpItem}>
            <strong>Where do I find my license key?</strong>
            <p>Check your email receipt after purchase, or log into your account at extensions.r2dsolutions.com</p>
          </div>
          <div className={styles.helpItem}>
            <strong>Can I use my license on multiple devices?</strong>
            <p>Yes! You can activate your license on up to 3 devices. Deactivate on one device to free up a slot.</p>
          </div>
          <div className={styles.helpItem}>
            <strong>Activation not working?</strong>
            <p>Make sure your license key is entered correctly. Contact support@r2dsolutions.com for help.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default PremiumActivation;
