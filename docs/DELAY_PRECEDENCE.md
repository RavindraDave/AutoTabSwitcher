# Delay Precedence & Feature Interactions

**Last Updated**: 2026-01-30

This document explains how AutoTabSwitcher determines the effective delay time when multiple delay sources are configured, and how premium features interact with each other.

---

## Delay Precedence Rules

AutoTabSwitcher supports three levels of delay customization. When multiple delay sources are configured, they follow a strict precedence hierarchy:

### Precedence Order (Highest to Lowest)

```
1. Group Custom Delay (Premium)
   ↓
2. Window Custom Delay (Premium)
   ↓
3. Global Delay (Free & Premium)
```

### How It Works

**Example Scenario**:
- Global delay: 10 seconds
- Window 1 custom delay: 5 seconds
- Active group "Work Tabs" custom delay: 15 seconds

**Result**: When auto-switching tabs in Window 1 with the "Work Tabs" group active, the extension uses **15 seconds** (group delay wins).

---

## Delay Sources Explained

### 1. Global Delay (Baseline)

**Location**: Settings → General → Delay Time
**Scope**: All windows and groups (unless overridden)
**Default**: 5 seconds (5000 ms)

This is the baseline delay used when no other custom delays are set.

```typescript
// Example: Set global delay to 10 seconds
await chrome.storage.local.set({ delayTime: 10000 });
```

**Use Case**: Simple setup, same delay everywhere.

### 2. Window Custom Delay (Premium)

**Location**: Settings → Premium → Window Intervals
**Scope**: Specific window only
**Availability**: Premium users only

Override the global delay for a specific window. Useful when you want different windows to rotate at different speeds.

**Example**:
- Window 1 (Main Work): 30 seconds
- Window 2 (Monitoring): 5 seconds
- Window 3 (Social Media): 10 seconds

```typescript
// Example: Set Window 1 to 30 seconds
const windowStates = {
  [windowId]: {
    enabled: true,
    customDelayTime: 30000
  }
};
await chrome.storage.local.set({ windowStates });
```

**Use Case**: Different windows have different rotation needs.

**⚠️ Previous Bug (Fixed)**:
- **Issue**: Window custom delay was stored but never used
- **Fix Date**: 2026-01-30
- **Status**: ✅ Now working correctly

### 3. Group Custom Delay (Premium)

**Location**: Settings → Premium → Tab Groups → Edit Group → Custom Delay Time
**Scope**: Active group only
**Availability**: Premium users only
**Priority**: Highest (overrides window and global)

When a tab group is activated, its custom delay overrides both window and global delays.

**Example**:
- Group "Quick News": 3 seconds (fast rotation)
- Group "Work Docs": 60 seconds (slow rotation)
- Group "Monitoring Dashboards": 10 seconds (medium rotation)

```typescript
// Example: Set "Work Docs" group to 60 seconds
const group = {
  id: 'work-docs',
  name: 'Work Docs',
  settings: {
    customDelayTime: 60000,
    enabled: true
  },
  // ... other fields
};
await groupManager.saveGroup(group);
await groupManager.setActiveGroupId('work-docs');
```

**Use Case**: Different groups of tabs need different rotation speeds.

**Dynamic Updates**:
- Changing the active group automatically restarts timers with the new delay
- Modifying a group's custom delay restarts timers if that group is active
- Storage listener watches for `activeGroupId` and `tabGroups` changes

---

## Implementation Details

### Delay Calculator

The `delay-calculator.ts` module implements the precedence logic:

```typescript
import { getEffectiveDelay } from './core/delay-calculator.js';

// Calculate effective delay with precedence
const result = await getEffectiveDelay(
  globalDelay,      // Global delay (baseline)
  windowId,         // Optional: Window ID for window-specific delay
  windowStates      // Optional: Window states map
);

console.log(result.delay);  // Effective delay in ms
console.log(result.source); // 'group', 'window', or 'global'
```

**Precedence Logic**:

1. **Check Group Delay** (if premium + active group):
   ```typescript
   const activeGroupId = await groupManager.getActiveGroupId();
   const activeGroup = await groupManager.getGroup(activeGroupId);
   if (activeGroup?.settings?.customDelayTime) {
     return { delay: activeGroup.settings.customDelayTime, source: 'group' };
   }
   ```

2. **Check Window Delay** (if window ID provided):
   ```typescript
   if (windowStates?.[windowId]?.customDelayTime) {
     return { delay: windowStates[windowId].customDelayTime, source: 'window' };
   }
   ```

3. **Use Global Delay** (fallback):
   ```typescript
   return { delay: globalDelay, source: 'global' };
   ```

### Timer Restart on Group Change

When the active group changes, the extension automatically restarts all timers with the new effective delay:

```typescript
// background.ts storage listener
const relevantChanges =
  'enabled' in changes ||
  'delayTime' in changes ||
  'activeGroupId' in changes ||  // ← Group changes trigger restart
  'tabGroups' in changes;        // ← Group modifications trigger restart
```

---

## Feature Interactions

### Skip Rules vs Tab Groups

**Potential Conflict**: Skip rules remove tabs **before** group filtering applies them.

**Order of Operations** (in `tab-switcher.ts`):

```
1. Query all tabs in window
   ↓
2. Apply Skip Rules (removes matching tabs)
   ↓
3. Apply Group Filtering (filters remaining tabs)
   ↓
4. Determine next tab using rotation pattern
```

**Problem Scenario**:
- **Skip Rule**: "Skip all `github.com` tabs"
- **Active Group**: "Code Repos" with matcher for `github.com`
- **Result**: Zero tabs match! Skip rules removed them first.

**Solution**: Conflict Detection

The extension now detects and warns about conflicts:

```typescript
import { detectActiveGroupConflicts } from './premium/conflict-detector.js';

const conflicts = await detectActiveGroupConflicts();
// Returns array of conflicts with descriptions
```

**UI Warning**:

When conflicts are detected, the Tab Groups UI shows a yellow banner:

```
⚠️ Skip Rule Conflicts Detected

2 conflicts found between skip rules and the active group.
Some tabs may be removed by skip rules before group filtering can include them.

• Skip rule "github.com" conflicts with matcher "github.com/myorg"
• Skip rule "*.google.com" conflicts with matcher "google.com"

[Review Skip Rules] [Dismiss]
```

**Best Practice**:
- **Option 1**: Disable skip rules when using tab groups
- **Option 2**: Make skip rules more specific to avoid conflicts
- **Option 3**: Use group matchers instead of skip rules for filtering

---

## User Scenarios

### Scenario 1: Simple Setup (Free User)

**Configuration**:
- Global delay: 10 seconds

**Behavior**:
- All windows rotate every 10 seconds
- Simple and straightforward

---

### Scenario 2: Per-Window Control (Premium)

**Configuration**:
- Global delay: 10 seconds (fallback)
- Window 1 (Main): 30 seconds
- Window 2 (Monitoring): 5 seconds
- Window 3: Uses global (10 seconds)

**Behavior**:
- Window 1: Rotates every 30 seconds
- Window 2: Rotates every 5 seconds
- Window 3: Rotates every 10 seconds (global)

**Implementation**:
```typescript
// Set window-specific delays
const windowStates = {
  [window1Id]: { enabled: true, customDelayTime: 30000 },
  [window2Id]: { enabled: true, customDelayTime: 5000 },
  [window3Id]: { enabled: true } // Uses global delay
};
```

---

### Scenario 3: Per-Group Control (Premium)

**Configuration**:
- Global delay: 10 seconds
- Active group "News": 3 seconds

**Behavior**:
- Tabs in "News" group rotate every 3 seconds
- Group delay overrides global delay

**User Workflow**:
1. Create "News" group with matchers for news sites
2. Set group custom delay to 3000 ms
3. Activate the "News" group
4. Tabs matching the group rotate every 3 seconds

---

### Scenario 4: Combined (Premium Power User)

**Configuration**:
- Global delay: 10 seconds
- Window 1 custom delay: 15 seconds
- Active group "Urgent" custom delay: 5 seconds

**Behavior**:
- Window 1 with "Urgent" group active: **5 seconds** (group wins)
- Window 1 without active group: 15 seconds (window delay)
- Other windows: 10 seconds (global)

**Precedence Chain**:
```
Group (5s) > Window (15s) > Global (10s)
     ↑
  Winner!
```

---

## Troubleshooting

### Issue: "Window custom delay doesn't work"

**Solution**: Ensure you're running the latest version (2026-01-30+). The feature was broken in earlier versions and has been fixed.

**Verification**:
```javascript
// Check if delay is being used
const logs = await chrome.storage.local.get('diagnosticLog');
// Look for: "delaySource": "window"
```

---

### Issue: "Group delay not applying"

**Checklist**:
1. ✅ Is the group activated? (Check Settings → Tab Groups)
2. ✅ Does the group have `customDelayTime` set?
3. ✅ Is the group enabled?
4. ✅ Are you a premium user?

**Debug**:
```javascript
// Check active group
const { groupManager } = await import('./premium/GroupManager.js');
const activeGroupId = await groupManager.getActiveGroupId();
const activeGroup = await groupManager.getGroup(activeGroupId);
console.log('Active group delay:', activeGroup?.settings?.customDelayTime);
```

---

### Issue: "Tabs not matching group after setting skip rules"

**Cause**: Skip rules vs group conflict (see "Feature Interactions" section above).

**Solution**:
1. Go to Settings → Premium → Tab Groups
2. Look for yellow conflict warning banner
3. Either:
   - Disable conflicting skip rules
   - Make skip rules more specific
   - Adjust group matchers to avoid overlap

---

## API Reference

### Get Effective Delay

```typescript
import { getEffectiveDelay } from './core/delay-calculator.js';

// For global mode
const result = await getEffectiveDelay(globalDelay);
console.log(result.delay);  // Effective delay in ms
console.log(result.source); // 'group' or 'global'

// For window mode
const result = await getEffectiveDelay(globalDelay, windowId, windowStates);
console.log(result.delay);  // Effective delay in ms
console.log(result.source); // 'group', 'window', or 'global'
```

### Detect Conflicts

```typescript
import { detectActiveGroupConflicts, getConflictSummary } from './premium/conflict-detector.js';

// Detect conflicts for active group
const conflicts = await detectActiveGroupConflicts();

// Get summary for display
const summary = getConflictSummary(conflicts);
console.log(summary);
// "2 conflicts detected with 1 skip rule"
```

---

## Changelog

### 2026-01-30

**Features Added**:
- ✅ Group custom delay implementation
- ✅ Delay precedence system (Group > Window > Global)
- ✅ Conflict detection for Skip Rules vs Groups
- ✅ UI warning banner for conflicts

**Bugs Fixed**:
- 🐛 Window custom delay was stored but never used
  - **Root Cause**: `handleWindowModeToggle()` always used global delay
  - **Fix**: Now uses `getEffectiveDelay()` with proper precedence
  - **Impact**: Window Intervals feature now works as intended

**Technical Changes**:
- New module: `core/delay-calculator.ts`
- New module: `premium/conflict-detector.ts`
- Updated: `background.ts` - Uses delay calculator
- Updated: `tab-switcher.ts` - No changes needed (already integrated)
- Updated: `TabGroups.tsx` - Added conflict warning banner
- Updated: Storage listener watches `activeGroupId` and `tabGroups`

---

## Future Enhancements

### Planned Features

1. **Delay Profiles**
   - Save and switch between delay configurations
   - E.g., "Work Mode" (slow), "Browse Mode" (fast)

2. **Time-Based Delay Switching**
   - Different delays during work hours vs after hours
   - Integration with Schedule Manager (Phase 3 deferred feature)

3. **Per-Tab Delays** (Advanced)
   - Set delay for individual tabs
   - Would require fundamental architecture change
   - Not currently planned

4. **Conflict Auto-Resolution**
   - Automatically disable conflicting skip rules when group is activated
   - User confirmation required

---

## Summary

**Delay Precedence**:
```
Group Custom Delay > Window Custom Delay > Global Delay
```

**Key Points**:
- ✅ Group delays override everything (highest priority)
- ✅ Window delays override global only
- ✅ Global delay is the baseline fallback
- ✅ Timers restart automatically when active group changes
- ⚠️ Skip rules can conflict with groups (now detected)

**Best Practices**:
- Start with global delay for simplicity
- Add window delays for per-window control
- Use group delays for context-specific rotation
- Check for conflicts when using both skip rules and groups

---

**Need Help?**
- See: [PREMIUM_IMPLEMENTATION_PLAN.md](./planning/PREMIUM_IMPLEMENTATION_PLAN.md)
- See: [Phase 3 Security Audit](./planning/PHASE3_GROUPMANAGER_SECURITY_AUDIT.md)
- See: [Phase 3 CWS Compliance](./planning/PHASE3_CWS_COMPLIANCE.md)
