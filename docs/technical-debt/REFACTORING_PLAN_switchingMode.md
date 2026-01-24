# Refactoring Plan: operatingMode → switchingMode

**Status**: 🚀 IN PROGRESS
**Date Started**: 2026-01-03
**Estimated Effort**: 2-3 hours
**Risk Level**: Medium

---

## Executive Summary

This plan outlines the systematic refactoring of `operatingMode` to `switchingMode` across the entire codebase to eliminate naming confusion.

### Goals
1. ✅ Rename all references from `operatingMode` to `switchingMode`
2. ✅ Maintain 100% backward compatibility
3. ✅ Zero breaking changes for existing users
4. ✅ All tests passing
5. ✅ Clean, maintainable code

---

## Pre-Refactoring Checklist

- [x] Backup created
- [x] All tests passing (326/326)
- [x] Build successful
- [x] Branch clean (no uncommitted changes)
- [x] SwitchingMode type defined
- [x] DEFAULT_SWITCHING_MODE constant added
- [x] Migration function skeleton created

---

## Refactoring Strategy

### Approach: **Gradual, Test-Driven Migration**

1. **Bottom-Up**: Start with lowest-level modules (storage, types)
2. **One File at a Time**: Complete each file before moving to next
3. **Test After Each Phase**: Ensure tests pass between changes
4. **Backward Compatibility**: Read both fields, write new field
5. **Keep Old Field**: Maintain `operatingMode` as alias during transition

---

## Phase-by-Phase Execution Plan

### Phase 1: Storage Layer (✅ Partially Done)
**File**: `src/core/storage.ts`
**Complexity**: Medium
**Est. Time**: 15 min

**Tasks**:
- [x] Add `SwitchingMode` import
- [x] Create `getSwitchingMode()` helper
- [x] Update `migrateToSwitchingMode()` function
- [ ] Update `initializeStorage()` to write both fields
- [ ] Update all internal variable names

**Backward Compatibility**:
```typescript
// Read: Check both fields
const mode = getSwitchingMode(data); // Checks switchingMode, then operatingMode

// Write: Set both fields during transition
await chrome.storage.local.set({
  switchingMode: mode,    // New field
  operatingMode: mode,    // Keep for backward compat
});
```

---

### Phase 2: Tab Switcher
**File**: `src/core/tab-switcher.ts`
**Complexity**: Medium
**Est. Time**: 10 min

**Changes**:
- Update storage.get to include 'switchingMode'
- Use `getSwitchingMode()` helper
- Update variable names
- Update log messages

**Before**:
```typescript
const data = await chrome.storage.local.get(['operatingMode', ...]) as StorageData;
const operatingMode = data.operatingMode;
if (operatingMode === 'global') { ... }
```

**After**:
```typescript
const data = await chrome.storage.local.get(['switchingMode', 'operatingMode', ...]) as StorageData;
const switchingMode = getSwitchingMode(data);
if (switchingMode === 'global') { ... }
```

---

### Phase 3: Background Service Worker
**File**: `src/background.ts`
**Complexity**: High (many references)
**Est. Time**: 20 min

**Changes**:
- Update storage listeners
- Update `toggleTabSwitcher()` function
- Update `validateSwitchingMode()` calls
- Update logging
- Update storage.get/set operations

**Critical Areas**:
- Storage change listener (line 220-267)
- `toggleTabSwitcher()` (line 36-72)
- Migration on install/update

---

### Phase 4: Badge Manager
**File**: `src/core/badge-manager.ts`
**Complexity**: Low
**Est. Time**: 5 min

**Changes**:
- Update function parameters
- Update storage reads
- Update variable names

---

### Phase 5: Popup UI
**File**: `src/popup/index.ts`
**Complexity**: High (many references)
**Est. Time**: 20 min

**Changes**:
- Update `handleToggle()` function
- Update `handleModeSwitch()` function
- Update countdown timer logic
- Update storage reads/writes
- Update all variable names

**Critical Section**:
```typescript
// Line 345-370: Mode detection logic
let switchingMode = getSwitchingMode(data);
```

---

### Phase 6: Options Page
**File**: `src/options/options.ts`
**Complexity**: Medium
**Est. Time**: 15 min

**Changes**:
- Update mode display logic
- Update storage reads
- Update variable names
- Update radio button handlers

---

### Phase 7: Test Files
**Files**: All `src/__tests__/*.test.ts`
**Complexity**: High (50+ references)
**Est. Time**: 30 min

**Strategy**:
1. Update mock data structures
2. Update assertions
3. Update variable names
4. One test file at a time

**Test Files to Update**:
- `mode-switcher.test.ts` (most references)
- `badge-manager.test.ts`
- `badge-integration.test.ts`
- `background.test.ts`
- Others as needed

---

## Refactoring Script

### Automated Replacements (with caution)

```bash
# Storage keys
's/'\''operatingMode'\''/'\''switchingMode'\''/g'

# Variable declarations
's/const operatingMode/const switchingMode/g'
's/let operatingMode/let switchingMode/g'

# Property access
's/data\.operatingMode/getSwitchingMode(data)/g'

# Function names
's/validateOperatingMode/validateSwitchingMode/g'
's/migrateToOperatingMode/migrateToSwitchingMode/g'

# Comments
's/operating mode/switching mode/gi'
's/Operating Mode/Switching Mode/g'
```

### Manual Review Required

- Object property shorthand (`{ operatingMode }` → `{ switchingMode }`)
- Function parameters
- Type annotations
- Log messages
- Error messages

---

## Testing Strategy

### After Each Phase:
```bash
npm run build  # Must succeed
npm test       # All tests must pass
```

### Before Final Commit:
```bash
npm run typecheck
npm run build
npm test
npm run test:coverage  # Verify coverage maintained
```

### Manual Testing Checklist:
- [ ] Fresh install → Enable Global mode → Verify switching works
- [ ] Update from old version → Verify migration works
- [ ] Switch Global ↔ Window mode → Verify no issues
- [ ] Multiple windows → Verify Window mode works
- [ ] Disable/enable → Verify state preserved

---

## Rollback Plan

If critical issues discovered:
```bash
git reset --hard HEAD~1  # Revert last commit
npm install              # Restore dependencies
npm run build
npm test
```

Backup location: `/tmp/pre-refactor-backup.tar.gz`

---

## Success Criteria

- [ ] All 326 tests passing
- [ ] Build successful with no TypeScript errors
- [ ] No console warnings in development
- [ ] Backward compatibility verified
- [ ] Migration tested (old → new)
- [ ] Code review passed
- [ ] Documentation updated

---

## Post-Refactoring Tasks

1. Update CHANGELOG.md
2. Update migration guide
3. Add deprecation notice for operatingMode (v2.0)
4. Update developer documentation
5. Consider: Remove operatingMode field in v2.0 (breaking change)

---

## File Structure Considerations

### Current Structure:
```
src/
├── core/          # All core logic mixed
├── popup/         # UI logic
└── options/       # Settings UI
```

### Proposed (Feature-Based):
```
src/
├── modes/              # NEW: Mode management
│   ├── types.ts        # SwitchingMode, WindowMode
│   ├── switcher.ts     # Mode switching logic
│   └── migration.ts    # Migration functions
├── timers/             # NEW: Timer management
│   ├── hybrid.ts       # Global mode timer
│   └── window.ts       # Window mode timer
├── storage/            # NEW: Storage operations
│   ├── types.ts        # StorageData interface
│   └── helpers.ts      # get/set helpers
└── [existing...]
```

**Benefits**:
- Clear separation of concerns
- Easier to test in isolation
- More maintainable
- Industry standard (feature-based structure)

**Decision**: Defer to separate refactoring (too large scope)

---

## Notes

- Keep `operatingMode` field in storage for at least 2 versions
- Add deprecation warning in console for old field usage (v1.3+)
- Plan breaking change removal for v2.0
- Update Chrome Web Store description if needed

---

**Execution Log**: See below for step-by-step progress

