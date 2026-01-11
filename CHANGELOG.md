# Changelog

All notable changes to the Auto Tab Switcher extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Manual Pause State Display in Popup**: The popup now properly displays when auto-switching is paused via keyboard shortcut (Ctrl+Shift+P or Cmd+Shift+P)
  - Status text distinguishes between "Paused by keyboard shortcut" (manual) and "Paused due to activity" (automatic)
  - Toggle button changes to green "Resume" button when manually paused
  - Countdown timer freezes and shows pause symbol (⏸) when manually paused
  - Manual pause state is automatically cleared when enabling a disabled window/mode for better UX
  - **Manual pause state is preserved when switching between Global and Window modes** - If paused in one mode, remains paused in the other

### Fixed
- **Jest Test Runner Hanging**: Fixed issue where Jest would not exit after tests completed due to uncleaned `setTimeout` and `setInterval` timers
  - Added timer tracking and cleanup in test setup
  - All 367 tests now pass and Jest exits cleanly
- **Error Handling for Window ID**: Added proper error handling for cases where window ID is undefined
  - Popup gracefully handles missing window IDs instead of crashing
  - Logs errors for debugging while providing fallback behavior
- **Manual Pause Resume Error Handling**: Added try-catch blocks around manual pause resume operations
  - Failed resume operations are now logged for debugging
  - UI provides better error recovery
- **Logger Console Output**: Fixed error messages showing as `[object Object]` in console
  - Error details now properly formatted and readable in development console
  - Structured data objects are correctly displayed instead of being stringified as `[object Object]`
- **Manual Pause Preservation During Mode Switch**: Fixed auto-switching incorrectly starting when switching modes while paused
  - Manual pause state is now preserved when switching from Global to Window Mode
  - Manual pause state is now preserved when switching from Window to Global Mode
  - User intent (paused state) is maintained across mode changes
- **Badge Display During Mode Switch**: Fixed badge showing "ON" instead of pause symbol when switching modes while paused
  - Badge now correctly shows ⏸ (pause symbol) when switching between Global and Window modes while manually paused
  - Fixed two instances in background.ts where pause state was hardcoded to false during badge updates
  - Badge state now properly reflects manual pause in all mode switch scenarios

### Improved
- **Code Comments**: Added comprehensive comments explaining manual pause behavior and precedence
  - Documented that manual pause takes priority over activity pause in UI display
  - Explained the difference between manual pause (requires explicit resume) and activity pause (auto-resumes)
  - Clarified mode-specific behavior (Global vs Window Mode)

## [1.2.0] - Previous Release

(Version history to be backfilled from git commits and release notes)

---

## Development Notes

### Manual Pause Feature Implementation (January 2026)

**Problem Solved**: When users paused auto-switching using the keyboard shortcut, the popup UI didn't reflect this state. Users couldn't tell if the extension was paused manually or due to activity, and had no way to resume from the popup.

**Solution Implemented**:
- Integrated `isManuallyPaused()` checks throughout popup UI components
- Added visual distinctions for different pause states
- Implemented Resume button functionality
- Added automatic cleanup of manual pause states during mode switches
- Improved error handling and edge case management

**Files Modified**:
- `src/popup/index.ts`: Core UI logic updates
- `src/css/popup.css`: Resume button styling
- `src/__tests__/setup.ts`: Jest timer cleanup

**Testing**: All existing 367 tests pass. Manual testing verified across Global and Window modes.

**For Future Reference**: This implementation demonstrates how to integrate pause state detection across the popup UI while maintaining backward compatibility with the existing activity-based pause system. The manual pause state takes precedence in UI display but works cooperatively with activity pause detection.
