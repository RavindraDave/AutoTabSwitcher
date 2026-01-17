# Security Setup Guide

This guide explains how to set up and use the security tools in this project.

## Overview

We use multiple layers of security enforcement:

1. **Claude.md** - Guidelines for AI-assisted development
2. **SECURITY.md** - Public security policy and best practices
3. **Pre-commit hooks** - Automated checks before commits
4. **ESLint** - Static code analysis
5. **TypeScript** - Type safety

## Quick Setup

### 1. Install Pre-commit Framework

```bash
# Install pre-commit (requires Python)
pip install pre-commit

# Install the git hooks
pre-commit install

# Test it works
pre-commit run --all-files
```

### 2. Verify ESLint Configuration

```bash
# Install dependencies if not already done
npm install

# Run linter
npm run lint  # or: npx eslint src/
```

### 3. Run TypeScript Type Checking

```bash
# Check types
npm run typecheck
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## What Each Tool Checks

### Pre-commit Hooks

When you run `git commit`, these checks run automatically:

#### Security Checks

1. **No inline event handlers** (XSS prevention)
   - Searches for `onclick=`, `onerror=`, etc. in HTML/JS files
   - Fails if found

2. **Safe innerHTML usage** (XSS prevention)
   - Checks that `.innerHTML =` is only used with `escapeHtml()` or similar
   - Warns if potentially unsafe usage found

3. **Safe regex construction** (ReDoS prevention)
   - Checks that `new RegExp()` with user input uses `validateRegexPattern()`
   - Warns if unsafe patterns found

4. **Dependency vulnerabilities** (npm audit)
   - Checks for known vulnerabilities in dependencies
   - Fails if high/critical vulnerabilities found

#### Code Quality Checks

5. **TypeScript type checking**
   - Runs `npm run typecheck`
   - Ensures no type errors

6. **Test suite** (on push only)
   - Runs `npm test`
   - Ensures all tests pass

7. **Large files check**
   - Prevents committing files >1MB

8. **Private keys check**
   - Prevents accidentally committing private keys

9. **Syntax checks**
   - Validates JSON and YAML files

10. **Code formatting**
    - Removes trailing whitespace
    - Ensures files end with newline

### ESLint (when configured)

```bash
npm run lint
```

Checks for:
- Code style issues
- Potential bugs
- Security issues (no-eval, etc.)
- Best practices violations

### TypeScript

```bash
npm run typecheck
```

Checks for:
- Type errors
- Null/undefined issues
- Interface compliance
- Generic constraints

## Bypassing Checks (Use Sparingly!)

### Skip pre-commit hooks

```bash
git commit --no-verify
```

⚠️ **Warning**: Only use this for:
- Emergency hotfixes
- Non-code commits (documentation only)
- When hooks are broken and need fixing

**NEVER** bypass hooks to commit code that fails security checks!

### Skip specific hook

```bash
SKIP=check-inline-handlers git commit
```

### Update hooks

```bash
pre-commit autoupdate
```

## Customizing Security Checks

### Add new pre-commit hooks

Edit `.pre-commit-config.yaml`:

```yaml
- repo: local
  hooks:
    - id: my-custom-check
      name: My Custom Security Check
      entry: bash -c 'your-command-here'
      language: system
      pass_filenames: false
```

### Modify ESLint rules

Edit `.eslintrc.js` (if exists) or create it:

```javascript
module.exports = {
  rules: {
    'no-eval': 'error',
    'no-implied-eval': 'error',
    // Add more rules
  }
};
```

### Add TypeScript strict checks

Edit `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## Troubleshooting

### Pre-commit hooks not running

```bash
# Reinstall hooks
pre-commit uninstall
pre-commit install

# Check installation
pre-commit run --all-files
```

### Hooks failing on clean code

```bash
# Update hooks to latest versions
pre-commit autoupdate

# Clean cache
pre-commit clean
```

### False positives in security checks

If a security check incorrectly flags safe code:

1. **Document why it's safe** in code comments
2. **Update the hook** to exclude that specific pattern
3. **Report the false positive** to improve the check

Example comment:
```javascript
// Security: This is safe because user data is escaped by template engine
element.innerHTML = templateEngine.render(userData);
```

### Dependencies with vulnerabilities

```bash
# Check for vulnerabilities
npm audit

# Try to fix automatically
npm audit fix

# If auto-fix doesn't work, update manually
npm update <package-name>

# Check specific package
npm audit <package-name>
```

If a vulnerability cannot be fixed:
1. Check if there's a workaround
2. Consider alternative packages
3. Report to package maintainer
4. Document the risk and mitigation in SECURITY.md

## Best Practices

### For Developers

1. **Run checks before committing**
   ```bash
   npm run typecheck && npm test
   ```

2. **Keep hooks updated**
   ```bash
   pre-commit autoupdate  # Monthly
   ```

3. **Review security warnings carefully**
   - Don't ignore them
   - Understand why they triggered
   - Fix the underlying issue

4. **Test thoroughly**
   - Write tests for security-sensitive code
   - Include edge cases
   - Test with malicious input

### For Code Reviewers

1. **Check security in PRs**
   - Review Claude.md guidelines were followed
   - Look for patterns mentioned in SECURITY.md
   - Verify pre-commit checks passed

2. **Question bypassed hooks**
   - Ask why --no-verify was used
   - Ensure security wasn't compromised

3. **Verify test coverage**
   - Check that new code has tests
   - Ensure security scenarios are tested

## CI/CD Integration

To run these checks in CI/CD (GitHub Actions, etc.):

```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.x'

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          pip install pre-commit
          npm install

      - name: Run pre-commit hooks
        run: pre-commit run --all-files

      - name: Run tests
        run: npm test

      - name: Type check
        run: npm run typecheck

      - name: Security audit
        run: npm audit --audit-level=high
```

## Security Checklist for New Code

Before submitting new code, verify:

- [ ] No inline event handlers (`onclick`, `onerror`, etc.)
- [ ] All user data escaped before inserting into HTML
- [ ] Regex patterns validated with `validateRegexPattern()`
- [ ] All inputs validated (length, type, format)
- [ ] Async operations have error handling
- [ ] Race conditions considered and handled
- [ ] Tests written and passing
- [ ] TypeScript types correct
- [ ] No eslint warnings
- [ ] Pre-commit hooks pass
- [ ] Security documentation updated if needed

## Learning Resources

- [Claude.md](Claude.md) - Project-specific security guidelines
- [SECURITY.md](SECURITY.md) - Public security policy
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)
- [Pre-commit documentation](https://pre-commit.com/)

## Questions?

If you have questions about security:
- Check [Claude.md](Claude.md) for AI development guidelines
- Check [SECURITY.md](SECURITY.md) for general policy
- Ask in pull request reviews
- Contact the security team

## Summary

Security is enforced through:
1. ✅ Documentation (Claude.md, SECURITY.md)
2. ✅ Automated checks (pre-commit hooks)
3. ✅ Static analysis (ESLint, TypeScript)
4. ✅ Testing (Jest)
5. ✅ Code review (PR reviews)

**All layers work together to prevent security issues before they reach production.**
