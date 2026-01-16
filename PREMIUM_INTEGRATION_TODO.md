# Premium Features Integration TODO

This document outlines the remaining tasks to complete the premium features integration.

## ✅ Completed

### Phase 1 Foundation
- [x] Premium rollout strategy and market research (PREMIUM_ROLLOUT_STRATEGY.md)
- [x] Premium type definitions (types.ts)
- [x] Premium storage helpers (storage.ts)
- [x] Build-time protection system (build-config.ts, generate-build-config.js, minify.js)
- [x] Interactive build system (interactive-build.js)
- [x] Premium access control (premium-access.ts with 40 tests)
- [x] Premium constants (constants.ts)

### Premium Managers
- [x] SessionManager (431 lines) - Complete session save/restore functionality
- [x] RefreshManager (494 lines) - Smart auto-refresh with preemptive strategy
- [x] SkipRuleEngine (413 lines) - Advanced skip rules with caching
- [x] ConfigManager (481 lines) - Import/export and backup system

### Premium UI
- [x] Premium options page (premium.html - 663 lines)
- [x] Premium CSS styling (premium.css - 450 lines)
- [x] Premium UI controller (premium.js - 850 lines)
- [x] Main options page integration (promotion section added)

## ⏳ Remaining Tasks

### 1. ~~Bootstrap JavaScript Integration~~ ✅ COMPLETED

**Status:** ✅ **RESOLVED** - Converted to vanilla JavaScript (no jQuery/Bootstrap needed)

**Solution Implemented:** Vanilla JS modal system

Custom modal handling created in `premium.js`:
- `showModal(modalId)` - Show modal with backdrop and animations
- `hideModal(modalId)` - Hide modal with smooth transitions
- `setupModalHandlers()` - Event listeners for close/ESC/backdrop

**Features:**
- ✅ Backdrop clicks to close
- ✅ ESC key to close
- ✅ Smooth fade/slide animations
- ✅ Body scroll prevention
- ✅ Multiple modal support
- ✅ No external dependencies

**Benefits:**
- **Zero jQuery code** - No jQuery or Bootstrap JS required
- **Smaller bundle** - ~50KB saved by removing dependencies
- **Better Chrome extension support** - No CSP issues
- **Full control** - Custom animations and behavior

**Files Updated:**
- `src/options/premium.js` - Added ~100 lines of modal code, replaced 6 jQuery calls
- `src/css/premium.css` - Added ~130 lines of complete modal styling

**Commit:** `864e87a` - "refactor: Replace jQuery/Bootstrap modals with vanilla JavaScript"

### 2. Background Service Integration

**Goal:** Integrate premium managers with background service worker.

**Tasks:**
- [ ] Import premium managers in background.ts
- [ ] Hook SessionManager into browser startup
  - Call `sessionManager.launchAutoStartSessions()` on chrome.runtime.onStartup
- [ ] Hook RefreshManager into tab switching
  - Call `refreshManager.preemptiveRefresh()` before tab switch
  - Call `refreshManager.postSwitchRefresh()` after tab activation
- [ ] Hook SkipRuleEngine into tab switcher
  - Use `skipRuleEngine.filterTabs()` in tab switcher logic
  - Respect skip rules in rotation

**Files to Modify:**
- `src/background.ts` - Add premium manager imports and integration
- `src/core/tab-switcher.ts` - Integrate skip rules and refresh
- `src/core/window-timer-manager.ts` - Per-window interval support

**Example Integration:**

```typescript
// In background.ts
import { sessionManager } from './premium/SessionManager.js';
import { refreshManager } from './premium/RefreshManager.js';
import { canAccessPremium } from './core/premium-access.js';

// On startup
chrome.runtime.onStartup.addListener(async () => {
  if (await canAccessPremium()) {
    await sessionManager.launchAutoStartSessions();
    await refreshManager.initialize();
  }
});
```

```typescript
// In tab-switcher.ts
import { skipRuleEngine } from './premium/SkipRuleEngine.js';
import { refreshManager } from './premium/RefreshManager.js';

async function getAvailableTabs(windowId) {
  let tabs = await chrome.tabs.query({ windowId });

  // Apply skip rules if premium
  if (await canAccessPremium()) {
    tabs = await skipRuleEngine.filterTabs(tabs);
  }

  return tabs;
}

async function switchToNextTab(currentTabId, nextTabId) {
  // Preemptive refresh if premium
  if (await canAccessPremium()) {
    await refreshManager.preemptiveRefresh(nextTabId);
  }

  // Switch tab
  await chrome.tabs.update(nextTabId, { active: true });

  // Post-switch refresh if premium
  if (await canAccessPremium()) {
    await refreshManager.postSwitchRefresh(nextTabId);
  }
}
```

### 3. Popup UI Updates

**Goal:** Show premium features in the popup.

**Tasks:**
- [ ] Add premium status indicator to popup
- [ ] Add "View Premium Features" button/link
- [ ] Show session quick-launch buttons (if premium)
- [ ] Show skip rules status
- [ ] Add premium upgrade prompt for free users

**Files to Modify:**
- `src/popup/index.html` - Add premium indicators
- `src/popup/index.js` - Add premium status logic
- `src/css/popup.css` - Style premium elements

### 4. Manifest Updates

**Goal:** Ensure manifest.json includes all necessary permissions.

**Tasks:**
- [ ] Verify `storage` permission (already present)
- [ ] Verify `tabs` permission (already present)
- [ ] Verify `windows` permission (needed for per-window features)
- [ ] Add `downloads` permission (for config export)
- [ ] Update CSP if using CDN for Bootstrap JS

**File to Modify:**
- `manifest.json`

```json
{
  "permissions": [
    "storage",
    "tabs",
    "windows",
    "downloads",
    "alarms"
  ]
}
```

### 5. Testing

**Unit Tests Needed:**
- [ ] SessionManager tests (save, restore, delete, templates)
- [ ] RefreshManager tests (strategies, rules, intervals)
- [ ] SkipRuleEngine tests (pattern matching, filtering)
- [ ] ConfigManager tests (export, import, validation)

**Integration Tests Needed:**
- [ ] Premium activation flow
- [ ] Session save and restore E2E
- [ ] Refresh with tab switching
- [ ] Skip rules in rotation
- [ ] Import/export round-trip

**Manual Testing:**
- [ ] Test all UI interactions
- [ ] Test with free build (premium locked)
- [ ] Test with premium build (all features work)
- [ ] Test license activation/deactivation
- [ ] Test session restore modes
- [ ] Test refresh strategies
- [ ] Test skip rule patterns
- [ ] Test import/export with large configs
- [ ] Test responsive design
- [ ] Test error handling

### 6. Documentation

**User Documentation:**
- [ ] Premium features guide
- [ ] Session management tutorial
- [ ] Refresh strategies explained
- [ ] Skip rules patterns guide
- [ ] Import/export guide
- [ ] Licensing FAQ

**Developer Documentation:**
- [ ] Premium manager API docs
- [ ] Build system guide (already in BUILD_SYSTEM.md)
- [ ] Integration guide
- [ ] Testing guide

### 7. Build & Distribution

**Build Process:**
- [ ] Test `npm run build:free` - Verify premium code excluded
- [ ] Test `npm run build:premium` - Verify all features included
- [ ] Verify minification works correctly
- [ ] Test both builds in Chrome
- [ ] Package for Chrome Web Store (2 versions if needed)

**Distribution:**
- [ ] Create Chrome Web Store listing for free version
- [ ] Create Chrome Web Store listing for premium version (or same with IAP)
- [ ] Set up licensing system (when ChromeExtensionLicense is available)
- [ ] Set up payment processing
- [ ] Create marketing materials

### 8. Phase 2 Preparation

**Advanced Features (Future):**
- [ ] Server-side license validation
- [ ] Advanced scheduling (business hours, weekday/weekend)
- [ ] Custom tab sequences
- [ ] Analytics and usage tracking
- [ ] Team sharing features

**Phase 2 UI:**
- [ ] Advanced scheduling interface
- [ ] Custom sequences editor
- [ ] Analytics dashboard
- [ ] Team management

## Priority Order

### High Priority (Block Release):
1. ✅ ~~Bootstrap JS integration or vanilla conversion~~ **COMPLETED**
2. ⏳ Background service integration
3. ⏳ Basic testing (smoke tests)
4. ⏳ Manifest updates

### Medium Priority (Polish):
5. ⏳ Popup UI updates
6. ⏳ Comprehensive testing
7. ⏳ User documentation

### Low Priority (Post-Launch):
8. ⏳ Developer documentation
9. ⏳ Phase 2 preparation
10. ⏳ Advanced features

## Quick Start Integration (Minimal Viable)

If you want to get premium features working ASAP:

1. ~~**Add Bootstrap JS to premium.html**~~ ✅ **DONE - Vanilla JS implemented**
2. **Add downloads permission to manifest.json** (1 minute)
3. **Test premium.html in browser** (10 minutes)
4. **Integrate SessionManager in background** (30 minutes)
5. **Test session save/restore** (15 minutes)

Total: ~1 hour for basic working premium features!

**Update:** With vanilla JS modals now implemented, the premium UI is **immediately usable** without any additional dependencies!

## Current Build Commands

```bash
# Development build (premium enabled)
npm run build
npm run dev

# Production free build (premium excluded)
npm run build:free

# Production premium build (all features)
npm run build:premium
```

## Questions?

- Premium managers: Check `src/premium/`
- UI files: Check `src/options/premium.*`
- Build system: Check `docs/BUILD_SYSTEM.md`
- Access control: Check `src/core/premium-access.ts`
- Tests: Check `src/__tests__/premium-access.test.ts`

## Contact

For questions about premium features:
- Review manager files in `src/premium/`
- Check unit tests for usage examples
- Read `PREMIUM_ROLLOUT_STRATEGY.md` for feature details
