# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in AutoTabSwitcher, please report it by emailing [your-email@example.com] or opening a private security advisory on GitHub.

**Please do NOT open public issues for security vulnerabilities.**

We will respond to security reports within 48 hours and will work with you to understand and address the issue promptly.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Standards

AutoTabSwitcher follows strict security standards to protect users:

### 1. XSS (Cross-Site Scripting) Prevention

We prevent XSS attacks through:
- **No inline event handlers**: All event handling uses `addEventListener`
- **HTML escaping**: All user data is escaped before insertion into DOM
- **Content Security Policy**: Strict CSP prevents inline scripts
- **Event delegation**: Dynamic content uses safe event delegation patterns

### 2. ReDoS (Regular Expression Denial of Service) Protection

User-provided regex patterns are protected against ReDoS:
- **Pattern validation**: Dangerous patterns are detected and warned about
- **Compilation caching**: Regex patterns are cached to prevent repeated compilation
- **Length limits**: Maximum pattern length of 500 characters
- **Timeout protection**: Regex execution is monitored for performance

### 3. Input Validation

All user inputs are validated:
- **Length limits**: Session names (100 chars), descriptions (500 chars), patterns (500 chars)
- **Type checking**: Strict type validation on all inputs
- **Format validation**: URLs, domains, and other formats validated
- **Range validation**: Numeric inputs checked against min/max values
- **Sanitization**: Dangerous characters removed or escaped

### 4. Race Condition Protection

Chrome API operations are protected against race conditions:
- **Retry logic**: Transient failures handled with exponential backoff
- **Null checks**: Resources verified to exist before operations
- **Partial failure handling**: Operations continue even if individual items fail
- **Error isolation**: Errors in one operation don't crash the entire process

### 5. Data Privacy

- **Local storage only**: All data stored locally using Chrome Storage API
- **No telemetry**: Extension does not send any data to external servers
- **No tracking**: No analytics or user tracking
- **Minimal permissions**: Only necessary Chrome permissions requested

### 6. Secure Build Process

- **Build-time protection**: Premium features removed from free builds via tree-shaking
- **No eval**: No use of `eval()` or `new Function()`
- **Dependency scanning**: Regular dependency audits for vulnerabilities
- **CSP compliance**: All code complies with strict Content Security Policy

## Security Features in Development

### Premium License Validation (In Progress)

⚠️ **Known Issue**: Current license validation accepts any non-empty string.

**Planned improvements**:
- Server-side license verification
- License format validation
- Expiration checking
- Revocation checking
- Rate limiting on validation attempts

**Status**: This must be completed before production release of premium features.

## Security Testing

We perform:
- **Static analysis**: ESLint with security rules
- **Dependency audits**: Regular `npm audit` checks
- **Manual code review**: All code reviewed for security issues
- **Testing**: Unit and integration tests include security scenarios

## Best Practices for Contributors

When contributing to AutoTabSwitcher, please follow these security practices:

### Required Practices

1. **Never use inline event handlers**
   ```javascript
   // ❌ BAD
   element.innerHTML = `<button onclick="doSomething('${userInput}')">Click</button>`;

   // ✅ GOOD
   element.innerHTML = `<button class="action-btn" data-id="${escapeHtml(userInput)}">Click</button>`;
   element.addEventListener('click', handleClick);
   ```

2. **Always escape user data**
   ```javascript
   // ❌ BAD
   element.innerHTML = `<div>${userData}</div>`;

   // ✅ GOOD
   element.innerHTML = `<div>${escapeHtml(userData)}</div>`;
   ```

3. **Validate regex patterns**
   ```javascript
   // ❌ BAD
   const regex = new RegExp(userPattern);

   // ✅ GOOD
   import { validateRegexPattern, safeCompileRegex } from './core/regex-validator.js';
   const validation = validateRegexPattern(userPattern);
   if (!validation.valid) throw new Error(validation.error);
   const regex = safeCompileRegex(userPattern);
   ```

4. **Handle async errors**
   ```javascript
   // ❌ BAD
   await chrome.tabs.create({ url });

   // ✅ GOOD
   try {
     await chrome.tabs.create({ url });
   } catch (error) {
     logger.error('Failed to create tab', { url, error });
     // Handle error appropriately
   }
   ```

5. **Validate all inputs**
   ```javascript
   // ❌ BAD
   function saveSession(name) {
     // Use name directly
   }

   // ✅ GOOD
   function saveSession(name) {
     if (!name || typeof name !== 'string') {
       throw new Error('Invalid session name');
     }
     if (name.length > MAX_SESSION_NAME_LENGTH) {
       throw new Error('Session name too long');
     }
     // Use validated name
   }
   ```

### Prohibited Practices

- ❌ Using `eval()` or `new Function()`
- ❌ Inline event handlers (onclick, onerror, etc.)
- ❌ Inserting unescaped user data into HTML
- ❌ Direct regex compilation of user input
- ❌ Ignoring async operation errors
- ❌ Storing sensitive data in localStorage or cookies
- ❌ Making external network requests without user consent

## Security Audit History

| Date       | Type          | Findings                     | Status    |
|------------|---------------|------------------------------|-----------|
| 2026-01-17 | Code Review   | XSS in premium.js            | ✅ Fixed  |
| 2026-01-17 | Code Review   | ReDoS in rule matching       | ✅ Fixed  |
| 2026-01-17 | Code Review   | Input validation gaps        | ✅ Fixed  |
| 2026-01-17 | Code Review   | Race conditions in sessions  | ✅ Fixed  |
| 2026-01-17 | Code Review   | Weak license validation      | 🔄 Pending|

## Security Tools

We use the following tools to maintain security:

- **ESLint**: Static code analysis with security rules
- **TypeScript**: Type safety prevents many common errors
- **npm audit**: Dependency vulnerability scanning
- **Chrome DevTools**: Runtime security testing
- **Manual review**: All code manually reviewed for security

## Security Resources

- [Chrome Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## Contact

For security concerns, contact:
- Email: [your-email@example.com]
- GitHub Security Advisories: [Create a security advisory](https://github.com/RavindraDave/AutoTabSwitcher/security/advisories/new)

## Acknowledgments

We appreciate responsible disclosure of security vulnerabilities and will acknowledge researchers who report issues (with permission).
