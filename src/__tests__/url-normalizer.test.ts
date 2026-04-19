import { normalizeUrlKey, isUrlEligibleForPerTabDelay, buildDefaultLabelFromUrl } from '../core/url-normalizer';

describe('url-normalizer', () => {
  describe('normalizeUrlKey', () => {
    it('should normalize http URLs to origin + pathname', () => {
      expect(normalizeUrlKey('https://example.com/dashboard?tab=1#section'))
        .toBe('https://example.com/dashboard');
    });

    it('should strip trailing slashes', () => {
      expect(normalizeUrlKey('https://example.com/path/'))
        .toBe('https://example.com/path');
    });

    it('should preserve root path', () => {
      expect(normalizeUrlKey('https://example.com'))
        .toBe('https://example.com/');
      expect(normalizeUrlKey('https://example.com/'))
        .toBe('https://example.com/');
    });

    it('should preserve port numbers', () => {
      expect(normalizeUrlKey('http://localhost:3000/app'))
        .toBe('http://localhost:3000/app');
    });

    it('should allow http scheme', () => {
      expect(normalizeUrlKey('http://example.com/page')).toBe('http://example.com/page');
    });

    it('should allow file scheme', () => {
      const result = normalizeUrlKey('file:///home/user/doc.html');
      expect(result).not.toBeNull();
      expect(result).toContain('/home/user/doc.html');
    });

    it('should allow ftp scheme', () => {
      expect(normalizeUrlKey('ftp://ftp.example.com/pub')).toBe('ftp://ftp.example.com/pub');
    });

    it('should reject chrome:// URLs', () => {
      expect(normalizeUrlKey('chrome://extensions')).toBeNull();
    });

    it('should reject chrome-extension:// URLs', () => {
      expect(normalizeUrlKey('chrome-extension://abc123/popup.html')).toBeNull();
    });

    it('should reject javascript: URLs', () => {
      expect(normalizeUrlKey('javascript:void(0)')).toBeNull();
    });

    it('should reject data: URLs', () => {
      expect(normalizeUrlKey('data:text/html,<h1>Hello</h1>')).toBeNull();
    });

    it('should reject about: URLs', () => {
      expect(normalizeUrlKey('about:blank')).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(normalizeUrlKey(undefined)).toBeNull();
    });

    it('should return null for null', () => {
      expect(normalizeUrlKey(null)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(normalizeUrlKey('')).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(normalizeUrlKey('not a url')).toBeNull();
    });

    it('should strip query parameters', () => {
      expect(normalizeUrlKey('https://grafana.local/d/abc?orgId=1&refresh=30s'))
        .toBe('https://grafana.local/d/abc');
    });

    it('should strip hash fragments', () => {
      expect(normalizeUrlKey('https://example.com/app#/route/123'))
        .toBe('https://example.com/app');
    });
  });

  describe('isUrlEligibleForPerTabDelay', () => {
    it('should return true for http URLs', () => {
      expect(isUrlEligibleForPerTabDelay('https://example.com')).toBe(true);
    });

    it('should return false for chrome:// URLs', () => {
      expect(isUrlEligibleForPerTabDelay('chrome://settings')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isUrlEligibleForPerTabDelay(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isUrlEligibleForPerTabDelay(null)).toBe(false);
    });
  });

  describe('buildDefaultLabelFromUrl', () => {
    it('should build hostname + path label', () => {
      expect(buildDefaultLabelFromUrl('https://grafana.local/d/abc'))
        .toBe('grafana.local/d/abc');
    });

    it('should show only hostname for root path', () => {
      expect(buildDefaultLabelFromUrl('https://example.com/'))
        .toBe('example.com');
    });

    it('should fallback to raw key on invalid URL', () => {
      expect(buildDefaultLabelFromUrl('invalid')).toBe('invalid');
    });
  });
});
