# Contributing to Auto Tab Switcher

Thank you for your interest in contributing! This document provides guidelines and best practices for contributing to this project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Load the extension from `dist/` directory in Chrome

## Code Standards

### TypeScript

- Use strict TypeScript mode (already configured)
- All code must pass `tsc` with no errors
- Use meaningful type annotations
- Avoid `any` types
- Use interfaces for structured data

### Code Style

- Use async/await instead of callbacks
- Use const/let (never var)
- Use arrow functions for callbacks
- Add JSDoc comments for public functions
- Use descriptive variable names

### Error Handling

- Always wrap async operations in try/catch
- Log errors with descriptive messages
- Never silently fail
- Provide user feedback for errors in UI

## Manifest V3 Best Practices

### Service Workers

- **Never** use module-level state that needs to persist
- **Always** use chrome.storage.local for state
- **Prefer** chrome.alarms over setTimeout/setInterval
- **Use** event-driven architecture
- **Test** that your code works after service worker termination

### APIs

- Use chrome.tabs for tab operations
- Use chrome.storage for settings
- Use chrome.alarms for periodic tasks
- Use chrome.action for badge/popup

## Testing Checklist

Before submitting a PR, ensure:

- [ ] Code builds without errors: `npm run build`
- [ ] TypeScript strict mode passes
- [ ] Extension loads in Chrome from dist/
- [ ] Service worker doesn't crash
- [ ] Settings persist across browser restart
- [ ] Tab switching works correctly
- [ ] Badge updates properly
- [ ] Error handling works
- [ ] No console errors

## Pull Request Process

1. Create a feature branch from main
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Submit PR with clear description
6. Wait for review

## Project Structure

```
src/              # Source TypeScript files
dist/             # Build output (git-ignored)
scripts/          # Build scripts
```

## Build Process

The build process:
1. Cleans dist/ directory (using `rimraf` for cross-platform compatibility)
2. Compiles TypeScript to JavaScript
3. Copies static assets (HTML, CSS, images, manifest)
4. Generates source maps

**Cross-Platform Compatibility**: All build scripts work on Windows, macOS, and Linux. We use:
- `rimraf` for cross-platform file deletion (instead of `rm -rf`)
- Node.js scripts for file operations (instead of shell commands)

## Common Tasks

### Adding a new feature

1. Update TypeScript source in `src/`
2. Add types/interfaces as needed
3. Test with `npm run build`
4. Update README if adding user-facing features

### Fixing a bug

1. Identify the issue
2. Add error handling if missing
3. Test the fix
4. Document what was fixed

### Updating dependencies

1. Update package.json
2. Run `npm install`
3. Test build process
4. Test extension functionality

## Questions?

Open an issue for questions or clarifications.
