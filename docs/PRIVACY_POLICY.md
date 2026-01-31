# Privacy Policy for AutoTabSwitcher

**Effective Date**: 2026-01-31
**Last Updated**: 2026-01-31

## Overview

AutoTabSwitcher ("the Extension", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we handle your data when you use our Chrome extension.

**TL;DR**: We don't collect, store, or transmit any of your personal data. Everything stays on your device.

---

## Data Collection

### What We DON'T Collect

AutoTabSwitcher **does not collect, store, or transmit** any of the following:

- ❌ Browsing history
- ❌ Tab URLs or titles
- ❌ Personal information
- ❌ Usage analytics or statistics
- ❌ IP addresses
- ❌ Device information
- ❌ Crash reports
- ❌ Any data to external servers

**We have ZERO servers**. All extension functionality runs entirely on your local device.

---

## Data Storage

### Local Storage Only

All extension data is stored **locally on your device** using Chrome's built-in storage APIs:

**What We Store Locally**:
1. **Settings** - Your configured preferences (interval, mode, etc.)
2. **Tab Groups** - Group definitions you create (optional)
3. **Schedules** - Time-based automation rules you configure (optional)
4. **Sessions** - Saved tab sets for restoration (optional)
5. **Skip Rules** - URL patterns you define (optional)
6. **License Key** - Your premium license key (if applicable)

**Storage Location**:
- Chrome Local Storage (encrypted at rest by Chrome)
- Chrome Sync Storage (optional, for settings synchronization)

**Data Retention**:
- Data persists until you manually delete it or uninstall the extension
- Uninstalling the extension permanently deletes all local data

---

## Data Sharing

### Third-Party Sharing

We **do not share, sell, or transfer your data** to any third parties.

**No Third-Party Services**:
- No analytics services (Google Analytics, etc.)
- No crash reporting tools
- No advertising networks
- No external APIs
- No cloud storage services

---

## Permissions

### Required Permissions

The extension requests the following Chrome permissions:

| Permission | Purpose | Data Access |
|------------|---------|-------------|
| `tabs` | Switch between tabs | Tab metadata (titles, URLs) - **stays local** |
| `storage` | Save your settings | Settings data - **stays local** |
| `windows` | Window mode functionality | Window list - **stays local** |
| `alarms` | Scheduling features | No data access |
| `downloads` | Config export (optional) | Only when you export settings manually |

### How We Use Permissions

**`tabs` Permission**:
- **Why**: To access tab information and switch between tabs
- **What it accesses**: Tab IDs, URLs, titles, window IDs
- **Where data goes**: Processed locally, never sent anywhere
- **Note**: Chrome displays this as "Read browsing history" but we don't track or store your history

**`storage` Permission**:
- **Why**: To save your settings persistently
- **What it accesses**: Chrome's local and sync storage
- **Where data goes**: Your device only (or Chrome Sync if you enable it)

**`windows` Permission**:
- **Why**: To enable per-window tab switching
- **What it accesses**: List of open windows and their IDs
- **Where data goes**: Processed locally, never sent anywhere

**`alarms` Permission**:
- **Why**: To trigger scheduled actions (MV3 requirement for timers)
- **What it accesses**: No data access, just alarm API
- **Where data goes**: N/A

**`downloads` Permission (Optional)**:
- **Why**: To export your configuration as a JSON file
- **What it accesses**: Only when you explicitly click "Export"
- **Where data goes**: Your local Downloads folder

---

## Chrome Sync

### Optional Synchronization

If you have **Chrome Sync enabled**, some of your extension settings may be synchronized across your devices **using Google's Chrome Sync service**.

**What Can Sync**:
- Basic settings (interval, mode preferences)
- Tab groups and rules (if you enable sync)
- Schedules (if you enable sync)

**What Does NOT Sync**:
- Actual tab URLs or titles (we don't store these)
- Session data (too large for sync)
- Temporary state

**How to Control Sync**:
1. Disable Chrome Sync in Chrome settings
2. Or disable extension sync in extension settings

**Third-Party Involvement**:
- Synced data is handled by Google's Chrome Sync service
- We have no access to or control over Google's sync infrastructure
- See [Google's Privacy Policy](https://policies.google.com/privacy) for Chrome Sync

---

## Data Security

### How We Protect Your Data

**Local Encryption**:
- Chrome encrypts all local storage at rest
- We rely on Chrome's built-in security mechanisms

**No Network Transmission**:
- Extension never sends data over the network
- No external API calls
- No telemetry

**Secure Coding Practices**:
- Input sanitization for all user inputs
- Regular expression validation to prevent ReDoS attacks
- No use of `eval()` or dynamic code execution
- Content Security Policy (CSP) enabled

**Source Code**:
- Available on GitHub for public review
- No obfuscated code
- No minified code in production (readable source maps)

---

## Configuration Export

### Manual Data Export

When you manually export your configuration:

**Export Process**:
1. You click "Export Configuration" in settings
2. Extension creates a JSON file with your settings
3. File is saved to your Downloads folder
4. **No data is sent to any server**

**Sanitization Options**:
- You can choose to sanitize URLs and titles before export
- Sanitized exports contain only domain names, not full URLs
- Use sanitized exports when sharing configs publicly

**Your Responsibility**:
- Exported files may contain your settings and patterns
- Be careful when sharing exported configs
- We recommend using sanitization when sharing

---

## Children's Privacy

AutoTabSwitcher is not directed at children under 13. We do not knowingly collect information from children. If you believe a child has provided data to us, please contact us immediately.

---

## Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted:

1. In this document (with updated "Last Updated" date)
2. In the extension's changelog
3. On our website

**Material Changes**: If we make material changes, we'll notify you through:
- Extension update notification
- Email (if you've provided contact info for support)

**Your Options**: Continued use of the extension after changes means you accept the new policy. If you don't agree, please uninstall the extension.

---

## Your Rights

### Data Access and Control

You have complete control over your data:

**View Your Data**:
- All data is visible in Settings
- Inspect Chrome storage: `chrome://extensions` → AutoTabSwitcher → Inspect views → Console → `chrome.storage.local.get(console.log)`

**Delete Your Data**:
- Uninstall extension (deletes all data)
- Clear extension data in Chrome settings
- Or manually reset in Settings → Diagnostics

**Export Your Data**:
- Settings → Backup & Export → Export Configuration
- Receive JSON file with all your data

**No Account Required**:
- Extension doesn't require account creation
- No login, no email collection

---

## Contact Us

If you have questions about this Privacy Policy or our data practices:

**Email**: privacy@autotabswitcher.com
**GitHub**: [github.com/yourusername/autotabswitcher/issues](https://github.com)
**Web**: https://autotabswitcher.com/privacy

**Response Time**: We aim to respond within 48 hours.

---

## Legal Compliance

### Data Protection Laws

AutoTabSwitcher complies with:
- **GDPR** (General Data Protection Regulation) - EU
- **CCPA** (California Consumer Privacy Act) - California, USA
- **Chrome Web Store Policies** - Google

**Compliance Basis**:
- We don't collect personal data → No data protection obligations
- All processing is local → No cross-border data transfer issues
- User has full control → Respects data subject rights

---

## Transparency

### Open Source Commitment

- **Source Code**: Available on GitHub for public review
- **Build Process**: Documented and reproducible
- **No Hidden Code**: What you see is what runs
- **Community Review**: Security researchers welcome

**Report Security Issues**: security@autotabswitcher.com

---

## Third-Party Links

The extension may interact with web pages you visit, but we don't control those sites' privacy practices. Please review their privacy policies separately.

---

## Cookies and Tracking

**We do not use**:
- Cookies
- Web beacons
- Tracking pixels
- Analytics scripts
- Fingerprinting techniques

---

## Data Breach Notification

In the unlikely event of a data breach:

1. **Assess Impact**: Determine if any user data was compromised
2. **Notify Users**: Inform affected users within 72 hours
3. **Mitigate**: Patch vulnerabilities immediately
4. **Report**: Notify relevant authorities if required by law

**Note**: Since we don't collect or store user data on servers, the risk of data breach is minimal.

---

## International Data Transfers

Not applicable - all data stays on your local device. No international transfers occur.

---

## Consent

By installing and using AutoTabSwitcher, you consent to this Privacy Policy.

You may withdraw consent by:
1. Uninstalling the extension
2. Disabling specific features in settings
3. Clearing extension data

---

## Summary

**In Plain English**:

✅ Your data never leaves your device
✅ We can't see what you're browsing
✅ No analytics, no tracking, no servers
✅ You have full control over your data
✅ Open source and transparent
✅ Compliant with all privacy laws

**We built AutoTabSwitcher with privacy as a core principle, not an afterthought.**

---

**Last Updated**: 2026-01-31
**Version**: 2.0
**Effective**: 2026-01-31

For the latest version of this policy, visit: https://autotabswitcher.com/privacy
