# Claude Development Guidelines for AutoTabSwitcher

This document provides guidelines and context for AI assistants (like Claude) working on this codebase.

## Project Overview

AutoTabSwitcher is a Chrome extension that automatically switches between browser tabs at configurable intervals. It includes both free and premium features with a focus on security, performance, and user experience.

## Security Standards (CRITICAL - ALWAYS ENFORCE)

### 1. XSS Prevention
**Rule**: NEVER use inline event handlers or unsanitized user data in HTML.

**Required practices**:
- ✅ Use event delegation with `addEventListener`
- ✅ Escape ALL user data before inserting into HTML using `escapeHtml()`
- ✅ Use data attributes instead of inline handlers
- ❌ NEVER use `onclick="functionName('${userInput}')"`
- ❌ NEVER insert user data directly into innerHTML without escaping

**Example**:
```javascript
// ❌ WRONG - XSS vulnerability
sessionList.innerHTML = `<button onclick="restore('${session.id}')">Restore</button>`;

// ✅ CORRECT - Safe approach
sessionList.innerHTML = `<button class="restore-btn" data-session-id="${escapeHtml(session.id)}">Restore</button>`;
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('restore-btn')) {
    handleRestore(e.target.dataset.sessionId);
  }
});
```

### 2. ReDoS (Regular Expression Denial of Service) Protection
**Rule**: ALWAYS validate and cache regex patterns, especially user-provided ones.

**Required practices**:
- ✅ Validate regex patterns before compilation using `validateRegexPattern()`
- ✅ Use `safeCompileRegex()` for user-provided patterns
- ✅ Cache compiled regexes using `regexCache`
- ✅ Set maximum pattern length (500 chars)
- ✅ Warn users about dangerous patterns (nested quantifiers)
- ❌ NEVER directly compile user-provided regex without validation

**Example**:
```typescript
// ❌ WRONG - ReDoS vulnerability
const regex = new RegExp(userPattern);

// ✅ CORRECT - Safe approach
import { validateRegexPattern, safeCompileRegex } from '../core/regex-validator.js';

const validation = validateRegexPattern(userPattern);
if (!validation.valid) {
  throw new Error(validation.error);
}
const regex = safeCompileRegex(userPattern, 'i');
```

### 3. Input Validation
**Rule**: VALIDATE all user inputs on BOTH client and server/storage layers.

**Required validations**:
- ✅ Length limits (use constants from `constants.ts`)
- ✅ Type checking (string, number, boolean)
- ✅ Format validation (URLs, domains, emails, etc.)
- ✅ Range validation (min/max values)
- ✅ Sanitization (remove dangerous characters)
- ✅ Duplicate detection where appropriate

**Constants to use**:
- `MAX_SESSION_NAME_LENGTH = 100`
- `MAX_SESSION_DESCRIPTION_LENGTH = 500`
- `MAX_RULE_PATTERN_LENGTH = 500`
- `MIN_REFRESH_INTERVAL = 5000` (5 seconds)
- `MAX_REFRESH_INTERVAL = 3600000` (1 hour)

### 4. Race Condition Prevention
**Rule**: ALWAYS handle async operations defensively with proper error handling.

**Required practices**:
- ✅ Check if resources (tabs/windows) still exist before operating on them
- ✅ Use try-catch blocks for EVERY async operation
- ✅ Implement retry logic for transient failures (use `retryOperation()`)
- ✅ Continue processing remaining items if one fails (don't fail-fast unless critical)
- ✅ Log partial successes with counts
- ✅ Filter out invalid/non-restorable items before processing

**Example**:
```typescript
// ✅ CORRECT - Defensive async handling
for (const tab of tabs) {
  try {
    // Verify resource still exists
    await chrome.windows.get(windowId);

    // Use retry logic for transient failures
    await this.retryOperation(async () => {
      return await chrome.tabs.create({ windowId, url: tab.url });
    });
    successCount++;
  } catch (error) {
    logger.warn('Failed to create tab', { url: tab.url, error });
    // Continue with remaining tabs
  }
}
```

### 5. Error Handling
**Rule**: ALWAYS provide detailed, actionable error messages with context.

**Required practices**:
- ✅ Extract error messages safely: `error instanceof Error ? error.message : 'Unknown error'`
- ✅ Log error type: `errorType: error instanceof Error ? error.constructor.name : typeof error`
- ✅ Include contextual data (IDs, parameters, state)
- ✅ Re-throw errors with enhanced messages
- ✅ Use appropriate log levels (debug, info, warn, error)
- ❌ NEVER swallow errors silently
- ❌ NEVER assume error is always an Error object

**Example**:
```typescript
// ✅ CORRECT - Detailed error handling
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.error('SessionManager', 'Failed to restore session', {
    sessionId,
    mode,
    error: errorMessage,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    tabCount: session.tabs.length
  });

  const enhancedError = new Error(`Failed to restore session ${sessionId}: ${errorMessage}`);
  enhancedError.cause = error;
  throw enhancedError;
}
```

### 6. License Validation (CRITICAL SECURITY ISSUE)
**Rule**: License validation MUST be robust and server-verified.

**Current status**: ⚠️ CRITICAL - License validation accepts any non-empty string
**Required before production**:
- ✅ Implement proper license format validation
- ✅ Add server-side verification
- ✅ Check license expiration
- ✅ Verify license hasn't been revoked
- ✅ Rate-limit validation attempts

**This BLOCKS production release until fixed.**

## Code Quality Standards

### TypeScript/JavaScript Best Practices
- Use TypeScript for all new code in `src/` directory
- Enable strict mode in tsconfig.json
- Use explicit types, avoid `any`
- Use `const` by default, `let` only when reassignment needed
- Use async/await instead of promises.then()
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### Testing Requirements
- Write tests for ALL new features
- Test files should be in `__tests__/` directories
- Aim for >80% code coverage
- Include edge cases and error scenarios
- Mock Chrome APIs appropriately

### Performance Considerations
- Cache expensive computations (especially regex compilation)
- Use debouncing/throttling for frequent operations
- Avoid memory leaks (clean up listeners, intervals, timeouts)
- Use lazy loading where appropriate
- Profile performance for operations on large datasets

### Documentation
- Add JSDoc comments to all exported functions/classes
- Document complex algorithms with inline comments
- Update README.md when adding features
- Keep TODO.md current with pending work

## Chrome Extension Specific

### Content Security Policy (CSP)
- NO inline scripts allowed
- NO `eval()` or `new Function()`
- NO inline event handlers
- All scripts must be in external files

### Permission Usage
- Request minimum necessary permissions
- Explain permission usage in README
- Don't access APIs without checking permissions first

### Storage Best Practices
- Use chrome.storage.local for persistence
- Keep storage size under limits (5MB for sync, 10MB for local)
- Handle storage quota errors gracefully
- Avoid storing sensitive data unencrypted

## Git Workflow

### Commit Messages
Follow this format:
```
<type>: <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `security`, `perf`

### Branch Naming
- Feature branches: `claude/feature-name-<sessionId>`
- Bug fixes: `claude/fix-issue-name-<sessionId>`
- Always include the session ID suffix for tracking

### Before Committing
1. Run linter: `npm run lint`
2. Run tests: `npm test`
3. Build project: `npm run build`
4. Review changes with `git diff`

## Premium Features Development

### Build-time Protection
- Premium code is tree-shaken in free builds via `PREMIUM_FEATURES_AVAILABLE`
- Always check `PREMIUM_FEATURES_AVAILABLE` before accessing premium code
- Use `requirePremiumLicense()` at the start of premium functions

### Premium Managers
- **SessionManager**: Tab session management
- **RefreshManager**: Smart auto-refresh
- **SkipRuleEngine**: Tab rotation rules
- **ConfigManager**: Import/export configuration

All must implement proper error handling and race condition protection.

## When to Ask for Clarification

Ask the user before:
- Making breaking changes to APIs
- Changing build configuration
- Adding new dependencies
- Modifying premium license validation
- Making significant architectural changes
- Removing existing features

## Files to Never Modify Without Explicit Permission

- `manifest.json` - Chrome extension manifest
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.github/workflows/*` - CI/CD pipelines
- `LICENSE` - Project license

## Useful File Locations

- Core utilities: `src/core/`
- Premium features: `src/premium/`
- Options UI: `src/options/`
- Background service: `src/background/`
- Constants: `src/core/constants.ts`
- Types: `src/core/types.ts`
- Tests: `__tests__/`

## Common Patterns in This Codebase

### Logging
```typescript
import { logger } from '../core/logger.js';
logger.info('Component', 'Action completed', { details });
logger.error('Component', 'Action failed', { error, context });
```

### Storage Access
```typescript
import { getSetting, saveSetting } from '../core/storage.js';
const value = await getSetting('key', defaultValue);
await saveSetting('key', newValue);
```

### Premium Feature Access
```typescript
import { requirePremiumLicense, canAccessPremiumFeature, PremiumFeature } from '../core/premium-access.js';

async function premiumFunction() {
  await requirePremiumLicense(); // Throws if no license
  // ... premium functionality
}

if (await canAccessPremiumFeature(PremiumFeature.SESSION_MANAGEMENT)) {
  // Show premium UI
}
```

## Remember

1. **Security is CRITICAL** - Never compromise on security standards
2. **Test thoroughly** - Bugs in a browser extension can affect user data
3. **Handle errors gracefully** - Extensions run in user's browser, errors must not break functionality
4. **Document your changes** - Others need to understand your code
5. **Follow existing patterns** - Consistency is important
6. **Ask when unsure** - Better to clarify than make assumptions

## Quick Reference Checklist

Before submitting code, verify:
- [ ] No XSS vulnerabilities (no inline handlers, all user data escaped)
- [ ] No ReDoS vulnerabilities (regex patterns validated and cached)
- [ ] All inputs validated (length, type, format, range)
- [ ] Race conditions handled (retry logic, null checks, error handling)
- [ ] Errors logged with context (error type, details, state)
- [ ] Tests written and passing
- [ ] Linter passing
- [ ] Build succeeds
- [ ] Comments added for complex code
- [ ] Security standards followed
