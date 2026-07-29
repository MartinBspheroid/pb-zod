---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## 🐛 Bug Description
A clear and concise description of what the bug is.

## 🔄 Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## ✅ Expected Behavior
A clear and concise description of what you expected to happen.

## ❌ Actual Behavior
A clear and concise description of what actually happened.

## 📱 Environment
- **OS**: [e.g. macOS, Windows, Linux]
- **Node.js version**: [e.g. 22.11.0 — must be ≥ 22.5]
- **npm version**: [e.g. 10.9.0]
- **pb-ts-zod version**: [e.g. 1.0.0]
- **PocketBase version**: [e.g. 0.39.9]
- **Zod version**: [e.g. 4.0.5]
- **Schema source**: [`--db` / `--json` / `--url` / `--env`]

## 📋 Command/Configuration
```bash
# The command you ran
npx pb-ts-zod --db ./pb_data/data.db --out src/pocketbase-zod.ts
```

```env
# Your .env configuration (remove sensitive data)
PB_TYPEGEN_URL=http://localhost:8090
PB_TYPEGEN_EMAIL=admin@example.com
```

## 📄 Generated Output
```typescript
// If relevant, paste the generated schema output
// that shows the issue
```

## 🔍 Error Messages
```
Paste any error messages here
```

## 📎 Additional Context
Add any other context about the problem here, such as:
- Specific PocketBase collection configurations
- Field types that aren't working
- Screenshots of PocketBase admin UI
- Network connectivity issues

## 🎯 Possible Solution
If you have ideas about what might be causing the issue or how to fix it, please share them here.