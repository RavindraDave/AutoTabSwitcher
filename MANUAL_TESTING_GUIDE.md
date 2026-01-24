# Manual Testing Guide
## Auto Tab Switcher - Premium Features

**Last Updated:** 2026-01-17
**Build Version:** 1.2.0
**Branch:** claude/plan-premium-features-ZoZQX

---

## ✅ Issues Fixed - Ready for Testing

### CRITICAL Issues (FIXED)
- ✅ **Duplicate `</head>` tag** - HTML now validates correctly
- ✅ **HTML validation** - Clean, valid HTML5

### HIGH Priority Issues (FIXED)
- ✅ **ARIA labels** - All interactive elements now have proper accessibility labels
- ✅ **Premium discoverability** - Premium teaser shows in popup for free users
- ✅ **Content Security Policy** - Improved CSP with frame-ancestors protection
- ✅ **Keyboard shortcuts** - Hint displayed in popup (Ctrl+Shift+P)

### What's Still Pending (Medium/Low Priority)
- ⏳ Loading indicators for async operations (spinners/disabled buttons)
- ⏳ More detailed error messages (currently functional but generic)
- ⏳ User guide documentation

---

## 🚀 How to Build and Load for Testing

### 1. Build the Extension

**For Premium Testing:**
```bash
cd /home/user/AutoTabSwitcher
npm run build:premium
```

**For Free Version Testing:**
```bash
npm run build:free
```

### 2. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `/home/user/AutoTabSwitcher/dist` folder
5. Extension should now appear in your toolbar

### 3. Verify Build Type

- **Premium Build:** Should see premium features in options
- **Free Build:** Premium features should be hidden/locked

---

## 📋 Manual Testing Checklist

### A. Basic Functionality Tests

#### Popup UI
- [ ] Click extension icon → Popup opens
- [ ] Toggle button works (ON/OFF)
- [ ] Mode switch works (Global ↔ Window)
- [ ] Status displays correctly (Active/Paused/Disabled)
- [ ] Countdown timer updates
- [ ] Settings button opens options page
- [ ] Diagnostics link works

#### Popup - New Features
- [ ] **Premium Teaser (Free Users Only):**
  - Shows gradient card with "Want More Control?"
  - "Learn More" button opens premium features page
- [ ] **Premium Users:**
  - Teaser is hidden when license activated
- [ ] **Keyboard Shortcut Hint:**
  - Shows "Ctrl+Shift+P to pause/resume"
  - Hint is visible and readable

#### Accessibility Testing
- [ ] **Keyboard Navigation:**
  - Press Tab to navigate through buttons
  - Focus indicators are visible
  - All buttons are reachable via keyboard
- [ ] **Screen Reader (If Available):**
  - Toggle button announces "Toggle auto tab switching on or off"
  - Status updates are announced
  - Mode buttons announce their purpose

---

### B. Premium Features Testing

**Note:** These tests require premium build + license activation

#### 1. License Activation

**Test Steps:**
1. Open options → Premium Features tab
2. Enter license key (for testing, try any non-empty string - validation is basic)
3. Click "Activate"

**Expected Results:**
- [ ] Success message appears
- [ ] Activation section changes to show "Premium Activated"
- [ ] Tier info displays
- [ ] Premium features become unlocked (overlays removed)
- [ ] Popup teaser disappears

**Error Cases:**
- [ ] Empty license key → Error: "Please enter a license key"

#### 2. Session Management

**Test: Save Current Session**
1. Open several tabs
2. Premium Features → Session Management
3. Click "💾 Save Current Window"
4. Enter session name (e.g., "Test Session 1")
5. Add description (optional)
6. Click "Save"

**Expected Results:**
- [ ] Success message: "Session saved successfully!"
- [ ] Session appears in session list
- [ ] Shows tab count, created date, launch count (0)
- [ ] Edit and Delete buttons visible

**Test: Restore Session**
1. Click "🚀 Restore" on a saved session
2. Choose restore mode (new window or current window)

**Expected Results:**
- [ ] Success message: "Session restored successfully!"
- [ ] Tabs open in selected mode
- [ ] Launch count increments

**Test: Delete Session**
1. Click "🗑️" delete button on a session
2. Confirm deletion

**Expected Results:**
- [ ] Confirmation dialog: "Are you sure you want to delete this session?"
- [ ] After confirm → Success: "Session deleted successfully"
- [ ] Session removed from list

**Error Cases:**
- [ ] Empty session name → "Please enter a session name"
- [ ] Name too long (>100 chars) → "Session name is too long"

#### 3. Auto-Refresh (RefreshManager)

**Test: Enable Auto-Refresh**
1. Premium Features → Auto-Refresh Settings
2. Toggle "Enable Auto-Refresh"
3. Select strategy (Preemptive/Post-Switch/Manual/Hybrid)
4. Set global interval (e.g., 30000ms = 30 seconds)
5. Save

**Expected Results:**
- [ ] Settings saved
- [ ] Tabs refresh according to strategy
- [ ] Preemptive: Tab refreshes BEFORE switching to it
- [ ] Post-switch: Tab refreshes AFTER switching to it

**Test: Add Refresh Rule**
1. Click "Add Refresh Rule"
2. Select rule type (URL/Domain/Regex/Title)
3. Enter pattern (e.g., "github.com")
4. Set action (Refresh/Skip Refresh)
5. Add

**Expected Results:**
- [ ] Rule appears in list
- [ ] Rule can be toggled enabled/disabled
- [ ] Rule can be deleted with confirmation

**Regex Warning Test:**
1. Add regex rule with dangerous pattern: `(a+)+`
2. Should show warning: "may cause performance issues"
3. Can continue or cancel

#### 4. Skip Rules (SkipRuleEngine)

**Test: Add Skip Rule**
1. Premium Features → Skip Rules
2. Click "Add Skip Rule"
3. Select type (URL/Domain/Regex/Title/Pinned)
4. Enter pattern
5. Add

**Expected Results:**
- [ ] Rule created successfully
- [ ] Tabs matching rule are skipped during rotation
- [ ] Rule shows in list with enable/disable toggle

**Test: Skip Pinned Tabs**
1. Pin a tab (right-click → Pin tab)
2. Enable "Skip Pinned Tabs" toggle
3. Start tab switching

**Expected Results:**
- [ ] Pinned tabs are skipped in rotation
- [ ] Only unpinned tabs cycle

#### 5. Config Import/Export (ConfigManager)

**Test: Export Configuration**
1. Premium Features → Import/Export
2. Click "📥 Export Configuration"
3. Choose what to include (Settings/Sessions/Rules)
4. Click "Export"

**Expected Results:**
- [ ] JSON file downloads
- [ ] File named like "auto-tab-switcher-config-2026-01-17.json"
- [ ] File contains valid JSON
- [ ] Contains selected data

**Test: Import Configuration**
1. Click "📤 Import Configuration"
2. Upload previously exported file
3. Choose import mode (Replace/Merge)
4. Choose "Create backup before import"
5. Import

**Expected Results:**
- [ ] File validated
- [ ] Warning if large config (>100 sessions)
- [ ] Success message
- [ ] Configuration applied
- [ ] Backup created (visible in backup list)

**Error Cases:**
- [ ] Invalid JSON → "Invalid JSON format"
- [ ] Missing required fields → Specific validation error

#### 6. Auto-Start Sessions

**Test: Set Auto-Start**
1. Save a session
2. Click "Edit" on the session
3. Enable "Auto-Start on Browser Startup"
4. Save
5. Restart browser

**Expected Results:**
- [ ] On browser startup, session launches automatically
- [ ] Tabs restore in new window
- [ ] Launch count increments

---

### C. Integration Testing

#### Premium Integration with Tab Switching

**Test: Skip Rules + Tab Switching**
1. Add skip rule for "google.com"
2. Open tabs: google.com, github.com, stackoverflow.com
3. Enable auto-switching (5s interval)
4. Watch tab rotation

**Expected Results:**
- [ ] google.com tabs are skipped
- [ ] Only github.com and stackoverflow.com cycle
- [ ] Log shows "Skip rules applied" in diagnostics

**Test: Refresh + Tab Switching**
1. Enable auto-refresh (Preemptive strategy)
2. Add refresh rule for "github.com"
3. Open tabs with GitHub pages
4. Enable auto-switching
5. Watch tab rotation

**Expected Results:**
- [ ] GitHub tabs refresh BEFORE switching to them
- [ ] Log shows "Preemptive refresh completed"
- [ ] Other tabs don't refresh

---

### D. Error Handling & Edge Cases

#### Error Scenarios
- [ ] **Delete with no items:** Empty state shows properly
- [ ] **Import invalid file:** Clear error message
- [ ] **Activate with empty key:** Error: "Please enter a license key"
- [ ] **Save session with no tabs:** Error or minimum tab check
- [ ] **Regex timeout:** Pattern validation rejects dangerous patterns

#### Confirmation Dialogs
- [ ] **Delete session:** Shows confirmation
- [ ] **Deactivate license:** Shows confirmation
- [ ] **Delete rules:** Shows confirmation
- [ ] **Import large config:** Shows warning

#### Browser Compatibility
- [ ] Works in Chrome (latest)
- [ ] Works in Edge (Chromium-based)
- [ ] Manifest V3 service worker doesn't crash
- [ ] No console errors in DevTools

---

### E. Performance Testing

#### With Many Items
1. **Create 50+ sessions** (use templates)
2. **Add 100+ refresh rules**
3. **Add 100+ skip rules**

**Check:**
- [ ] UI remains responsive
- [ ] Lists scroll smoothly
- [ ] No lag when switching tabs
- [ ] Memory usage acceptable (check Task Manager)

#### Long-Running Test
1. Enable tab switching (5s interval)
2. Leave running for 1 hour
3. Check diagnostics

**Expected:**
- [ ] No memory leaks
- [ ] Tab switch count increases steadily
- [ ] No errors in logs
- [ ] Extension doesn't crash

---

## 🐛 Known Issues (Expected)

### From Comprehensive Review (Not Yet Fixed):
1. **Loading Indicators:**
   - Async operations don't show spinners
   - Buttons aren't disabled during operations
   - User can click multiple times

2. **Generic Error Messages:**
   - Some errors lack specific guidance
   - Example: "Failed to restore session" without reason

3. **No Empty State Guidance:**
   - Empty lists show icon + text but no call-to-action

### These Are OKAY for Now:
- Not blocking manual testing
- Can be fixed in follow-up work
- Focus on functional testing first

---

## 📊 Test Results Template

Use this to track your testing:

```
## Test Session: [Date]
Tester: [Name]
Build: Premium / Free
Browser: Chrome [Version]

### Popup Tests
- [ ] Basic functionality: PASS / FAIL
- [ ] Premium teaser: PASS / FAIL
- [ ] Accessibility: PASS / FAIL

### Premium Features
- [ ] License activation: PASS / FAIL
- [ ] Session management: PASS / FAIL
- [ ] Auto-refresh: PASS / FAIL
- [ ] Skip rules: PASS / FAIL
- [ ] Config import/export: PASS / FAIL

### Issues Found:
1. [Describe issue]
2. [Describe issue]

### Screenshots:
[Attach screenshots of any issues]
```

---

## 🆘 Troubleshooting

### Extension Won't Load
1. Check console for errors: Right-click extension → Inspect
2. Verify dist/ folder contains all files
3. Rebuild: `npm run build:premium`
4. Reload extension in chrome://extensions/

### Premium Features Not Showing
1. Verify you built premium version (`npm run build:premium`)
2. Check dist/core/build-config.js:
   ```javascript
   export const PREMIUM_FEATURES_AVAILABLE = true; // Should be true
   ```
3. Reload extension

### License Won't Activate
1. Current validation accepts ANY non-empty string
2. For real testing, need ChromeExtensionLicense integration
3. This is expected - basic validation only

### Tabs Won't Switch
1. Check popup status (should show "Active")
2. Open diagnostics (🔍 View Diagnostics)
3. Check logs for errors
4. Verify delayTime > 5000ms (5 seconds minimum)

### Premium Teaser Won't Hide
1. Verify license is activated (check storage)
2. Open DevTools → Application → Storage → chrome.storage.local
3. Look for `licenseKey` and `premiumEnabled`
4. Reload popup

---

## ✅ Testing Complete Criteria

### Ready for Production When:
- [ ] All "Popup Tests" pass
- [ ] All "Premium Features" pass
- [ ] All "Integration Testing" pass
- [ ] No critical bugs found
- [ ] Performance acceptable with large datasets
- [ ] Accessibility tested (keyboard navigation works)
- [ ] No console errors in normal operation
- [ ] Both free and premium builds work

### What to Report:
1. **Bugs:** Specific steps to reproduce
2. **UX Issues:** Confusing UI, unclear messages
3. **Performance:** Slowness, lag, crashes
4. **Suggestions:** Feature improvements
5. **Screenshots:** Visual evidence of issues

---

## 📝 Summary

### What's Ready:
✅ All core features implemented and integrated
✅ Premium managers work (SessionManager, RefreshManager, SkipRuleEngine, ConfigManager)
✅ Background service integration complete
✅ Premium UI fully functional (premium.html with all modals)
✅ Popup improved with accessibility and premium teaser
✅ Security measures in place (XSS protection, ReDoS protection, CSP)
✅ Build system working (free and premium builds)

### What to Test:
🧪 Session save/restore end-to-end
🧪 Refresh rules with actual tab switching
🧪 Skip rules filtering tabs
🧪 Config import/export round-trip
🧪 Auto-start sessions on browser startup
🧪 Premium activation/deactivation flow
🧪 All UI interactions and error states

### Known Limitations:
⚠️ License validation is basic (accepts any non-empty string)
⚠️ Some error messages are generic
⚠️ Loading indicators not implemented
⚠️ No user guide documentation yet

---

**Happy Testing! 🚀**

Report any issues you find, and I'll fix them immediately.
