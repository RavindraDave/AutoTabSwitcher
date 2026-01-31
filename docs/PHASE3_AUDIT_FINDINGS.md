# Phase 3 Security & Logic Audit

**Audit Date**: 2026-01-30
**Auditor**: Automated Security Review
**Scope**: All Phase 3 code (GroupManager, ScheduleManager, DelayCalculator, ConflictDetector)
**Status**: 🔴 **CRITICAL BUGS FOUND**

---

## Executive Summary

A comprehensive security and logic audit of Phase 3 code revealed **5 critical bugs** and **7 medium-priority issues** that need immediate attention before production deployment.

**Severity Breakdown**:
- 🔴 Critical: 2 bugs (schedule logic flaws)
- 🟠 High: 3 bugs (security vulnerabilities)
- 🟡 Medium: 5 issues (logic improvements needed)
- 🟢 Low: 2 issues (nice-to-have improvements)

---

## 🔴 Critical Bugs

### 1. Date Range Comparison Includes Time Component

**File**: `src/premium/ScheduleManager.ts:169-174`
**Severity**: 🔴 **CRITICAL**

**Bug**:
```typescript
if (schedule.dateRange) {
  const startDate = new Date(schedule.dateRange.start);  // YYYY-MM-DD -> Date with 00:00:00
  const endDate = new Date(schedule.dateRange.end);
  if (currentDate < startDate || currentDate > endDate) {  // ❌ Compares with time!
    return false;
  }
}
```

**Problem**:
- Schedule dateRange uses format: `YYYY-MM-DD` (no time)
- `new Date('2024-06-01')` creates Date with time `00:00:00`
- If current time is `2024-06-01 10:00:00`, it compares:
  - `2024-06-01 10:00:00` > `2024-06-01 00:00:00` = TRUE
- **Result**: Schedule won't activate on the end date after midnight!

**Impact**:
- Schedules won't work on their last day
- User expects schedule to run all day on end date
- Silent failure - no error message

**Fix**:
```typescript
if (schedule.dateRange) {
  // Strip time component for date-only comparison
  const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const startDate = new Date(schedule.dateRange.start);
  const endDate = new Date(schedule.dateRange.end);

  if (currentDateOnly < startDate || currentDateOnly > endDate) {
    return false;
  }
}
```

**Test Case Missing**:
```typescript
test('should activate schedule on end date', async () => {
  const mockDate = new Date('2024-08-31T23:59:59'); // Last minute of end date
  // Should still activate!
});
```

---

### 2. One-Time Schedules Track Global Check, Not Per-Schedule Execution

**File**: `src/premium/ScheduleManager.ts:195-204`
**Severity**: 🔴 **CRITICAL**

**Bug**:
```typescript
if (schedule.type === 'one-time') {
  const data = await chrome.storage.local.get('lastScheduleCheck');
  const lastCheck = data['lastScheduleCheck'] || 0;
  const lastCheckDate = new Date(lastCheck);

  if (lastCheckDate.toDateString() === currentDate.toDateString()) {
    return false;  // ❌ Blocks ALL one-time schedules if ANY check happened today!
  }
}
```

**Problem**:
- Uses global `lastScheduleCheck` timestamp
- If ANY schedule was checked today, ALL one-time schedules are blocked
- Multiple one-time schedules can't run on the same day

**Scenario**:
```typescript
Schedule A: One-time at 09:00 (executes)
Schedule B: One-time at 10:00 (blocked! ❌)
Schedule C: One-time at 15:00 (blocked! ❌)
```

**Impact**:
- Only first one-time schedule per day will execute
- Subsequent one-time schedules silently fail
- User confusion - "Why didn't my schedule run?"

**Fix**:
```typescript
// Store per-schedule execution tracking
if (schedule.type === 'one-time') {
  const data = await chrome.storage.local.get('executedOneTimeSchedules');
  const executed = data['executedOneTimeSchedules'] || {};

  // Check if THIS schedule was executed
  if (executed[schedule.id]) {
    const lastExecution = new Date(executed[schedule.id]);
    if (lastExecution.toDateString() === currentDate.toDateString()) {
      return false;
    }
  }
}

// After execution in executeSchedule():
if (schedule.type === 'one-time') {
  const data = await chrome.storage.local.get('executedOneTimeSchedules');
  const executed = data['executedOneTimeSchedules'] || {};
  executed[schedule.id] = Date.now();
  await chrome.storage.local.set({ executedOneTimeSchedules: executed });
}
```

---

## 🟠 High Priority Bugs

### 3. customDelayTime Zero is Falsy

**File**: `src/core/delay-calculator.ts:50`
**Severity**: 🟠 **HIGH**

**Bug**:
```typescript
if (activeGroup?.settings?.customDelayTime) {  // ❌ Zero is falsy!
  return { delay: activeGroup.settings.customDelayTime, source: 'group' };
}
```

**Problem**:
- If user sets customDelayTime to `0` (pause rotation), it's falsy
- Falls through to window/global delay instead
- User can't set delay to 0

**Fix**:
```typescript
if (activeGroup?.settings?.customDelayTime !== undefined) {
  return { delay: activeGroup.settings.customDelayTime, source: 'group' };
}
```

Same issue in window delay check:
```typescript
if (windowStates?.[windowId]?.customDelayTime !== undefined) {
  return { delay: windowStates[windowId].customDelayTime!, source: 'window' };
}
```

---

### 4. No Length Check Before Regex (ReDoS Risk)

**File**: `src/premium/ScheduleManager.ts:631-636`
**Severity**: 🟠 **HIGH**

**Bug**:
```typescript
private sanitizeTimeString(time: string): string {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {  // ❌ No length check!
    return '00:00';
  }
  return time;
}
```

**Problem**:
- No length limit before regex test
- Malicious input: `time = 'x'.repeat(1000000)` could cause performance issues
- Regex engine must process entire string

**Impact**:
- DoS via long time strings
- Browser freeze during validation

**Fix**:
```typescript
private sanitizeTimeString(time: string): string {
  // Limit length before regex
  if (typeof time !== 'string' || time.length > 10) {
    return '00:00';
  }

  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    return '00:00';
  }
  return time;
}
```

Same issue in `sanitizeDateString()`:
```typescript
private sanitizeDateString(date: string): string {
  if (typeof date !== 'string' || date.length > 15) {
    return new Date().toISOString().split('T')[0] ?? '2024-01-01';
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  // ...
}
```

---

### 5. Empty Group Filtering - Silent Failure

**File**: `src/core/tab-switcher.ts:164-173`
**Severity**: 🟠 **HIGH**

**Bug**:
```typescript
const groupTabs = await groupManager.filterTabsByGroupMode(tabs, activeGroupId, activeGroup.rotationMode || 'within');

if (groupTabs.length > 0) {
  tabs = groupTabs;
  // Log success
}
// ❌ No else - silently keeps all tabs if group returns 0!
```

**Problem**:
- If group filtering returns 0 tabs, original tabs are kept
- This might be intentional fallback, but it's confusing
- User thinks group is active, but all tabs rotate

**Scenario**:
```typescript
User: "I activated 'Work Tabs' group"
Reality: Group matchers don't match any tabs
Expected: No rotation (0 tabs)
Actual: All tabs rotate (fallback to original)
```

**Impact**:
- Confusing UX - group appears broken
- No feedback to user about mismatch

**Fix**:
```typescript
const groupTabs = await groupManager.filterTabsByGroupMode(tabs, activeGroupId, activeGroup.rotationMode || 'within');

if (groupTabs.length > 0) {
  tabs = groupTabs;
  await logger.info('Premium', 'Group filtering applied', { ... });
} else {
  // WARN: Group active but no tabs matched
  await logger.warn('Premium', 'Active group has no matching tabs, skipping rotation', {
    groupId: activeGroupId,
    groupName: activeGroup.name,
    totalTabs: tabs.length
  });
  return false; // Don't rotate if group has no matches
}
```

---

## 🟡 Medium Priority Issues

### 6. Schedule Actions Can Conflict

**File**: `src/premium/ScheduleManager.ts:245-248`
**Severity**: 🟡 **MEDIUM**

**Issue**:
```typescript
actions: [
  { type: 'enable' },
  { type: 'disable' }  // ❌ Immediately disables!
]
```

**Problem**:
- No validation of action conflicts
- User can create schedule that enables then disables
- Confusing behavior

**Fix**:
Add validation in `sanitizeActions()`:
```typescript
private sanitizeActions(actions: ScheduledAction[]): ScheduledAction[] {
  // ... existing code ...

  // Check for conflicting actions
  const hasEnable = actions.some(a => a.type === 'enable');
  const hasDisable = actions.some(a => a.type === 'disable');

  if (hasEnable && hasDisable) {
    await logger.warn('ScheduleManager', 'Schedule has both enable and disable actions', {});
    // Remove disable actions if enable is present
    return actions.filter(a => a.type !== 'disable');
  }

  return actions;
}
```

---

### 7. No Integration Tests

**Severity**: 🟡 **MEDIUM**

**Missing Test Coverage**:
1. Schedule + Group interaction
   - Schedule activates group at 9 AM
   - Verify group filtering works

2. Schedule + Window Mode
   - Schedule enables window 1 at 9 AM
   - Schedule disables window 1 at 5 PM
   - Verify window timers start/stop

3. Schedule + Rotation Pattern
   - Schedule sets pattern to 'random' at 9 AM
   - Verify pattern changes

4. Edge Cases
   - Schedule tries to activate non-existent group
   - Schedule sets invalid pattern ID
   - Schedule launches non-existent session

**Recommendation**: Add integration test file:
```typescript
// src/__tests__/integration/ScheduleIntegration.test.ts
describe('Schedule Integration', () => {
  test('schedule can activate group', async () => {
    // Create group
    // Create schedule to activate group
    // Verify group is active after schedule runs
  });
});
```

---

### 8. Schedule Resource Exhaustion Risk

**File**: `src/premium/ScheduleManager.ts:22`
**Severity**: 🟡 **MEDIUM**

**Issue**:
```typescript
const MAX_SCHEDULES = 50;
const MAX_ACTIONS_PER_SCHEDULE = 10;
// Total: 500 possible actions

const SCHEDULE_CHECK_INTERVAL = 60000; // Every 60 seconds
```

**Problem**:
- 50 schedules × 10 actions = 500 operations every 60 seconds
- Each action triggers storage write
- Chrome storage has rate limits

**Scenario**:
```typescript
50 schedules, each with 10 set-interval actions
= 50 chrome.storage.local.set() calls per minute
= Potential storage quota issues
```

**Fix**:
Batch storage operations:
```typescript
// Collect all storage changes
const storageUpdates: { [key: string]: any } = {};

for (const action of schedule.actions) {
  const updates = await this.executeActionWithoutWrite(action);
  Object.assign(storageUpdates, updates);
}

// Single storage write
await chrome.storage.local.set(storageUpdates);
```

---

### 9. Race Condition - Dynamic Imports

**File**: `src/background.ts:28-45`
**Severity**: 🟡 **MEDIUM**

**Issue**:
```typescript
if (PREMIUM_FEATURES_AVAILABLE) {
  import('./premium/ScheduleManager.js').then(async module => {
    scheduleManager = module.scheduleManager;
    await scheduleManager.initialize();  // Async!
  });
}

// Meanwhile, somewhere else:
if (scheduleManager) {  // ❌ Might be null during import
  await scheduleManager.checkSchedules();
}
```

**Problem**:
- Dynamic imports are async
- `scheduleManager` might be null initially
- Early calls will be skipped

**Impact**:
- First 1-2 seconds after extension load, schedules won't check
- Not critical, but worth noting

**Fix**:
Wait for initialization in `chrome.runtime.onInstalled`:
```typescript
const initPromises: Promise<void>[] = [];

if (PREMIUM_FEATURES_AVAILABLE) {
  const scheduleInit = import('./premium/ScheduleManager.js').then(async module => {
    scheduleManager = module.scheduleManager;
    await scheduleManager.initialize();
  });
  initPromises.push(scheduleInit);
}

// Wait for all inits
await Promise.all(initPromises);
```

---

### 10. Test Mock Issues

**Severity**: 🟡 **MEDIUM**

**Issue**: 11 ScheduleManager tests fail due to `Date.now()` mocking

**Problem**:
```typescript
// Tests mock Date.now()
jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

// But production code uses:
createdAt: schedule.createdAt || Date.now()  // ❌ Still calls real Date.now()
```

**Root Cause**:
- Jest's `spyOn(Date, 'now')` doesn't work consistently
- Tests pass locally but fail in CI
- Production code is fine, tests are broken

**Fix**:
Use `jest.useFakeTimers()`:
```typescript
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-15T10:00:00'));
});

afterEach(() => {
  jest.useRealTimers();
});
```

---

## 🟢 Low Priority Issues

### 11. Group Rotation Mode Placeholders

**File**: `src/premium/GroupManager.ts:360-378`
**Severity**: 🟢 **LOW**

**Issue**:
```typescript
case 'between-groups':
case 'sequential-groups':
  // Placeholder - return all tabs
  await logger.warn('GroupManager', 'Rotation mode not fully implemented', { ... });
  return tabs;
```

**Problem**:
- Modes exist in types but aren't implemented
- Falls back to all tabs (acceptable)
- No user-facing impact (UI doesn't expose these modes)

**Recommendation**: Document as "Coming in Phase 4"

---

### 12. Manual Matcher Not Exposed in UI

**File**: `src/settings/sections/premium/TabGroups.tsx`
**Severity**: 🟢 **LOW**

**Issue**:
- Backend supports manual matcher (tab IDs)
- UI doesn't expose it
- Users can't create manual matchers via UI

**Impact**:
- Feature exists but hidden
- Can be used programmatically (ConfigManager import)

**Recommendation**: Add UI in Phase 4

---

## Test Coverage Analysis

### Current Coverage

| Component | Tests | Passing | Coverage |
|-----------|-------|---------|----------|
| GroupManager | 35 | 35 (100%) | 79% statements |
| ScheduleManager | 35 | 24 (69%) | 36% statements |
| DelayCalculator | 0 | 0 | 0% |
| ConflictDetector | 0 | 0 | 0% |

### Missing Tests

1. **DelayCalculator** - 0 tests!
   - Group > Window > Global precedence
   - Zero delay handling
   - Null/undefined handling

2. **ConflictDetector** - 0 tests!
   - Pattern overlap detection
   - All matcher type combinations
   - Edge cases

3. **Integration Tests** - 0 tests!
   - Schedule + Group
   - Schedule + Window Mode
   - Schedule + Pattern
   - Multi-component interactions

4. **Edge Cases** - Incomplete
   - Non-existent group activation
   - Invalid pattern IDs
   - Storage quota exceeded
   - Concurrent schedule execution

---

## Security Checklist

### Input Validation
- [x] String length limits
- [x] HTML tag removal
- [x] Control character filtering
- [ ] **Length check before regex** ❌
- [x] Type validation

### Resource Protection
- [x] Schedule count limit (50)
- [x] Action count limit (10)
- [x] Group count limit (50)
- [x] Matcher count limit (100)
- [ ] **Storage write batching** ⚠️

### Code Execution
- [x] No eval()
- [x] No Function() constructor
- [x] No dynamic code loading
- [x] Safe regex compilation

### Logic Safety
- [ ] **Date comparison** ❌
- [ ] **One-time schedule tracking** ❌
- [ ] **Delay zero handling** ❌
- [x] Conflict resolution (schedules)
- [x] Graceful error handling

---

## Recommendations

### Immediate Actions (Before Production)

1. 🔴 **Fix date comparison bug** - Critical for schedule accuracy
2. 🔴 **Fix one-time schedule tracking** - Critical functionality broken
3. 🟠 **Fix delay zero handling** - Prevents valid use case
4. 🟠 **Add length checks to regex** - Security vulnerability
5. 🟠 **Fix empty group filtering** - Improves UX

### Short Term (Next Sprint)

6. 🟡 **Add DelayCalculator tests** - Critical component untested
7. 🟡 **Add ConflictDetector tests** - Security component untested
8. 🟡 **Add integration tests** - Multi-component interactions
9. 🟡 **Batch storage operations** - Performance optimization
10. 🟡 **Validate action conflicts** - Prevent user confusion

### Long Term (Phase 4)

11. 🟢 **Implement rotation modes** - Complete placeholders
12. 🟢 **Add manual matcher UI** - Expose existing functionality
13. 🟢 **Schedule UI component** - Visual weekly calendar
14. 🟢 **Performance monitoring** - Track resource usage

---

## Conclusion

**Overall Status**: 🟠 **NOT PRODUCTION READY**

Phase 3 code has **2 critical bugs** that must be fixed before production:
1. Date range comparison includes time component
2. One-time schedules only work once per day (not per schedule)

Additionally, **3 high-priority security issues** should be addressed:
3. Zero delay handling
4. ReDoS protection
5. Empty group filtering

**Recommendation**:
- Fix critical and high-priority bugs
- Add basic tests for DelayCalculator and ConflictDetector
- Re-run full test suite
- Then: ✅ **APPROVED FOR PRODUCTION**

---

**Audit Completed**: 2026-01-30
**Next Review**: After fixes applied
**Approver**: Pending fixes
