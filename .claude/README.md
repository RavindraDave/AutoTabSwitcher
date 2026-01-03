# Claude Development Documentation

This directory contains internal documentation, reviews, and development notes used during Claude-assisted development. These files are for developers and maintainers, not end users.

## Directory Structure

```
.claude/
├── docs/
│   ├── reviews/          # Code reviews and audits
│   ├── bug-fixes/        # Bug fix documentation
│   ├── implementation/   # Implementation guides and PRDs
│   └── testing/          # Test documentation and config notes
├── notes/                # Development notes and session logs
└── templates/            # PR and issue templates
```

## Contents

### 📋 Reviews (`docs/reviews/`)
- **CODE_REVIEW.md** - Comprehensive code review (race conditions)
- **CODE_REVIEW_FINDINGS.md** - Latest codebase audit findings
- **SELF_REVIEW_tab-switcher-fix.md** - Tab switcher fix self-review
- **SECURITY_REVIEW.md** - Security audit and assessment

### 🐛 Bug Fixes (`docs/bug-fixes/`)
- **GLOBAL_MODE_FIXES.md** - Global mode bug fix documentation
- **RACE_CONDITION_FIX.md** - Race condition fixes and methodology

### 🏗️ Implementation (`docs/implementation/`)
- **IMPLEMENTATION_SUMMARY.md** - Global vs Window Mode implementation
- **PRD.md** - Product Requirements Document
- **REFACTORING.md** - TypeScript refactoring documentation

### 🧪 Testing (`docs/testing/`)
- **TEST_SUMMARY.md** - Test coverage and strategy
- **TYPESCRIPT_CONFIG.md** - TypeScript configuration notes

### 📝 Notes (`notes/`)
- **claude.md** - Claude session notes and development log

### 📄 Templates (`templates/`)
- **PR_DESCRIPTION.md** - Pull request template

---

## For Developers

These documents are valuable for:
- Understanding architectural decisions
- Learning from past bug fixes and reviews
- Maintaining code quality standards
- Onboarding new developers
- Reference during debugging

## User-Facing Documentation

For user-facing documentation, see:
- **README.md** (root) - Project overview and setup
- **CONTRIBUTING.md** (root) - Contribution guidelines
- **Overview.md** (root) - Chrome Web Store listing

---

*This documentation is maintained by Claude Code and human developers during the development process.*
