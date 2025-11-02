# Test Suite

This directory contains comprehensive unit tests for the Auto Tab Switcher Chrome extension.

## Test Structure

- `setup.ts` - Jest configuration and Chrome API mocks
- `background.test.ts` - Tests for the background service worker
- `popup.test.ts` - Tests for the popup UI controller

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

The test suite covers:

### Background Service Worker (`background.test.ts`)
- Badge update functionality (ON/OFF states, colors)
- Tab switching logic (sequential, wrap-around, edge cases)
- Alarm management (creation, clearing, timing conversion)
- Storage integration (reading, defaults, error handling)
- Event listeners (alarms, storage changes, lifecycle events)
- Error handling and logging

### Popup UI Controller (`popup.test.ts`)
- Settings loading and display
- Input validation (min/max bounds, NaN, invalid values)
- Settings persistence to storage
- UI interactions (button clicks, checkbox changes, keyboard events)
- Error display and user feedback
- Unit conversion (seconds ↔ milliseconds)
- Edge cases (boundary values, decimals)

### Build Script (`copy-assets.test.js`)
- Directory creation
- File copying operations
- Path construction
- Error handling
- Console output verification

## Mocking Strategy

Tests use comprehensive mocks for Chrome APIs:
- `chrome.storage.local` - Settings persistence
- `chrome.tabs` - Tab management
- `chrome.alarms` - Periodic execution
- `chrome.action` - Badge and icon
- `chrome.runtime` - Extension lifecycle
- `chrome.windows` - Window events

## Best Practices

- Each test is isolated and independent
- Mocks are reset before each test
- Both happy paths and error cases are tested
- Edge cases and boundary conditions are covered
- Console logging is captured and verified